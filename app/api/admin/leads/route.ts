import type { NextRequest } from "next/server";
import { adminAllowed } from "@/lib/admin";
import { fail, ok } from "@/lib/http";
import { allLeads } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every lead on file. Personal data: token required, never cached. */
export async function GET(req: NextRequest) {
  if (!adminAllowed(req)) return fail(401, "unauthorized", "no");
  return ok({ leads: await allLeads() });
}
