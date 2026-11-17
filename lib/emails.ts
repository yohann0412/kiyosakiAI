import { promises as dns } from "node:dns";
import { hashId } from "./session";
import { getJson, putJson } from "./store";

export interface EmailRecord {
  email: string;
  created_at: string;
  source_page: string;
  /** Why they gave it: "limit" (free documents used up) or "bulk". */
  reason: string;
  confirmation_sent_at: string | null;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

/**
 * Does the domain accept mail? A typo like "gmial.con" is caught here, which
 * matters because the whole point is being able to write back.
 * DNS trouble on our side never blocks a real address.
 */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const lookup = (async () => {
    try {
      const records = await dns.resolveMx(domain);
      return records.length > 0;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOTFOUND" || code === "ENODATA") {
        // No MX: mail may still be delivered to an A record.
        try {
          return (await dns.resolve4(domain)).length > 0;
        } catch (inner) {
          const innerCode = (inner as NodeJS.ErrnoException).code;
          return !(innerCode === "ENOTFOUND" || innerCode === "ENODATA");
        }
      }
      return true;
    }
  })();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 2500));
  return Promise.race([lookup, timeout]);
}

const emailKey = (email: string) => `emails/${hashId("email", email)}.json`;

export async function getEmailRecord(email: string): Promise<EmailRecord | null> {
  return getJson<EmailRecord>(emailKey(email));
}

export async function saveEmailRecord(record: EmailRecord): Promise<void> {
  await putJson(emailKey(record.email), record);
}
