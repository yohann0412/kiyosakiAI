"use client";

import type { ExtractedField } from "@/core/extractor/types";
import { XIcon } from "./icons";

/** Editable list of the document's header values. */
export function FieldsEditor({
  fields,
  onChange,
}: {
  fields: ExtractedField[];
  onChange: (fields: ExtractedField[]) => void;
}) {
  if (!fields.length) {
    return <p className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">No header values were found on this document.</p>;
  }

  function update(i: number, value: string) {
    const next = fields.slice();
    // Editing a flagged value counts as reviewing it.
    const { flag: _flag, ...rest } = next[i];
    next[i] = { ...rest, value };
    onChange(next);
  }

  return (
    <div className="max-h-[62vh] overflow-auto rounded-xl border border-line bg-surface">
      <dl className="divide-y divide-line text-[0.8125rem]">
        {fields.map((field, i) => {
          const numeric = field.type === "money" || field.type === "number";
          return (
            <div key={field.key} className="group grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-stretch">
              <dt className="flex items-center bg-surface-2 px-3 py-2 font-semibold text-ink-2">{field.label}</dt>
              <dd className="min-w-0">
                <input
                  className={`grid-cell box-border h-full ${field.flag ? "is-flag" : ""} ${numeric ? "tabular-nums" : ""}`}
                  value={field.value}
                  aria-label={field.label}
                  title={field.flag || undefined}
                  onChange={(event) => update(i, event.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                {field.flag ? <p className="bg-flag-bg px-3 pb-1.5 text-xs text-flag">Check: {field.flag}</p> : null}
              </dd>
              <button
                type="button"
                onClick={() => onChange(fields.filter((_, index) => index !== i))}
                aria-label={`Remove ${field.label}`}
                title="Remove"
                className="px-2 text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
              >
                <XIcon size={13} />
              </button>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
