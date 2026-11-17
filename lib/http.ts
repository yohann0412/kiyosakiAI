import { NextResponse } from "next/server";

export function fail(status: number, error: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function ok(body: Record<string, unknown>) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
