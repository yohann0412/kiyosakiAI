import type { Lead } from "./leads-csv";
import { mailerConfigured, sendMail } from "./mailer";
import { site } from "./site";

/**
 * Tell Yohann about a new lead, on every channel that is configured:
 *   - email   (RESEND_API_KEY + EMAIL_FROM + ALERT_EMAIL_TO), reply-to set to
 *             the lead so answering the alert emails the person directly
 *   - webhook (ALERT_WEBHOOK_URL; Slack and Discord incoming webhooks both work)
 *
 * Returns the channels that accepted the alert, so the lead record shows
 * whether anyone was actually told.
 */
export async function alertNewLead(lead: Lead): Promise<string[]> {
  const sent: string[] = [];
  const tag = lead.qualified ? "QUALIFIED lead" : "Lead";
  const headline = `${tag}: ${lead.volume} · ${lead.doc_type || "documents"} · ${lead.email}`;
  const lines = [
    headline,
    "",
    `Email:    ${lead.email}`,
    `Name:     ${lead.name || "-"}`,
    `Company:  ${lead.company || "-"}`,
    `Volume:   ${lead.volume} (counted as ${lead.docs_per_day}/day)`,
    `Docs:     ${lead.doc_type || "-"}`,
    `Today:    ${lead.current_process || "-"}`,
    `Notes:    ${lead.notes || "-"}`,
    `Page:     ${site.url}/${lead.source_page === "home" ? "" : lead.source_page}`,
    `Used the tool ${lead.docs_converted} time${lead.docs_converted === 1 ? "" : "s"} before filling in the form.`,
    "",
    "Reply to this message to email them directly.",
  ];

  const to = process.env.ALERT_EMAIL_TO;
  if (to && mailerConfigured()) {
    const ok = await sendMail({ to, replyTo: lead.email, subject: `[${site.name}] ${headline}`, text: lines.join("\n") });
    if (ok) sent.push("email");
  }

  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (webhook) {
    try {
      const text = lines.slice(0, -2).join("\n");
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Slack reads `text`, Discord reads `content`.
        body: JSON.stringify({ text, content: text }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) sent.push("webhook");
      else console.error("alert webhook failed", res.status);
    } catch (error) {
      console.error("alert webhook failed", error);
    }
  }

  if (!sent.length) console.warn("lead saved but no alert channel is configured:", lead.id);
  return sent;
}

export function alertChannelsConfigured(): string[] {
  const channels: string[] = [];
  if (process.env.ALERT_EMAIL_TO && mailerConfigured()) channels.push("email");
  if (process.env.ALERT_WEBHOOK_URL) channels.push("webhook");
  return channels;
}
