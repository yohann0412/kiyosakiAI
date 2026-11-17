import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { purge } from "@/lib/purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hourly retention sweep. Vercel Cron calls this with the CRON_SECRET bearer token. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return fail(401, "unauthorized", "no");
  }
  return ok({ ok: true, removed: await purge() });
}
