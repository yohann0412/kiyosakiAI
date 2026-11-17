import { randomBytes } from "node:crypto";
import { store } from "./store";

/**
 * Funnel events. One small object per event; the type, page and a short
 * visitor hash are in the key, so daily counts come from a single listing
 * without reading any object.
 *
 * Events never contain document contents, extracted values, emails or IPs.
 */
export const EVENT_TYPES = [
  "visit",
  "upload",
  "extract_ok",
  "extract_fail",
  "download",
  "copy",
  "sample",
  "gate",
  "email",
  "cta_click",
  "lead",
  "lead_qualified",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Events the browser is allowed to report. The rest are logged server-side. */
export const CLIENT_EVENT_TYPES: EventType[] = ["visit", "download", "copy", "sample", "gate", "cta_click"];

export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function cleanPage(page: unknown): string {
  const text = typeof page === "string" ? page : "";
  const slug = text.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return slug || "home";
}

export interface ParsedEventKey {
  day: string;
  type: EventType;
  page: string;
  visitor: string;
  at: number;
}

export function eventKey(type: EventType, page: string, visitorHash: string, at = Date.now()): string {
  const rand = randomBytes(4).toString("hex");
  return `events/${dayKey(new Date(at))}/${type}~${cleanPage(page)}~${visitorHash || "anon"}~${at}-${rand}.json`;
}

export function parseEventKey(key: string): ParsedEventKey | null {
  const match = /^events\/(\d{4}-\d{2}-\d{2})\/([a-z_]+)~([a-z0-9-]+)~([A-Za-z0-9]+)~(\d+)-[0-9a-f]+\.json$/.exec(key);
  if (!match) return null;
  if (!(EVENT_TYPES as readonly string[]).includes(match[2])) return null;
  return { day: match[1], type: match[2] as EventType, page: match[3], visitor: match[4], at: Number(match[5]) };
}

export async function logEvent(
  type: EventType,
  page: string,
  visitorHash: string,
  meta: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  try {
    await store().put(eventKey(type, page, visitorHash), JSON.stringify(meta));
  } catch (error) {
    // Analytics must never break a conversion.
    console.error("event log failed", type, error);
  }
}

// ---- model spend ledger ---------------------------------------------------
// One empty object per extraction with the cost (in millionths of a dollar)
// in its name. Summing a listing is race-free, unlike a shared counter.

export async function recordSpend(costUsd: number): Promise<void> {
  if (!(costUsd > 0)) return;
  const micros = Math.round(costUsd * 1_000_000);
  const key = `spend/${dayKey()}/${Date.now()}-${micros}-${randomBytes(3).toString("hex")}`;
  try {
    await store().put(key, "");
    if (spendCache && spendCache.day === dayKey()) spendCache.usd += costUsd;
  } catch (error) {
    console.error("spend log failed", error);
  }
}

let spendCache: { day: string; usd: number; fetchedAt: number } | null = null;

export async function spendForDay(day = dayKey(), maxAgeMs = 30_000): Promise<number> {
  const isToday = day === dayKey();
  if (isToday && spendCache && spendCache.day === day && Date.now() - spendCache.fetchedAt < maxAgeMs) {
    return spendCache.usd;
  }
  const objects = await store().list(`spend/${day}/`);
  let micros = 0;
  for (const object of objects) {
    const match = /\/\d+-(\d+)-[0-9a-f]+$/.exec(object.key);
    if (match) micros += Number(match[1]);
  }
  const usd = micros / 1_000_000;
  if (isToday) spendCache = { day, usd, fetchedAt: Date.now() };
  return usd;
}
