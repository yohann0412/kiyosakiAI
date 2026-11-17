"use client";

import { useEffect, useState, type FormEvent } from "react";
import { tuning } from "@/content/tuning";
import { DOC_TYPES, PICKER_TYPES } from "@/core/extractor/doctypes";
import { ApiError, submitLead } from "@/lib/client/api";
import { VOLUME_BUCKETS } from "@/lib/offer-buckets";
import { Dialog } from "./Dialog";
import { CheckIcon, SpinnerIcon } from "./icons";
import { onLeadOpen, type LeadContext } from "./lead";

const PROCESSES = [
  "Someone types them in by hand",
  "We outsource the data entry",
  "We use OCR or software, then fix its mistakes",
  "Something else",
];

const DOC_CHOICES = [
  ...PICKER_TYPES.map((id) => ({ value: DOC_TYPES[id].plural, label: capitalize(DOC_TYPES[id].plural) })),
  { value: "a mix of documents", label: "A mix of these" },
  { value: "other documents", label: "Something else" },
];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The short lead form behind every "We'll do it for you" button. */
export function LeadDialog() {
  const [context, setContext] = useState<LeadContext | null>(null);
  const [volume, setVolume] = useState("");
  const [docType, setDocType] = useState("");
  const [process, setProcess] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(
    () =>
      onLeadOpen((next) => {
        setContext(next);
        setError("");
        setDone(false);
        if (next.docType && next.docType in DOC_TYPES && next.docType !== "other") {
          setDocType(DOC_TYPES[next.docType as keyof typeof DOC_TYPES].plural);
        }
      }),
    [],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!context) return;
    if (!volume) {
      setError("Choose roughly how many documents you handle a day.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await submitLead({ volume, docType, process, email, name, company, notes, website, page: context.page });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={context !== null} onClose={() => setContext(null)} title={done ? "Got it" : tuning.cta.formTitle} wide>
      {done ? (
        <div className="mt-4">
          <div className="flex items-start gap-3 rounded-xl bg-accent-soft p-4 text-ink">
            <span className="mt-0.5 text-accent">
              <CheckIcon />
            </span>
            <p>{tuning.cta.success}</p>
          </div>
          <button type="button" className="btn btn-secondary mt-5" onClick={() => setContext(null)}>
            Back to the converter
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-2 space-y-5" noValidate>
          <p className="text-sm text-muted">{tuning.cta.formIntro}</p>

          <fieldset>
            <legend className="field-label">1. How many documents do you handle?</legend>
            <div className="grid grid-cols-2 gap-2">
              {VOLUME_BUCKETS.map((bucket) => (
                <label
                  key={bucket.id}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    volume === bucket.id
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-line-strong hover:border-ink-2"
                  }`}
                >
                  <input
                    type="radio"
                    name="volume"
                    value={bucket.id}
                    checked={volume === bucket.id}
                    onChange={() => setVolume(bucket.id)}
                    className="sr-only"
                  />
                  {bucket.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="lead-doc">
                2. Which documents?
              </label>
              <select id="lead-doc" className="field-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="">Choose...</option>
                {DOC_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="lead-process">
                3. How are they handled today?
              </label>
              <select id="lead-process" className="field-input" value={process} onChange={(e) => setProcess(e.target.value)}>
                <option value="">Choose...</option>
                {PROCESSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="lead-email">
              Work email
            </label>
            <input
              id="lead-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="field-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="lead-name">
                Name <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="lead-name" className="field-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="lead-company">
                Company <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="lead-company"
                className="field-input"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="lead-notes">
              Anything else we should know? <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="lead-notes"
              rows={2}
              className="field-input"
              placeholder="Where the data needs to end up, what goes wrong today..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Honeypot: hidden from people, tempting to bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          {error ? (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <SpinnerIcon /> : null}
              {tuning.cta.submit}
            </button>
            <p className="text-xs text-muted">We reply by email. No sales calls unless you ask for one.</p>
          </div>
        </form>
      )}
    </Dialog>
  );
}
