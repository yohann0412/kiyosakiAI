import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { alertNewLead } from "@/lib/alert";
import { getEmailRecord, normalizeEmail, saveEmailRecord } from "@/lib/emails";
import { cleanPage, logEvent } from "@/lib/events";
import { fail, ok } from "@/lib/http";
import { saveLead } from "@/lib/leads";
import type { Lead } from "@/lib/leads-csv";
import { underDailyCap } from "@/lib/limits";
import { VOLUME_BUCKETS, isQualified } from "@/lib/offer";
import { readSession, sameOrigin, writeEmail, writeVisitor } from "@/lib/session";
import { putJson } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max) : "";

/** The "We'll do it for you" form. Writes the lead and alerts Yohann. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "forbidden", "This request came from another site.");
  const session = readSession(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Please fill in the form.");
  }

  // Honeypot: real visitors never see or fill this field.
  if (text(body.website, 200)) return ok({ ok: true });

  const email = normalizeEmail(body.email);
  if (!email) return fail(422, "invalid_email", "Please enter a work email so we can reply.");
  const bucket = VOLUME_BUCKETS.find((b) => b.id === body.volume);
  if (!bucket) return fail(422, "invalid_volume", "Please choose roughly how many documents you handle a day.");
  if (!(await underDailyCap(session, "lead", 5))) {
    return fail(429, "slow_down", "We've already received a few messages from this network today.");
  }

  const page = cleanPage(body.page);
  const lead: Lead = {
    id: `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`,
    created_at: new Date().toISOString(),
    email,
    name: text(body.name, 120),
    company: text(body.company, 160),
    doc_type: text(body.docType, 120),
    volume: bucket.label,
    docs_per_day: bucket.docsPerDay,
    current_process: text(body.process, 300),
    notes: text(body.notes, 1500),
    source_page: page,
    docs_converted: session.freeUsed,
    qualified: isQualified(bucket.id),
    alerted: "",
  };

  try {
    await saveLead(lead);
  } catch (error) {
    console.error("lead save failed", error);
    return fail(503, "unavailable", "We couldn't save that just now. Please try again in a minute.");
  }

  const channels = await alertNewLead(lead);
  if (channels.length) {
    lead.alerted = channels.join("+");
    await putJson(`leads/${lead.id}.json`, lead).catch(() => undefined);
  }

  await logEvent("lead", page, session.visitorHash, { volume: bucket.id, qualified: lead.qualified });
  if (lead.qualified) await logEvent("lead_qualified", page, session.visitorHash, { volume: bucket.id });

  // Someone who filled in the form has given us their email: unlock the tool.
  if (!(await getEmailRecord(email).catch(() => null))) {
    await saveEmailRecord({
      email,
      created_at: lead.created_at,
      source_page: page,
      reason: "lead",
      confirmation_sent_at: null,
    }).catch(() => undefined);
  }

  const res = ok({ ok: true });
  writeEmail(res, email);
  writeVisitor(res, session);
  return res;
}
