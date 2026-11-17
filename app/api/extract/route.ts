import type { NextRequest } from "next/server";
import { tuning } from "@/content/tuning";
import { ExtractorError, extractDocument, extractorConfig, toHint, type DocumentInput, type ExtractionResult } from "@/core/extractor";
import { cleanPage, logEvent, recordSpend } from "@/lib/events";
import { fail, ok } from "@/lib/http";
import { allowance, checkAllowance, recordUse } from "@/lib/limits";
import { readSession, sameOrigin, writeFreeUsed, writeVisitor } from "@/lib/session";
import { sniffMediaType } from "@/lib/sniff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 150;

const STATUS: Record<string, number> = {
  not_configured: 503,
  unsupported_file: 415,
  unreadable_file: 422,
  too_many_pages: 413,
  refused: 422,
  empty_result: 422,
  provider_error: 502,
  rate_limited: 503,
  timeout: 504,
};

/** The part of a result the browser gets. Token counts and cost stay server-side. */
function publicResult(result: ExtractionResult) {
  const { usage, ...rest } = result;
  return { ...rest, ms: usage.ms };
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "forbidden", "This request came from another site.");

  const session = readSession(req);
  const config = extractorConfig();
  if (!config.ready) {
    return fail(503, "not_configured", "The converter isn't switched on yet. Please check back soon.");
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > tuning.maxUploadBytes + 100_000) {
    return fail(413, "too_large", "That file is too large. The limit is about 4 MB per document.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "bad_request", "The upload didn't arrive in one piece. Please try again.");
  }

  const page = cleanPage(form.get("page"));
  const hint = toHint(form.get("docType"));
  const bulk = form.get("bulk") === "1";

  // Bulk conversion is the "needs an email" feature from program.md.
  if (bulk && !session.email) {
    await logEvent("gate", page, session.visitorHash, { reason: "bulk" });
    return fail(403, "email_required", tuning.gate.bulkBody, { gate: "bulk" });
  }

  let denial;
  try {
    denial = await checkAllowance(session);
  } catch (error) {
    console.error("limit check failed", error);
    return fail(503, "unavailable", "The converter is having trouble right now. Please try again in a minute.");
  }
  if (denial) {
    if (denial.reason === "email_required") {
      await logEvent("gate", page, session.visitorHash, { reason: "limit" });
      return fail(403, "email_required", denial.message, { gate: "limit" });
    }
    return fail(429, denial.reason, denial.message);
  }

  const files = form.getAll("file").filter((entry): entry is File => typeof entry !== "string");
  if (!files.length) return fail(400, "no_file", "Choose a PDF or a photo to convert.");
  if (files.length > config.maxPages) {
    return fail(413, "too_many_pages", `A document can have up to ${config.maxPages} page images.`);
  }

  const inputs: DocumentInput[] = [];
  let total = 0;
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer());
    total += data.byteLength;
    if (total > tuning.maxUploadBytes) {
      return fail(413, "too_large", "That file is too large. The limit is about 4 MB per document.");
    }
    const mediaType = sniffMediaType(data);
    if (!mediaType) {
      return fail(415, "unsupported_file", "That file type isn't supported. Upload a PDF, JPG, PNG or WebP.");
    }
    inputs.push({ data, mediaType });
  }

  await logEvent("upload", page, session.visitorHash, { hint, bulk, files: files.length });

  let result: ExtractionResult;
  try {
    result = await extractDocument({ inputs, hint, signal: req.signal });
  } catch (error) {
    const code = error instanceof ExtractorError ? error.code : "provider_error";
    const message =
      error instanceof ExtractorError ? error.userMessage : "Something went wrong on our side. Please try again.";
    if (!(error instanceof ExtractorError)) console.error("extract failed", error);
    else if (code === "provider_error" || code === "not_configured") console.error("extract failed", error.message);
    await logEvent("extract_fail", page, session.visitorHash, { code, hint });
    return fail(STATUS[code] ?? 500, code, message);
  }

  // The uploaded bytes go out of scope here. Nothing was written to disk or to
  // the store: only counters and an event without any document content.
  const rows = result.tables.reduce((n, t) => n + t.rows.length, 0);
  await Promise.all([
    recordUse(session).catch((error) => console.error("recordUse failed", error)),
    recordSpend(result.usage.costUsd),
    logEvent("extract_ok", page, session.visitorHash, {
      hint,
      docType: result.docType,
      pages: result.pages,
      rows,
      ms: result.usage.ms,
      model: result.usage.model,
      costUsd: Number(result.usage.costUsd.toFixed(5)),
      checksFailed: result.checks.filter((c) => !c.ok).length,
      bulk,
    }),
  ]);

  const freeUsed = session.email ? session.freeUsed : session.freeUsed + 1;
  const state = await allowance({ ...session, freeUsed }).catch(() => null);
  const res = ok({ result: publicResult(result), demo: result.usage.provider === "mock", allowance: state });
  if (!session.email) writeFreeUsed(res, freeUsed);
  writeVisitor(res, session);
  return res;
}
