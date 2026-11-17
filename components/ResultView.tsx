"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tuning } from "@/content/tuning";
import { runChecks } from "@/core/extractor/checks";
import { DOC_TYPES } from "@/core/extractor/doctypes";
import { detailsSheet, fileBaseName, flatSheet, tableSheet, workbookSheets, type TabularDoc } from "@/core/extractor/tabular";
import type { CellFlag, ExtractedField, ExtractedTable } from "@/core/extractor/types";
import { track, type ClientResult } from "@/lib/client/api";
import { copyForSheets, downloadCsv, downloadXlsx } from "@/lib/client/export";
import { FieldsEditor } from "./FieldsEditor";
import { TableEditor } from "./TableEditor";
import { AlertIcon, ArrowRightIcon, CheckIcon, ChevronDownIcon, CopyIcon, DownloadIcon } from "./icons";
import { openLead } from "./lead";

export interface PreviewSource {
  kind: "pdf" | "image";
  urls: string[];
  name: string;
}

/** Model flags only: arithmetic flags are recomputed live as the user edits. */
function withoutCheckFlags(tables: ExtractedTable[]): ExtractedTable[] {
  return tables.map((table) => ({ ...table, flags: table.flags.filter((flag) => flag.source !== "check") }));
}

function Preview({ source }: { source: PreviewSource }) {
  const [zoom, setZoom] = useState(false);
  if (source.kind === "pdf") {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
        <iframe src={`${source.urls[0]}#toolbar=0&navpanes=0`} title={`Preview of ${source.name}`} className="h-[62vh] w-full" />
      </div>
    );
  }
  return (
    <div className="max-h-[62vh] overflow-auto rounded-xl border border-line bg-surface-2">
      {source.urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={`${source.name}, page ${i + 1}`}
          onClick={() => setZoom((z) => !z)}
          className={`block ${zoom ? "w-[200%] max-w-none cursor-zoom-out" : "w-full cursor-zoom-in"}`}
        />
      ))}
    </div>
  );
}

export function ResultView({
  result,
  preview,
  page,
  demo,
  banner,
  onDocChange,
  embedded,
}: {
  result: ClientResult;
  preview: PreviewSource | null;
  page: string;
  demo?: boolean;
  /** Extra line above the result (for example, the sample notice). */
  banner?: string;
  /** Reports edits upward (bulk mode keeps them for the merged export). */
  onDocChange?: (doc: TabularDoc) => void;
  /** Inside the bulk view: no lead prompt of its own. */
  embedded?: boolean;
}) {
  const [fields, setFields] = useState<ExtractedField[]>(result.fields);
  const [tables, setTables] = useState<ExtractedTable[]>(() => withoutCheckFlags(result.tables));
  const [tab, setTab] = useState<string>(() => (result.tables[0]?.rows.length ? result.tables[0].id : "details"));
  const [explain, setExplain] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const doc: TabularDoc = useMemo(() => ({ docType: result.docType, fields, tables }), [result.docType, fields, tables]);

  // Report edits upward. The callback is held in a ref so that a parent passing
  // a new function on every render cannot start a render loop.
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  useEffect(() => {
    onDocChangeRef.current?.(doc);
  }, [doc]);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  // The arithmetic is re-checked on every edit, so fixing a number clears its warning.
  const { checks, checkFlags } = useMemo(() => {
    const scratch = tables.map((table) => ({ ...table, flags: table.flags.slice() }));
    const computed = runChecks(fields, scratch);
    const flags: CellFlag[] = (scratch[0]?.flags ?? []).filter((flag) => flag.source === "check");
    return { checks: computed, checkFlags: flags };
  }, [fields, tables]);

  const flagCount =
    tables.reduce((n, table) => n + table.flags.length, 0) + checkFlags.length + fields.filter((f) => f.flag).length;
  const activeTable = tables.find((table) => table.id === tab);
  const baseName = fileBaseName(doc, preview?.name.replace(/\.[^.]+$/, "") || "document");
  const typeLabel = DOC_TYPES[result.docType].label;

  function afterExport(format: string) {
    track(format === "copy" ? "copy" : "download", page, { format, docType: result.docType });
    setDownloaded(true);
    setMenu(false);
  }

  async function excel() {
    await downloadXlsx(workbookSheets(doc), `${baseName}.xlsx`);
    afterExport("xlsx");
  }

  function csv(kind: "table" | "flat" | "details") {
    const sheet = kind === "flat" ? flatSheet(doc) : kind === "details" ? detailsSheet(doc) : tableSheet(activeTable ?? tables[0]);
    const suffix = kind === "flat" ? "_import-ready" : kind === "details" ? "_details" : "";
    downloadCsv(sheet, `${baseName}${suffix}.csv`);
    afterExport(`csv_${kind}`);
  }

  async function copy() {
    const sheet = tab === "details" ? detailsSheet(doc) : tableSheet(activeTable ?? tables[0]);
    if (await copyForSheets(sheet)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      afterExport("copy");
    }
  }

  const hasRows = tables.some((table) => table.rows.length > 0);

  return (
    <div className="animate-rise">
      {demo ? (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-flag-bg px-3 py-2 text-sm text-flag">
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          Demo mode: this is sample data, not a reading of your file. The live converter is not switched on in this environment.
        </p>
      ) : null}
      {banner ? <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink-2">{banner}</p> : null}

      {/* Summary and exports */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-semibold text-ink">{typeLabel}</span>
            <span>
              {tables[0]?.rows.length ?? 0} row{tables[0]?.rows.length === 1 ? "" : "s"} · {fields.length} detail
              {fields.length === 1 ? "" : "s"}
              {result.pages > 1 ? ` · ${result.pages} pages` : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary" onClick={excel}>
            <DownloadIcon /> <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">Download Excel</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button type="button" className="btn btn-secondary" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              CSV <ChevronDownIcon size={15} />
            </button>
            {menu ? (
              <div role="menu" className="absolute right-0 z-20 mt-1.5 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
                <button type="button" role="menuitem" disabled={!hasRows} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50" onClick={() => csv("table")}>
                  <span className="block text-sm font-semibold">{activeTable?.name ?? tables[0]?.name ?? "Table"} (.csv)</span>
                  <span className="block text-xs text-muted">The table exactly as shown</span>
                </button>
                <button type="button" role="menuitem" disabled={!hasRows} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50" onClick={() => csv("flat")}>
                  <span className="block text-sm font-semibold">Import-ready (.csv)</span>
                  <span className="block text-xs text-muted">One row per line, with the document number, date and parties repeated on each</span>
                </button>
                <button type="button" role="menuitem" disabled={!fields.length} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50" onClick={() => csv("details")}>
                  <span className="block text-sm font-semibold">Details (.csv)</span>
                  <span className="block text-xs text-muted">Numbers, dates, parties and totals</span>
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn btn-secondary" onClick={copy} title="Copy, then paste into Google Sheets or Excel">
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Checks and notes */}
      {checks.length || result.notes.length || flagCount ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem]">
          {checks.map((check) => (
            <li key={check.id} className={`flex items-start gap-1.5 ${check.ok ? "text-ink-2" : "font-medium text-flag"}`}>
              {check.ok ? <CheckIcon size={15} className="mt-0.5 shrink-0 text-ok" /> : <AlertIcon size={15} className="mt-0.5 shrink-0" />}
              {check.message}
            </li>
          ))}
          {flagCount ? (
            <li className="flex items-start gap-1.5 font-medium text-flag">
              <AlertIcon size={15} className="mt-0.5 shrink-0" />
              {flagCount} value{flagCount === 1 ? "" : "s"} to double-check (highlighted)
            </li>
          ) : null}
          {result.notes.map((note) => (
            <li key={note} className="flex items-start gap-1.5 text-ink-2">
              <AlertIcon size={15} className="mt-0.5 shrink-0 text-muted" />
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Document and data, side by side */}
      <div className={`mt-4 grid gap-4 ${preview && showPreview ? "lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]" : ""}`}>
        {preview && showPreview ? (
          <div className="min-w-0">
            <Preview source={preview} />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1" role="tablist">
            {tables
              .filter((table) => table.columns.length || table === tables[0])
              .map((table) => (
                <button
                  key={table.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === table.id}
                  onClick={() => setTab(table.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === table.id ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"}`}
                >
                  {table.name} <span className="font-normal opacity-70">{table.rows.length}</span>
                </button>
              ))}
            <button
              type="button"
              role="tab"
              aria-selected={tab === "details"}
              onClick={() => setTab("details")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "details" ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"}`}
            >
              Details <span className="font-normal opacity-70">{fields.length}</span>
            </button>
            {preview ? (
              <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Hide document" : "Show document"}
              </button>
            ) : null}
          </div>

          {tab === "details" ? (
            <FieldsEditor fields={fields} onChange={setFields} />
          ) : activeTable ? (
            <TableEditor
              key={activeTable.id}
              table={activeTable}
              extraFlags={activeTable === tables[0] ? checkFlags : []}
              onChange={(next) => setTables((current) => current.map((table) => (table.id === next.id ? next : table)))}
              onExplain={setExplain}
            />
          ) : null}

          <p className="mt-1 min-h-5 text-xs text-flag" aria-live="polite">
            {tab !== "details" ? explain : null}
          </p>
          <p className="text-xs text-muted">Click any cell to correct it. Your edits are included in the download.</p>
        </div>
      </div>

      {/* The offer, at the moment the tool has just proved itself */}
      {!embedded ? (
        <div
          className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            downloaded ? "border-accent bg-accent-soft" : "border-line bg-surface-2"
          }`}
        >
          <p className="text-sm text-ink-2">
            <span className="font-semibold text-ink">{tuning.cta.heading}</span> {tuning.cta.body}
          </p>
          <button
            type="button"
            className={`btn ${downloaded ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => openLead({ page, docType: result.docType, source: "result" })}
          >
            {tuning.cta.button} <ArrowRightIcon size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
