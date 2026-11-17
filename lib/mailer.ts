import { site } from "./site";

/**
 * Outbound email through Resend (https://resend.com). Optional: without
 * RESEND_API_KEY and EMAIL_FROM nothing is sent and callers are told so.
 *
 * program.md allows exactly one email to a user (the confirmation). Anything
 * beyond that needs the human's approval first.
 */
export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailerConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("mail send failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (error) {
    console.error("mail send failed", error);
    return false;
  }
}

/** The one confirmation email a visitor gets after giving their address. */
export function confirmationMail(to: string): Mail {
  const replyTo = process.env.ALERT_EMAIL_TO || undefined;
  return {
    to,
    replyTo,
    subject: `You're set up on ${site.name}`,
    text: [
      `Thanks for using ${site.name}.`,
      "",
      "Your email is confirmed for free conversions: upload a photo or PDF of an invoice, packing slip, bill of lading, purchase order, receipt or handwritten order and download it as Excel or CSV.",
      "",
      `${site.url}`,
      "",
      "Files are deleted from our systems as soon as they are converted, and never kept longer than 24 hours.",
      "",
      "If your team handles 50 or more of these a day, reply to this email and tell us what they are. We can take the whole pile off your hands.",
      "",
      "This is the only email we'll send unless you write back.",
    ].join("\n"),
  };
}
