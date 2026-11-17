import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Anonymous session state kept in signed cookies:
 *   sl_v  visitor id (random; lets us count unique visitors, nothing more)
 *   sl_u  number of free conversions used
 *   sl_e  the email the visitor gave us, once they have
 */
const COOKIE_VISITOR = "sl_v";
const COOKIE_USED = "sl_u";
const COOKIE_EMAIL = "sl_e";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret(): string {
  const value = process.env.APP_SECRET;
  if (value) return value;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    // Unsigned cookies would let anyone reset their own limits.
    if (!process.env.ALLOW_DEV_SECRET) throw new Error("APP_SECRET is not set");
  }
  return "dev-only-secret";
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 32);
}

function verify(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function readSigned(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const value = raw.slice(0, dot);
  return verify(value, raw.slice(dot + 1)) ? value : null;
}

/** Stable, non-reversible id for an IP or an email. Raw values are never stored. */
export function hashId(kind: "ip" | "email" | "visitor", value: string): string {
  return createHmac("sha256", secret()).update(`${kind}:${value.trim().toLowerCase()}`).digest("hex").slice(0, 20);
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export interface Session {
  visitorId: string;
  isNewVisitor: boolean;
  /** Short hash of the visitor id, safe to put in event keys. */
  visitorHash: string;
  freeUsed: number;
  email: string | null;
  ipHash: string;
}

export function readSession(req: NextRequest): Session {
  const existing = req.cookies.get(COOKIE_VISITOR)?.value;
  const validVisitor = existing && /^[A-Za-z0-9_-]{16,40}$/.test(existing) ? existing : null;
  const visitorId = validVisitor ?? randomBytes(12).toString("base64url");

  const used = readSigned(req.cookies.get(COOKIE_USED)?.value);
  const emailToken = readSigned(req.cookies.get(COOKIE_EMAIL)?.value);
  let email: string | null = null;
  if (emailToken) {
    try {
      email = Buffer.from(emailToken, "base64url").toString("utf8");
    } catch {
      email = null;
    }
  }

  return {
    visitorId,
    isNewVisitor: !validVisitor,
    visitorHash: hashId("visitor", visitorId).slice(0, 10),
    freeUsed: used && /^\d+$/.test(used) ? Number(used) : 0,
    email,
    ipHash: hashId("ip", clientIp(req)),
  };
}

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ONE_YEAR,
};

export function writeVisitor(res: NextResponse, session: Session) {
  if (session.isNewVisitor) res.cookies.set(COOKIE_VISITOR, session.visitorId, baseCookie);
}

export function writeFreeUsed(res: NextResponse, count: number) {
  const value = String(count);
  res.cookies.set(COOKIE_USED, `${value}.${sign(value)}`, baseCookie);
}

export function writeEmail(res: NextResponse, email: string) {
  const value = Buffer.from(email, "utf8").toString("base64url");
  res.cookies.set(COOKIE_EMAIL, `${value}.${sign(value)}`, baseCookie);
}

/** Reject cross-site POSTs: the Origin host must be the host we are served on. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin navigations and non-browser clients
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
