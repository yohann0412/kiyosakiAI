import fs from "node:fs";
import path from "node:path";
import { fill, type Block, type ToolPage } from "@/content/pages";
import { DOC_TYPES } from "@/core/extractor/doctypes";
import type { DocTypeId, ExtractionResult } from "@/core/extractor/types";
import { Inline } from "./Inline";

interface SampleFile {
  generatedAt: string;
  model: string;
  result: Omit<ExtractionResult, "usage">;
}

/** The saved, real converter output for a sample document, if it exists. */
export function loadSample(id: string): SampleFile | null {
  try {
    const file = path.join(process.cwd(), "public", "samples", `${id}.json`);
    return JSON.parse(fs.readFileSync(file, "utf8")) as SampleFile;
  } catch {
    return null;
  }
}

function Catalog({ docType, intro }: { docType: DocTypeId; intro?: string }) {
  const spec = DOC_TYPES[docType];
  return (
    <>
      {intro ? (
        <p>
          <Inline text={fill(intro)} />
        </p>
      ) : null}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="!mt-0 text-sm font-semibold uppercase tracking-wide text-muted">Details (one per document)</h3>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[0.9375rem] sm:grid-cols-2">
            {spec.fields.map((field) => (
              <li key={field.key} className="text-ink-2">
                {field.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="!mt-0 text-sm font-semibold uppercase tracking-wide text-muted">{spec.tableName} (one row each)</h3>
          <ul className="mt-3 space-y-1.5 text-[0.9375rem]">
            {spec.columns.map((column) => (
              <li key={column.key} className="text-ink-2">
                <span className="font-medium text-ink">{column.label}</span>
                {column.hint ? <span className="text-muted"> - {column.hint}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Example({ page, intro }: { page: ToolPage; intro?: string }) {
  if (!page.sample) return null;
  const sample = loadSample(page.sample.id);
  if (!sample) return null;
  const table = sample.result.tables[0];
  const shown = table?.rows.slice(0, 8) ?? [];
  return (
    <>
      {intro ? (
        <p>
          <Inline text={fill(intro)} />
        </p>
      ) : null}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/samples/${page.sample.id}.jpg`}
            alt={`Sample ${page.sample.label} used as the input`}
            loading="lazy"
            className="max-h-[30rem] w-full object-contain object-top"
          />
          <figcaption className="border-t border-line px-4 py-2 text-xs text-muted">Input: a sample {page.sample.label} (made-up company and figures)</figcaption>
        </figure>
        <div className="min-w-0 space-y-4">
          {table?.columns.length ? (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-max border-collapse text-[0.8125rem] tabular-nums">
                <thead>
                  <tr className="bg-surface-2 text-left">
                    {table.columns.map((column) => (
                      <th key={column.key} className="border-b border-line px-3 py-2 font-semibold">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row, r) => (
                    <tr key={r} className="border-b border-line last:border-0">
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className={`px-3 py-1.5 text-ink-2 ${table.columns[c].type === "money" || table.columns[c].type === "number" ? "text-right" : ""}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.rows.length > shown.length ? (
                <p className="border-t border-line px-3 py-2 text-xs text-muted">
                  First {shown.length} of {table.rows.length} rows shown.
                </p>
              ) : null}
            </div>
          ) : null}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-2xl border border-line bg-surface p-4 text-[0.8125rem] sm:grid-cols-2">
            {sample.result.fields.slice(0, 10).map((field) => (
              <div key={field.key} className="flex justify-between gap-3 border-b border-line/60 py-1 last:border-0">
                <dt className="text-muted">{field.label}</dt>
                <dd className="truncate text-right font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
          {sample.result.checks.length ? (
            <ul className="space-y-1 text-[0.8125rem] text-ink-2">
              {sample.result.checks.map((check) => (
                <li key={check.id}>
                  {check.ok ? "✓" : "!"} {check.message}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted">
            Output: produced by this converter on {sample.generatedAt.slice(0, 10)}, unedited. Use "Try a sample {page.sample.label}" in the tool above to open it in
            the editor.
          </p>
        </div>
      </div>
    </>
  );
}

export function PageBlock({ block, page }: { block: Block; page: ToolPage }) {
  if (block.kind === "example") {
    if (!page.sample || !loadSample(page.sample.id)) return null;
  }
  return (
    <section className="prose-page container-page mt-14">
      <h2>{fill(block.heading)}</h2>
      <div className="mt-4 max-w-none">
        {block.kind === "prose"
          ? block.paragraphs.map((paragraph, i) => (
              <p key={i} className="max-w-3xl">
                <Inline text={fill(paragraph)} />
              </p>
            ))
          : null}

        {block.kind === "list" ? (
          <>
            {block.intro ? (
              <p className="max-w-3xl">
                <Inline text={fill(block.intro)} />
              </p>
            ) : null}
            <ul className="mt-4 grid max-w-4xl gap-x-8 gap-y-3 md:grid-cols-2">
              {block.items.map((item, i) => (
                <li key={i} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">
                  {item.title ? <strong className="font-semibold text-ink">{item.title}. </strong> : null}
                  <Inline text={fill(item.text)} />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {block.kind === "steps" ? (
          <ol className="mt-2 grid gap-4 md:grid-cols-3">
            {block.steps.map((step, i) => (
              <li key={i} className="rounded-2xl border border-line bg-surface p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
                <h3 className="!mt-3">{fill(step.title)}</h3>
                <p className="mt-1 text-[0.9375rem]">
                  <Inline text={fill(step.text)} />
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        {block.kind === "catalog" ? (
          <Catalog docType={block.docType ?? (page.docType === "auto" ? "other" : page.docType)} intro={block.intro} />
        ) : null}

        {block.kind === "table" ? (
          <>
            {block.intro ? (
              <p className="max-w-3xl">
                <Inline text={fill(block.intro)} />
              </p>
            ) : null}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-max border-collapse text-[0.8125rem] tabular-nums">
                <thead>
                  <tr className="bg-surface-2 text-left">
                    {block.columns.map((column) => (
                      <th key={column} className="border-b border-line px-3 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r} className="border-b border-line last:border-0">
                      {row.map((cell, c) => (
                        <td key={c} className="px-3 py-1.5 text-ink-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {block.note ? <p className="mt-3 text-sm text-muted">{fill(block.note)}</p> : null}
          </>
        ) : null}

        {block.kind === "example" ? <Example page={page} intro={block.intro} /> : null}
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="prose-page container-page mt-14">
      <h2>Questions people ask</h2>
      <div className="mt-4 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-surface">
        {items.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {fill(item.q)}
              <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2">
              <Inline text={fill(item.a)} />
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Strip inline markup for JSON-LD answers. */
export function plain(text: string): string {
  return fill(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
