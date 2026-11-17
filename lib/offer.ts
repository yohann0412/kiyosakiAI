import fs from "node:fs";
import path from "node:path";
import { VOLUME_BUCKETS } from "./offer-buckets";

export { VOLUME_BUCKETS } from "./offer-buckets";

/**
 * Settings the human controls in offer.md (front matter at the top).
 */
const DEFAULT_MIN_DOCS_PER_DAY = 50;

let cached: { qualifiedMinDocsPerDay: number } | null = null;

export function offer() {
  if (cached) return cached;
  let qualifiedMinDocsPerDay = DEFAULT_MIN_DOCS_PER_DAY;
  try {
    const text = fs.readFileSync(path.join(process.cwd(), "offer.md"), "utf8");
    const match = /^qualified_min_docs_per_day:\s*(\d+)\s*$/m.exec(text);
    if (match) qualifiedMinDocsPerDay = Number(match[1]);
    else console.warn("offer.md has no qualified_min_docs_per_day; using", DEFAULT_MIN_DOCS_PER_DAY);
  } catch {
    console.warn("offer.md not readable; using default threshold", DEFAULT_MIN_DOCS_PER_DAY);
  }
  cached = { qualifiedMinDocsPerDay };
  return cached;
}

export function isQualified(bucketId: string): boolean {
  const bucket = VOLUME_BUCKETS.find((b) => b.id === bucketId);
  return Boolean(bucket && bucket.docsPerDay >= offer().qualifiedMinDocsPerDay);
}
