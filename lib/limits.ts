import { tuning } from "@/content/tuning";
import { dayKey, spendForDay } from "./events";
import type { Session } from "./session";
import { hashId } from "./session";
import { getJson, putJson } from "./store";

/**
 * Who may convert another document right now.
 *
 * Layers, cheapest check first:
 *   1. burst limit per IP (stops scripts)
 *   2. free documents before an email is needed (the sign-up nudge)
 *   3. daily limits per IP and per email (stops abuse)
 *   4. daily model budget for the whole site (protects the $50/month)
 */
export type Denial =
  | { reason: "email_required"; message: string }
  | { reason: "slow_down"; message: string }
  | { reason: "daily_limit"; message: string }
  | { reason: "budget"; message: string };

interface Counter {
  count: number;
  /** Timestamps (ms) of recent uploads, for the burst limit. */
  recent?: number[];
}

const ipKey = (session: Session) => `usage/${dayKey()}/ip-${session.ipHash}.json`;
const emailKey = (email: string) => `usage/${dayKey()}/em-${hashId("email", email)}.json`;

export interface Allowance {
  freeLimit: number;
  freeUsed: number;
  hasEmail: boolean;
  /** Conversions left before the next wall (email gate or daily limit). */
  remaining: number;
}

export async function allowance(session: Session): Promise<Allowance> {
  const freeLimit = tuning.freeDocs;
  if (!session.email) {
    return { freeLimit, freeUsed: session.freeUsed, hasEmail: false, remaining: Math.max(0, freeLimit - session.freeUsed) };
  }
  const counter = await getJson<Counter>(emailKey(session.email));
  return {
    freeLimit,
    freeUsed: session.freeUsed,
    hasEmail: true,
    remaining: Math.max(0, tuning.emailDailyDocs - (counter?.count ?? 0)),
  };
}

export async function checkAllowance(session: Session): Promise<Denial | null> {
  const now = Date.now();
  const ip = (await getJson<Counter>(ipKey(session))) ?? { count: 0, recent: [] };

  const lastMinute = (ip.recent ?? []).filter((t) => now - t < 60_000);
  if (lastMinute.length >= tuning.burstPerMinute) {
    return { reason: "slow_down", message: "That's a lot of uploads in one minute. Give it a moment and try again." };
  }

  if (!session.email) {
    if (session.freeUsed >= tuning.freeDocs || ip.count >= tuning.ipDailyAnon) {
      return { reason: "email_required", message: tuning.gate.body };
    }
  } else {
    const email = await getJson<Counter>(emailKey(session.email));
    if ((email?.count ?? 0) >= tuning.emailDailyDocs) {
      return {
        reason: "daily_limit",
        message: `You've converted ${tuning.emailDailyDocs} documents today, which is the free daily limit. It resets at midnight UTC. Need more than that every day? We can run them for you.`,
      };
    }
  }

  if (ip.count >= tuning.ipDailyMax) {
    return {
      reason: "daily_limit",
      message: "This network has reached today's free limit. It resets at midnight UTC. Need more than that every day? We can run them for you.",
    };
  }

  const spent = await spendForDay();
  if (spent >= tuning.dailyBudgetUsd) {
    return {
      reason: "budget",
      message: "The free converter has hit its daily capacity. It opens again at midnight UTC. If you have documents waiting, tell us and we'll run them for you.",
    };
  }

  return null;
}

/** Count one conversion against the visitor's IP and email. */
export async function recordUse(session: Session): Promise<void> {
  const now = Date.now();
  const key = ipKey(session);
  const ip = (await getJson<Counter>(key)) ?? { count: 0, recent: [] };
  await putJson(key, {
    count: ip.count + 1,
    recent: [...(ip.recent ?? []).filter((t) => now - t < 60_000), now],
  });
  if (session.email) {
    const eKey = emailKey(session.email);
    const email = (await getJson<Counter>(eKey)) ?? { count: 0 };
    await putJson(eKey, { count: email.count + 1 });
  }
}

/** Generic small per-IP daily limiter for the email and lead endpoints. */
export async function underDailyCap(session: Session, bucket: string, cap: number): Promise<boolean> {
  const key = `usage/${dayKey()}/${bucket}-${session.ipHash}.json`;
  const counter = (await getJson<Counter>(key)) ?? { count: 0 };
  if (counter.count >= cap) return false;
  await putJson(key, { count: counter.count + 1 });
  return true;
}
