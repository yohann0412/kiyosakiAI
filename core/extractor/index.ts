/**
 * Shared document extractor.
 *
 *   import { extractDocument } from "@/core/extractor";
 *   const result = await extractDocument({ inputs: [{ data, mediaType }], hint: "invoice" });
 *
 * Server-side only (it calls the model API). Browser code should import the
 * pure modules directly: ./types, ./doctypes, ./tabular, ./normalize.
 */
import { runChecks } from "./checks";
import { DOC_TYPES } from "./doctypes";
import { preparePdf } from "./pdf";
import { postprocess } from "./postprocess";
import { worstCaseCostUsd } from "./pricing";
import { anthropicConfigured, extractWithAnthropic, type ProviderRequest, type ProviderResponse } from "./providers/anthropic";
import { extractWithMock } from "./providers/mock";
import { ExtractorError, type DocumentInput, type ExtractOptions, type ExtractionResult } from "./types";

export * from "./types";
export { DOC_TYPES, DOC_TYPE_IDS, PICKER_TYPES, isDocTypeId, toHint } from "./doctypes";
export { PROMPT_VERSION } from "./prompt";
export { costUsd, worstCaseCostUsd } from "./pricing";

const SUPPORTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

export interface ExtractorConfig {
  provider: string;
  model: string;
  effort: NonNullable<ExtractOptions["effort"]>;
  maxPages: number;
  maxOutputTokens: number;
  /** Upper bound on what a single upload can cost at list prices. */
  costCapUsd: number;
  ready: boolean;
}

/** Resolved settings. Everything can be overridden per call or by env. */
export function extractorConfig(overrides: Partial<ExtractOptions> = {}): ExtractorConfig {
  const env = process.env;
  const provider = overrides.provider ?? env.EXTRACTOR_PROVIDER ?? "anthropic";
  const model = overrides.model ?? env.EXTRACTOR_MODEL ?? "claude-opus-5-5";
  const effort = (overrides.effort ?? env.EXTRACTOR_EFFORT ?? "low") as ExtractorConfig["effort"];
  const maxPages = overrides.maxPages ?? Number(env.EXTRACTOR_MAX_PAGES ?? 10);
  const maxOutputTokens = overrides.maxOutputTokens ?? Number(env.EXTRACTOR_MAX_OUTPUT_TOKENS ?? 16000);
  return {
    provider,
    model,
    effort,
    maxPages,
    maxOutputTokens,
    costCapUsd: provider === "mock" ? 0 : worstCaseCostUsd(model, maxPages, maxOutputTokens),
    ready: provider === "mock" || anthropicConfigured(),
  };
}

export async function extractDocument(options: ExtractOptions): Promise<ExtractionResult> {
  const started = Date.now();
  const config = extractorConfig(options);
  const hint = options.hint ?? "auto";

  if (!options.inputs?.length) {
    throw new ExtractorError("unsupported_file", "No file was received.");
  }
  for (const input of options.inputs) {
    if (!SUPPORTED.includes(input.mediaType)) {
      throw new ExtractorError("unsupported_file", "That file type isn't supported. Upload a PDF, JPG, PNG or WebP.");
    }
    if (!input.data?.byteLength) {
      throw new ExtractorError("unreadable_file", "That file is empty.");
    }
  }

  const pdfs = options.inputs.filter((x) => x.mediaType === "application/pdf");
  if (pdfs.length > 1 || (pdfs.length === 1 && options.inputs.length > 1)) {
    throw new ExtractorError("unsupported_file", "Upload one PDF, or the page photos of one document.");
  }

  const notes: string[] = [];
  let inputs: DocumentInput[] = options.inputs;
  let pages = options.inputs.length;
  let truncated = false;

  if (pdfs.length === 1) {
    const prepared = await preparePdf(pdfs[0].data, config.maxPages);
    inputs = [{ data: prepared.data, mediaType: "application/pdf" }];
    pages = prepared.pages;
    if (prepared.totalPages > prepared.pages) {
      truncated = true;
      notes.push(`This PDF has ${prepared.totalPages} pages; only the first ${prepared.pages} were converted.`);
    }
  } else if (options.inputs.length > config.maxPages) {
    inputs = options.inputs.slice(0, config.maxPages);
    pages = inputs.length;
    truncated = true;
    notes.push(`Only the first ${pages} pages were converted.`);
  }

  const request: ProviderRequest = {
    inputs,
    hint,
    model: config.model,
    effort: config.effort,
    maxOutputTokens: config.maxOutputTokens,
    signal: options.signal,
  };

  let response: ProviderResponse;
  if (config.provider === "mock") response = await extractWithMock(request);
  else if (config.provider === "anthropic") response = await extractWithAnthropic(request);
  else throw new ExtractorError("not_configured", "The converter is not available right now.", `unknown provider ${config.provider}`);

  const processed = postprocess(response.raw, hint, { truncated: response.truncated });
  if (response.truncated) {
    truncated = true;
    notes.push("This document was too long to finish in one pass, so the last rows may be missing. Splitting the file will get all of them.");
  }
  const checks = runChecks(processed.fields, processed.tables);

  return {
    docType: processed.docType,
    docTypeLabel: DOC_TYPES[processed.docType].label,
    fields: processed.fields,
    tables: processed.tables,
    checks,
    notes: [...notes, ...processed.notes],
    pages,
    truncated,
    usage: {
      provider: response.provider,
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      costUsd: response.costUsd,
      ms: Date.now() - started,
    },
  };
}
