import Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "../pricing";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT, userInstruction, type RawExtraction } from "../prompt";
import { salvageJson } from "../salvage";
import { ExtractorError, type DocTypeHint, type DocumentInput } from "../types";

export interface ProviderRequest {
  inputs: DocumentInput[];
  hint: DocTypeHint;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface ProviderResponse {
  raw: RawExtraction;
  /** The model ran out of output budget; `raw` holds what was recovered. */
  truncated: boolean;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

let client: Anthropic | null = null;

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient(): Anthropic {
  if (!anthropicConfigured()) {
    throw new ExtractorError(
      "not_configured",
      "The converter is not switched on yet. Please try again later.",
      "ANTHROPIC_API_KEY is not set",
    );
  }
  // Credentials come from the environment. Two minutes covers long tables;
  // one retry keeps a transient 5xx from failing the upload.
  client ??= new Anthropic({ timeout: 120_000, maxRetries: 1 });
  return client;
}

function toBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("base64");
}

export async function extractWithAnthropic(req: ProviderRequest): Promise<ProviderResponse> {
  const anthropic = getClient();

  const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  let pageImages = 0;
  for (const input of req.inputs) {
    if (input.mediaType === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: toBase64(input.data) },
      });
    } else if ((IMAGE_TYPES as readonly string[]).includes(input.mediaType)) {
      pageImages++;
      content.push({
        type: "image",
        source: { type: "base64", media_type: input.mediaType as ImageType, data: toBase64(input.data) },
      });
    } else {
      throw new ExtractorError("unsupported_file", "That file type isn't supported. Upload a PDF, JPG, PNG or WebP.");
    }
  }
  content.push({ type: "text", text: userInstruction(req.hint, pageImages) });

  let message: Anthropic.Beta.Messages.BetaMessage;
  try {
    // Streaming keeps long tables from tripping HTTP timeouts. Thinking is
    // left to the model's default (adaptive); depth is set with `effort`.
    const stream = anthropic.beta.messages.stream(
      {
        model: req.model,
        max_tokens: req.maxOutputTokens,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
        output_config: {
          effort: req.effort,
          format: { type: "json_schema", schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> },
        },
        // If a safety classifier declines a document, let the API retry on
        // its recommended fallback model instead of failing the upload.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: req.signal },
    );
    message = await stream.finalMessage();
  } catch (error) {
    if (error instanceof ExtractorError) throw error;
    if (error instanceof Anthropic.APIUserAbortError) {
      throw new ExtractorError("timeout", "The upload was cancelled.");
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      throw new ExtractorError("timeout", "That took too long to read. Try fewer pages or a clearer scan.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ExtractorError("rate_limited", "We're handling a lot of documents right now. Try again in a minute.");
    }
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new ExtractorError("not_configured", "The converter is not available right now. Please try again later.", error.message);
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new ExtractorError(
        "unreadable_file",
        "We couldn't read that file. Try saving it as a new PDF, or take a fresh, well-lit photo.",
        error.message,
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new ExtractorError("provider_error", "Something went wrong on our side. Please try again.", `${error.status} ${error.message}`);
    }
    throw new ExtractorError("provider_error", "Something went wrong on our side. Please try again.", String(error));
  }

  const usage = message.usage;
  const inputTokens =
    usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  const cost = costUsd(req.model, {
    inputTokens: usage.input_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
  });

  if (message.stop_reason === "refusal") {
    throw new ExtractorError("refused", "This file couldn't be processed. If it is an ordinary business document, try a clearer copy.");
  }

  const text = message.content
    .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  const truncated = message.stop_reason === "max_tokens";

  let raw: RawExtraction | null = null;
  try {
    raw = JSON.parse(text) as RawExtraction;
  } catch {
    raw = salvageJson(text) as RawExtraction | null;
  }
  if (!raw || typeof raw !== "object") {
    throw new ExtractorError(
      "empty_result",
      truncated
        ? "This document is too long to convert in one go. Try splitting it into smaller files."
        : "We couldn't get data out of that file. Try a clearer copy.",
    );
  }

  return {
    raw,
    truncated,
    provider: "anthropic",
    model: message.model || req.model,
    inputTokens,
    outputTokens: usage.output_tokens,
    costUsd: cost,
  };
}
