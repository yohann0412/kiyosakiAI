import type { NextRequest } from "next/server";
import { ExtractorError, extractDocument, toHint, type DocumentInput, type ExtractOptions } from "@/core/extractor";
import { adminAllowed } from "@/lib/admin";
import { recordSpend } from "@/lib/events";
import { fail, ok } from "@/lib/http";
import { sniffMediaType } from "@/lib/sniff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

/**
 * Runs the production extractor on a file and returns the full result,
 * including token usage and cost. Token required.
 *
 * This is how `npm run eval -- --remote` and `npm run samples -- --remote`
 * measure the extractor that is actually deployed, with the model key that
 * lives in the host's settings. It is for the golden set and the sample
 * documents only: never send a visitor's upload through it.
 */
export async function POST(req: NextRequest) {
  if (!adminAllowed(req)) return fail(401, "unauthorized", "no");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "bad_request", "expected multipart form data");
  }
  const inputs: DocumentInput[] = [];
  for (const entry of form.getAll("file")) {
    if (typeof entry === "string") continue;
    const data = new Uint8Array(await entry.arrayBuffer());
    const mediaType = sniffMediaType(data);
    if (!mediaType) return fail(415, "unsupported_file", "unsupported file type");
    inputs.push({ data, mediaType });
  }
  if (!inputs.length) return fail(400, "no_file", "no file");

  const overrides: Partial<ExtractOptions> = {};
  const model = form.get("model");
  const effort = form.get("effort");
  if (typeof model === "string" && /^claude-[a-z0-9-]{3,40}$/.test(model)) overrides.model = model;
  if (typeof effort === "string" && EFFORTS.includes(effort)) overrides.effort = effort as ExtractOptions["effort"];

  try {
    const result = await extractDocument({ inputs, hint: toHint(form.get("docType")), ...overrides });
    // Eval and sample runs spend from the same budget as visitors do.
    await recordSpend(result.usage.costUsd);
    return ok({ result });
  } catch (error) {
    if (error instanceof ExtractorError) return fail(422, error.code, error.message);
    console.error("admin extract failed", error);
    return fail(500, "provider_error", String(error));
  }
}
