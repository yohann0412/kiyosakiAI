"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { DOC_TYPES, PICKER_TYPES } from "@/core/extractor/doctypes";
import { mergedSheet, summarySheet, tableSheet, type Sheet, type TabularDoc } from "@/core/extractor/tabular";
import type { DocTypeHint } from "@/core/extractor/types";
import { ApiError, extract, fetchSession, track, type AllowanceState, type ClientResult, type SessionState } from "@/lib/client/api";
import { downloadCsv, downloadXlsx } from "@/lib/client/export";
import { PrepareError, isPdf, isSupported, prepareFile, preparePages, releasePreviews, type PreparedDoc } from "@/lib/client/prepare";
import { EmailGate } from "./EmailGate";
import { ResultView, type PreviewSource } from "./ResultView";
import { AlertIcon, ArrowRightIcon, CameraIcon, CheckIcon, ClockIcon, DownloadIcon, FileIcon, LockIcon, SpinnerIcon, UploadIcon } from "./icons";
import { openLead } from "./lead";

export interface SampleDoc {
  id: string;
  /** e.g. "invoice" - used in "Try a sample invoice". */
  label: string;
  /** Path of the sample image under /public. */
  image: string;
}

interface BulkItem {
  id: string;
  file: File;
  status: "queued" | "working" | "done" | "error";
  message?: string;
  result?: ClientResult;
  preview?: PreviewSource;
  doc?: TabularDoc;
  prepared?: PreparedDoc;
}

type Phase =
  | { name: "idle" }
  | { name: "choose"; files: File[] }
  | { name: "working"; label: string; fileName: string; previewUrl?: string }
  | { name: "result"; result: ClientResult; preview: PreviewSource | null; demo: boolean; banner?: string }
  | { name: "bulk" }
  | { name: "error"; message: string; offerHelp: boolean };

const FALLBACK_SESSION: SessionState = {
  freeLimit: 3,
  freeUsed: 0,
  hasEmail: false,
  remaining: 3,
  ready: true,
  demo: false,
  maxPages: 10,
  maxUploadBytes: 4_300_000,
  bulkMaxFiles: 25,
};

const WORKING_STEPS = ["Reading the document", "Finding the line items", "Lining up the columns", "Checking the arithmetic"];

function Working({ label, fileName, previewUrl, onCancel }: { label: string; fileName: string; previewUrl?: string; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const step = label || WORKING_STEPS[Math.min(WORKING_STEPS.length - 1, Math.floor(seconds / 4))];
  return (
    <div className="flex flex-col items-center gap-5 px-4 py-10 text-center sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:text-left">
      <div className="relative h-44 w-36 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="h-full w-full object-cover object-top opacity-80" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <FileIcon size={40} />
          </div>
        )}
        <div
          className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-transparent via-accent/40 to-transparent"
          style={{ animation: "sweep 2.2s ease-in-out infinite" }}
        />
      </div>
      <div className="min-w-0">
        <p className="flex items-center justify-center gap-2 text-lg font-semibold sm:justify-start" aria-live="polite">
          <SpinnerIcon className="text-accent" /> {step}...
        </p>
        <p className="mt-1 truncate text-sm text-muted">{fileName}</p>
        <p className="mt-1 text-sm text-muted">
          {seconds < 25 ? "Most documents take 5 to 20 seconds." : "Long or handwritten documents take a little longer. Still working."} ({seconds}s)
        </p>
        <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function Tool({ page, docType = "auto", sample }: { page: string; docType?: DocTypeHint; sample?: SampleDoc }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [hint, setHint] = useState<DocTypeHint>(docType);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [gate, setGate] = useState<{ reason: "limit" | "bulk"; resume: () => void } | null>(null);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const singleDoc = useRef<PreparedDoc | null>(null);
  const hintRef = useRef(hint);
  hintRef.current = hint;
  const sessionRef = useRef<SessionState>(FALLBACK_SESSION);
  if (session) sessionRef.current = session;

  useEffect(() => {
    fetchSession()
      .then(setSession)
      .catch(() => setSession(FALLBACK_SESSION));
    track("visit", page, { ref: document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : "" });
  }, [page]);

  const applyAllowance = useCallback((allowance: AllowanceState | null) => {
    if (allowance) setSession((current) => ({ ...(current ?? FALLBACK_SESSION), ...allowance }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    releasePreviews(singleDoc.current);
    singleDoc.current = null;
    setItems((current) => {
      current.forEach((item) => releasePreviews(item.prepared ?? null));
      return [];
    });
    setSelected(null);
    setPhase({ name: "idle" });
  }, []);

  const fail = useCallback((error: unknown) => {
    if ((error as Error)?.name === "AbortError") {
      setPhase({ name: "idle" });
      return;
    }
    const message =
      error instanceof ApiError || error instanceof PrepareError ? error.message : "Something went wrong. Please try again.";
    const offerHelp = error instanceof ApiError && (error.code === "daily_limit" || error.code === "budget");
    setPhase({ name: "error", message, offerHelp });
  }, []);

  // ---- one document ---------------------------------------------------------
  const runSingle = useCallback(
    async (files: File[], asPages: boolean) => {
      const limits = sessionRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      setPhase({ name: "working", label: "Getting the file ready", fileName: files[0].name });
      try {
        const doc = asPages
          ? await preparePages(files, limits.maxUploadBytes)
          : await prepareFile(files[0], limits.maxUploadBytes, limits.maxPages);
        releasePreviews(singleDoc.current);
        singleDoc.current = doc;
        setPhase({ name: "working", label: "", fileName: doc.name, previewUrl: doc.kind === "image" ? doc.previews[0] : undefined });
        const response = await extract(doc, { page, docType: hintRef.current, signal: controller.signal });
        applyAllowance(response.allowance);
        const result = doc.note ? { ...response.result, notes: [doc.note, ...response.result.notes] } : response.result;
        setPhase({
          name: "result",
          result,
          preview: { kind: doc.kind, urls: doc.previews, name: doc.name },
          demo: response.demo,
        });
      } catch (error) {
        if (error instanceof ApiError && error.code === "email_required") {
          setPhase({ name: "idle" });
          setGate({ reason: error.gate ?? "limit", resume: () => void runSingle(files, asPages) });
          return;
        }
        fail(error);
      }
    },
    [page, applyAllowance, fail],
  );

  // ---- several documents ----------------------------------------------------
  const runBulk = useCallback(
    async (files: File[]) => {
      const limits = sessionRef.current;
      const batch = files.slice(0, limits.bulkMaxFiles);
      if (!limits.hasEmail) {
        track("gate", page, { reason: "bulk" });
        setGate({ reason: "bulk", resume: () => void runBulk(files) });
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const queue: BulkItem[] = batch.map((file, i) => ({ id: `${Date.now()}-${i}`, file, status: "queued" }));
      setItems(queue);
      setSelected(null);
      setPhase({ name: "bulk" });

      const patch = (id: string, change: Partial<BulkItem>) =>
        setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

      let stopMessage = "";
      for (const item of queue) {
        if (controller.signal.aborted) return;
        if (stopMessage) {
          patch(item.id, { status: "error", message: stopMessage });
          continue;
        }
        patch(item.id, { status: "working" });
        try {
          const prepared = await prepareFile(item.file, limits.maxUploadBytes, limits.maxPages);
          let response;
          for (let attempt = 0; ; attempt++) {
            try {
              response = await extract(prepared, { page, docType: hintRef.current, bulk: true, signal: controller.signal });
              break;
            } catch (error) {
              // The per-minute limit is there to stop scripts, not batches: wait and carry on.
              if (!(error instanceof ApiError && error.code === "slow_down") || attempt >= 8) throw error;
              patch(item.id, { message: "Pacing uploads..." });
              await new Promise((resolve) => setTimeout(resolve, 8000));
              if (controller.signal.aborted) return;
            }
          }
          applyAllowance(response.allowance);
          patch(item.id, {
            status: "done",
            prepared,
            result: response.result,
            preview: { kind: prepared.kind, urls: prepared.previews, name: prepared.name },
            doc: { docType: response.result.docType, fields: response.result.fields, tables: response.result.tables },
          });
          setSelected((current) => current ?? item.id);
        } catch (error) {
          if ((error as Error)?.name === "AbortError") return;
          const message =
            error instanceof ApiError || error instanceof PrepareError ? error.message : "This one couldn't be converted.";
          patch(item.id, { status: "error", message });
          if (error instanceof ApiError && ["daily_limit", "budget", "email_required", "not_configured"].includes(error.code)) {
            stopMessage = message;
          }
        }
      }
    },
    [page, applyAllowance],
  );

  const handleFiles = useCallback(
    (list: FileList | File[] | null) => {
      const all = Array.from(list ?? []);
      if (!all.length) return;
      const files = all.filter(isSupported);
      if (!files.length) {
        setPhase({ name: "error", message: "That file type isn't supported. Upload a PDF, JPG, PNG or WebP.", offerHelp: false });
        return;
      }
      if (files.length === 1) void runSingle(files, false);
      else if (files.every((file) => !isPdf(file)) && files.length <= sessionRef.current.maxPages) setPhase({ name: "choose", files });
      else void runBulk(files);
    },
    [runSingle, runBulk],
  );

  // Paste a screenshot or photo straight from the clipboard.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (phase.name !== "idle" && phase.name !== "error") return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) {
        event.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [phase.name, handleFiles]);

  async function runSample() {
    if (!sample) return;
    setPhase({ name: "working", label: "Loading the sample", fileName: `Sample ${sample.label}`, previewUrl: sample.image });
    try {
      const res = await fetch(`/samples/${sample.id}.json`);
      if (!res.ok) throw new Error("missing sample");
      const data = (await res.json()) as { result: ClientResult; generatedAt: string };
      track("sample", page, { sample: sample.id });
      setPhase({
        name: "result",
        result: data.result,
        preview: { kind: "image", urls: [sample.image], name: `sample-${sample.id}` },
        demo: false,
        banner: `Sample ${sample.label}. This is the converter's actual output for the document on the left, saved on ${data.generatedAt.slice(0, 10)} so it loads instantly. Upload your own to run it live.`,
      });
    } catch {
      setPhase({ name: "error", message: "The sample couldn't be loaded. Upload a document of your own instead.", offerHelp: false });
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  const ready = session?.ready ?? true;
  const selectedItem = items.find((item) => item.id === selected);
  const doneItems = items.filter((item) => item.status === "done" && item.doc);
  const bulkBusy = items.some((item) => item.status === "queued" || item.status === "working");

  function bulkSheets(): Sheet[] {
    const docs = doneItems.map((item) => ({ name: item.file.name, doc: item.doc! }));
    const used = new Set<string>(["summary", "all line items"]);
    const perDoc = docs
      .filter(({ doc }) => doc.tables[0]?.columns.length)
      .map(({ name, doc }, i) => {
        let sheetName = name.replace(/\.[^.]+$/, "").replace(/[\\/?*[\]:]/g, " ").slice(0, 28) || `Doc ${i + 1}`;
        while (used.has(sheetName.toLowerCase())) sheetName = `${sheetName.slice(0, 25)} ${i + 1}`;
        used.add(sheetName.toLowerCase());
        return { ...tableSheet(doc.tables[0]), name: sheetName };
      });
    const summary = summarySheet(docs.map((entry) => ({ ...entry, typeLabel: DOC_TYPES[entry.doc.docType].label })));
    return [summary, mergedSheet(docs), ...perDoc];
  }

  return (
    <div className="card overflow-hidden" id="tool">
      {/* ---------------------------------------------------------------- idle */}
      {phase.name === "idle" || phase.name === "error" || phase.name === "choose" ? (
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Document type">
            <span className="mr-1 text-sm font-medium text-muted">Document:</span>
            {(["auto", ...PICKER_TYPES] as DocTypeHint[]).map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={hint === id}
                onClick={() => setHint(id)}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  hint === id ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-2 hover:border-line-strong"
                }`}
              >
                {id === "auto" ? "Auto-detect" : id === "order_form" ? "Handwritten order" : DOC_TYPES[id].label}
              </button>
            ))}
          </div>

          {phase.name === "choose" ? (
            <div className="rounded-2xl border border-line bg-surface-2 p-6 text-center">
              <p className="text-lg font-semibold">You added {phase.files.length} photos. What are they?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn btn-primary" onClick={() => void runSingle(phase.files, true)}>
                  Pages of one document
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => void runBulk(phase.files)}>
                  {phase.files.length} separate documents
                </button>
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-2xl border-2 border-dashed px-4 py-9 text-center transition-colors sm:py-12 ${
                dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2/60"
              }`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <UploadIcon size={24} />
              </div>
              <p className="mt-3 text-lg font-semibold">Drop a PDF or photo here</p>
              <p className="mt-1 text-sm text-muted">Scans, phone photos and handwriting are fine. Add several files to convert them together.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => fileInput.current?.click()}>
                  <UploadIcon /> Choose a file
                </button>
                <button type="button" className="btn btn-secondary sm:hidden" disabled={!ready} onClick={() => cameraInput.current?.click()}>
                  <CameraIcon /> Take a photo
                </button>
                {sample ? (
                  <button type="button" className="btn btn-secondary" onClick={() => void runSample()}>
                    Try a sample {sample.label}
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                className="sr-only"
                aria-label="Upload a document"
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label="Take a photo of a document"
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <p className="mt-4 text-xs text-muted">PDF, JPG, PNG or WebP · up to {session?.maxPages ?? 10} pages · or paste a screenshot</p>
            </div>
          )}

          {!ready ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-flag-bg px-3 py-2 text-sm text-flag">
              <AlertIcon size={16} className="mt-0.5 shrink-0" /> The converter is being set up and isn't taking uploads yet. Please check back soon.
            </p>
          ) : null}

          {phase.name === "error" ? (
            <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-bg px-3 py-2.5 text-sm text-danger">
              <span className="flex items-start gap-2">
                <AlertIcon size={16} className="mt-0.5 shrink-0" /> {phase.message}
              </span>
              {phase.offerHelp ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openLead({ page, docType: hint, source: "limit" })}>
                  Have us run them <ArrowRightIcon size={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[0.8125rem] text-muted">
            <li className="flex items-center gap-1.5">
              <CheckIcon size={15} className="text-ok" />
              {session?.hasEmail
                ? `${session.remaining} conversion${session.remaining === 1 ? "" : "s"} left today`
                : session && session.remaining < session.freeLimit
                  ? `${session.remaining} of ${session.freeLimit} free conversions left, no sign-up`
                  : `First ${session?.freeLimit ?? 3} documents free, no sign-up`}
            </li>
            <li className="flex items-center gap-1.5">
              <ClockIcon size={15} /> Uploads are deleted within 24 hours
            </li>
            <li className="flex items-center gap-1.5">
              <LockIcon size={15} /> Never used for training or shown to anyone
            </li>
          </ul>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- working */}
      {phase.name === "working" ? (
        <Working label={phase.label} fileName={phase.fileName} previewUrl={phase.previewUrl} onCancel={reset} />
      ) : null}

      {/* -------------------------------------------------------------- result */}
      {phase.name === "result" ? (
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-ink-2">
              <FileIcon size={15} className="-mt-0.5 mr-1.5 inline" />
              {phase.preview?.name}
            </p>
            <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={reset}>
              Convert another
            </button>
          </div>
          <ResultView result={phase.result} preview={phase.preview} page={page} demo={phase.demo} banner={phase.banner} />
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- bulk */}
      {phase.name === "bulk" ? (
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-semibold">
              {bulkBusy ? (
                <>
                  <SpinnerIcon className="-mt-1 mr-2 inline text-accent" />
                  Converting {items.length} documents...
                </>
              ) : (
                `${doneItems.length} of ${items.length} documents converted`
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!doneItems.length}
                onClick={async () => {
                  await downloadXlsx(bulkSheets(), `documents-${doneItems.length}.xlsx`);
                  track("download", page, { format: "xlsx_bulk", docs: doneItems.length });
                }}
              >
                <DownloadIcon /> Download all (Excel)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!doneItems.length}
                onClick={() => {
                  downloadCsv(bulkSheets()[1], `documents-${doneItems.length}.csv`);
                  track("download", page, { format: "csv_bulk", docs: doneItems.length });
                }}
              >
                One CSV
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Start over
              </button>
            </div>
          </div>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={item.status !== "done"}
                  onClick={() => setSelected(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm ${
                    selected === item.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
                  } disabled:cursor-default`}
                >
                  <span className="shrink-0">
                    {item.status === "done" ? (
                      <CheckIcon size={16} className="text-ok" />
                    ) : item.status === "error" ? (
                      <AlertIcon size={16} className="text-danger" />
                    ) : item.status === "working" ? (
                      <SpinnerIcon size={16} className="text-accent" />
                    ) : (
                      <ClockIcon size={16} className="text-muted" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.file.name}</span>
                    <span className={`block truncate text-xs ${item.status === "error" ? "text-danger" : "text-muted"}`}>
                      {item.status === "done" && item.result
                        ? `${DOC_TYPES[item.result.docType].label} · ${item.doc?.tables[0]?.rows.length ?? 0} rows`
                        : item.status === "error"
                          ? item.message
                          : item.status === "working"
                            ? (item.message ?? "Reading...")
                            : "Waiting"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selectedItem?.result ? (
            <div className="mt-5 border-t border-line pt-5">
              <ResultView
                key={selectedItem.id}
                result={{ ...selectedItem.result, fields: selectedItem.doc!.fields, tables: selectedItem.doc!.tables }}
                preview={selectedItem.preview ?? null}
                page={page}
                embedded
                onDocChange={(doc) =>
                  setItems((current) => current.map((item) => (item.id === selectedItem.id ? { ...item, doc } : item)))
                }
              />
            </div>
          ) : null}

          {!bulkBusy && items.length >= 5 ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent bg-accent-soft px-4 py-3">
              <p className="text-sm text-ink-2">
                <span className="font-semibold text-ink">A stack like this every day?</span> We can take the whole pile: read, checked and
                delivered in your import format.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => openLead({ page, docType: hint, source: "bulk" })}>
                We'll do it for you <ArrowRightIcon size={15} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <EmailGate
        reason={gate?.reason ?? null}
        page={page}
        onClose={() => setGate(null)}
        onDone={(allowance) => {
          const resume = gate?.resume;
          setGate(null);
          const next = { ...sessionRef.current, ...(allowance ?? {}), hasEmail: true };
          sessionRef.current = next;
          setSession(next);
          resume?.();
        }}
      />
    </div>
  );
}
