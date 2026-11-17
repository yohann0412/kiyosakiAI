import type { NextRequest } from "next/server";
import { domainAcceptsMail, getEmailRecord, normalizeEmail, saveEmailRecord } from "@/lib/emails";
import { cleanPage, logEvent } from "@/lib/events";
import { fail, ok } from "@/lib/http";
import { allowance, underDailyCap } from "@/lib/limits";
import { confirmationMail, sendMail } from "@/lib/mailer";
import { readSession, sameOrigin, writeEmail, writeVisitor } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Email capture: unlocks more conversions and bulk mode. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail(403, "forbidden", "This request came from another site.");
  const session = readSession(req);

  let body: { email?: unknown; page?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Please enter your email.");
  }

  const email = normalizeEmail(body.email);
  if (!email) return fail(422, "invalid_email", "That doesn't look like an email address. Please check it.");
  if (!(await underDailyCap(session, "email", 8))) {
    return fail(429, "slow_down", "Too many attempts from this network today. Please try again tomorrow.");
  }
  if (!(await domainAcceptsMail(email))) {
    return fail(422, "invalid_email", "We couldn't find a mail server for that address. Is there a typo in it?");
  }

  const page = cleanPage(body.page);
  const reason = body.reason === "bulk" ? "bulk" : "limit";
  const existing = await getEmailRecord(email);
  if (!existing) {
    // The one confirmation email program.md allows, sent once per address.
    const sent = await sendMail(confirmationMail(email));
    await saveEmailRecord({
      email,
      created_at: new Date().toISOString(),
      source_page: page,
      reason,
      confirmation_sent_at: sent ? new Date().toISOString() : null,
    });
    await logEvent("email", page, session.visitorHash, { reason });
  }

  const state = await allowance({ ...session, email }).catch(() => null);
  const res = ok({ ok: true, allowance: state });
  writeEmail(res, email);
  writeVisitor(res, session);
  return res;
}
