import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Read-only admin endpoints (metrics and leads) for the nightly agent and for
 * Yohann. Off unless ADMIN_TOKEN is set; the token goes in the Authorization
 * header, never in a URL.
 */
export function adminAllowed(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
