import { EVENT_TYPES, dayKey, parseEventKey, spendForDay, type EventType } from "./events";
import { store } from "./store";

/** Funnel counts for one UTC day. Everything comes from event keys; no event body is read. */
export interface DayMetrics {
  day: string;
  /** Unique visitors (distinct visitor ids with a visit event). */
  visitors: number;
  counts: Record<EventType, number>;
  /** Per page: visits, uploads, successful extractions, downloads, emails, leads. */
  pages: Record<string, Partial<Record<EventType, number>>>;
  modelSpendUsd: number;
}

export function lastDays(n: number, end = new Date()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(dayKey(new Date(end.getTime() - i * 86_400_000)));
  return days;
}

export async function metricsForDay(day: string): Promise<DayMetrics> {
  const counts = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as Record<EventType, number>;
  const pages: DayMetrics["pages"] = {};
  const visitors = new Set<string>();
  const objects = await store().list(`events/${day}/`);
  for (const object of objects) {
    const event = parseEventKey(object.key);
    if (!event) continue;
    counts[event.type]++;
    const page = (pages[event.page] ??= {});
    page[event.type] = (page[event.type] ?? 0) + 1;
    if (event.type === "visit") visitors.add(event.visitor);
  }
  return { day, visitors: visitors.size, counts, pages, modelSpendUsd: await spendForDay(day, 0) };
}

export async function metrics(days: string[]): Promise<DayMetrics[]> {
  return Promise.all(days.map(metricsForDay));
}

/** The funnel in the order program.md lists it. */
export const FUNNEL: { key: EventType | "visitors"; label: string }[] = [
  { key: "visitors", label: "Visitors" },
  { key: "visit", label: "Page views" },
  { key: "upload", label: "Uploads" },
  { key: "extract_ok", label: "Successful extractions" },
  { key: "extract_fail", label: "Failed extractions" },
  { key: "download", label: "Downloads" },
  { key: "email", label: "Emails captured" },
  { key: "cta_click", label: "Offer button clicks" },
  { key: "lead", label: "Lead forms" },
  { key: "lead_qualified", label: "Qualified leads" },
];

export function funnelValue(day: DayMetrics, key: EventType | "visitors"): number {
  return key === "visitors" ? day.visitors : day.counts[key];
}
