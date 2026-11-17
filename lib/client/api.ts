import type { ExtractionResult } from "@/core/extractor/types";
import type { PreparedDoc } from "./prepare";

export interface AllowanceState {
  freeLimit: number;
  freeUsed: number;
  hasEmail: boolean;
  remaining: number;
}

export interface SessionState extends AllowanceState {
  ready: boolean;
  demo: boolean;
  maxPages: number;
  maxUploadBytes: number;
  bulkMaxFiles: number;
}

/** What the browser receives: the result without token counts or cost. */
export type ClientResult = Omit<ExtractionResult, "usage"> & { ms: number };

export class ApiError extends Error {
  code: string;
  status: number;
  gate?: "limit" | "bulk";
  constructor(status: number, code: string, message: string, gate?: "limit" | "bulk") {
    super(message);
    this.status = status;
    this.code = code;
    this.gate = gate;
  }
}

async function parse(res: Response) {
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON error page from the host
  }
  if (!res.ok) {
    const fallback =
      res.status === 413
        ? "That file is too large. The limit is about 4 MB per document."
        : res.status === 504
          ? "That took too long. Try fewer pages or a clearer scan."
          : "Something went wrong. Please try again.";
    throw new ApiError(
      res.status,
      String(body.error ?? "error"),
      String(body.message ?? fallback),
      body.gate as "limit" | "bulk" | undefined,
    );
  }
  return body;
}

export async function fetchSession(): Promise<SessionState> {
  return (await parse(await fetch("/api/session", { cache: "no-store" }))) as unknown as SessionState;
}

export async function extract(
  doc: PreparedDoc,
  opts: { page: string; docType: string; bulk?: boolean; signal?: AbortSignal },
): Promise<{ result: ClientResult; demo: boolean; allowance: AllowanceState | null }> {
  const form = new FormData();
  doc.parts.forEach((part, i) => form.append("file", part, doc.kind === "pdf" ? doc.name : `page-${i + 1}.jpg`));
  form.append("page", opts.page);
  form.append("docType", opts.docType);
  if (opts.bulk) form.append("bulk", "1");
  let res: Response;
  try {
    res = await fetch("/api/extract", { method: "POST", body: form, signal: opts.signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "network", "The upload didn't go through. Check your connection and try again.");
  }
  return (await parse(res)) as unknown as { result: ClientResult; demo: boolean; allowance: AllowanceState | null };
}

export async function submitEmail(email: string, page: string, reason: "limit" | "bulk") {
  const res = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, page, reason }),
  });
  return (await parse(res)) as unknown as { ok: true; allowance: AllowanceState | null };
}

export async function submitLead(payload: Record<string, string>) {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse(res);
}

/** Fire-and-forget funnel event. */
export function track(type: string, page: string, meta: Record<string, string | number | boolean> = {}) {
  try {
    const body = JSON.stringify({ type, page, meta });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
  } catch {
    // analytics never gets in the user's way
  }
}
