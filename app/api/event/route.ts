import type { NextRequest } from "next/server";
import { CLIENT_EVENT_TYPES, cleanPage, logEvent, type EventType } from "@/lib/events";
import { fail, ok } from "@/lib/http";
import { readSession, sameOrigin, writeVisitor } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget|python|scrapy|httpclient/i;

// Per-instance flood guard; the daily counters live in the store.
const recent = new Map<string, { minute: number; count: number }>();

function tooMany(ipHash: string): boolean {
  const minute = Math.floor(Date.now() / 60_000);
  const entry = recent.get(ipHash);
  if (!entry || entry.minute !== minute) {
    if (recent.size > 5000) recent.clear();
    recent.set(ipHash, { minute, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > 40;
}

/** Browser-reported funnel events: visit, download, copy, sample, gate, cta_click. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "forbidden", "no");
  const session = readSession(req);

  let body: { type?: unknown; page?: unknown; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "no");
  }
  const type = body.type as EventType;
  if (!CLIENT_EVENT_TYPES.includes(type)) return fail(422, "bad_type", "no");

  const agent = req.headers.get("user-agent") ?? "";
  const res = ok({ ok: true });
  writeVisitor(res, session);
  if (!agent || BOT.test(agent) || tooMany(session.ipHash)) return res;

  const meta: Record<string, string | number | boolean> = {};
  if (body.meta && typeof body.meta === "object") {
    for (const [key, value] of Object.entries(body.meta as Record<string, unknown>).slice(0, 8)) {
      if (!/^[a-zA-Z]{1,24}$/.test(key)) continue;
      if (typeof value === "string") meta[key] = value.slice(0, 80);
      else if (typeof value === "number" && Number.isFinite(value)) meta[key] = value;
      else if (typeof value === "boolean") meta[key] = value;
    }
  }
  await logEvent(type, cleanPage(body.page), session.visitorHash, meta);
  return res;
}
