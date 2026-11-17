/**
 * Volume choices on the lead form. Kept apart from lib/offer.ts (which reads
 * offer.md from disk) so the browser bundle can import it.
 * `docsPerDay` is the lower bound of the bucket.
 */
export const VOLUME_BUCKETS = [
  { id: "under_10", label: "Fewer than 10 a day", docsPerDay: 5 },
  { id: "10_49", label: "10 to 49 a day", docsPerDay: 10 },
  { id: "50_199", label: "50 to 199 a day", docsPerDay: 50 },
  { id: "200_plus", label: "200 or more a day", docsPerDay: 200 },
] as const;

export type VolumeBucketId = (typeof VOLUME_BUCKETS)[number]["id"];
