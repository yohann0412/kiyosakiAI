import type { NextRequest } from "next/server";
import { adminAllowed } from "@/lib/admin";
import { fail, ok } from "@/lib/http";
import { lastDays, metrics } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Funnel counts for the last N days (UTC). */
export async function GET(req: NextRequest) {
  if (!adminAllowed(req)) return fail(401, "unauthorized", "no");
  const days = Math.min(60, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 9)));
  return ok({ days: await metrics(lastDays(days)) });
}
