import type { NextRequest } from "next/server";
import { tuning } from "@/content/tuning";
import { extractorConfig } from "@/core/extractor";
import { ok } from "@/lib/http";
import { allowance } from "@/lib/limits";
import { readSession, writeVisitor } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the tool needs to know before the first upload. */
export async function GET(req: NextRequest) {
  const session = readSession(req);
  const config = extractorConfig();
  let state;
  try {
    state = await allowance(session);
  } catch {
    state = { freeLimit: tuning.freeDocs, freeUsed: session.freeUsed, hasEmail: Boolean(session.email), remaining: 0 };
  }
  const res = ok({
    ...state,
    ready: config.ready,
    demo: config.provider === "mock",
    maxPages: config.maxPages,
    maxUploadBytes: tuning.maxUploadBytes,
    bulkMaxFiles: tuning.bulkMaxFiles,
  });
  writeVisitor(res, session);
  return res;
}
