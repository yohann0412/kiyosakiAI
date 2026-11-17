import { store } from "./store";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Retention sweep.
 *
 * Uploaded documents are processed in memory and never stored, so there is
 * normally nothing under uploads/. The sweep still checks it: if a future
 * change ever stages a file there, it is gone within 23 hours (run hourly,
 * that keeps every file inside the 24-hour window the site promises).
 *
 * Counters are operational data with a short life. Events and leads are kept.
 */
export async function purge(now = Date.now()): Promise<Record<string, number>> {
  const rules: { prefix: string; maxAgeMs: number }[] = [
    { prefix: "uploads/", maxAgeMs: 23 * HOUR },
    { prefix: "results/", maxAgeMs: 23 * HOUR },
    { prefix: "usage/", maxAgeMs: 3 * DAY },
    { prefix: "spend/", maxAgeMs: 100 * DAY },
  ];
  const removed: Record<string, number> = {};
  for (const rule of rules) {
    const objects = await store().list(rule.prefix);
    const stale = objects.filter((object) => {
      const updated = object.updatedAt ? Date.parse(object.updatedAt) : NaN;
      // An object with no readable timestamp is treated as stale: never keep
      // something because we could not tell how old it is.
      return !Number.isFinite(updated) || now - updated > rule.maxAgeMs;
    });
    await store().del(stale.map((object) => object.key));
    removed[rule.prefix] = stale.length;
  }
  return removed;
}
