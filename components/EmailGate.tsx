"use client";

import { useState, type FormEvent } from "react";
import { tuning } from "@/content/tuning";
import { ApiError, submitEmail, type AllowanceState } from "@/lib/client/api";
import { Dialog } from "./Dialog";
import { LockIcon, SpinnerIcon } from "./icons";

/** Asks for an email once the free documents are used, or for bulk mode. */
export function EmailGate({
  reason,
  page,
  onClose,
  onDone,
}: {
  reason: "limit" | "bulk" | null;
  page: string;
  onClose: () => void;
  onDone: (allowance: AllowanceState | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      const response = await submitEmail(email, page, reason);
      onDone(response.allowance);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const bulk = reason === "bulk";
  return (
    <Dialog open={reason !== null} onClose={onClose} title={bulk ? tuning.gate.bulkTitle : tuning.gate.title}>
      <form onSubmit={submit} className="mt-2 space-y-4" noValidate>
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">{bulk ? tuning.gate.bulkBody : tuning.gate.body}</p>
        <div>
          <label className="field-label" htmlFor="gate-email">
            Work email
          </label>
          <input
            id="gate-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            inputMode="email"
            className="field-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? <SpinnerIcon /> : null}
          {tuning.gate.submit}
        </button>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <LockIcon size={14} className="mt-0.5 shrink-0" />
          {tuning.gate.finePrint}
        </p>
      </form>
    </Dialog>
  );
}
