"use client";

import { memo, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { labelFromKey, toKey } from "@/core/extractor/doctypes";
import type { CellFlag, ExtractedTable } from "@/core/extractor/types";
import { PlusIcon, TrashIcon, XIcon } from "./icons";

interface RowProps {
  r: number;
  row: string[];
  numeric: boolean[];
  widths: number[];
  /** Flag reason per column index, "" when not flagged. */
  flags: string[];
  onCell: (r: number, c: number, value: string) => void;
  onDelete: (r: number) => void;
  onFocusCell: (r: number, c: number) => void;
  onKey: (event: KeyboardEvent<HTMLInputElement>, r: number, c: number) => void;
}

const Row = memo(function Row({ r, row, numeric, widths, flags, onCell, onDelete, onFocusCell, onKey }: RowProps) {
  return (
    <tr className="group">
      <td className="rownum">
        <span className="group-hover:hidden group-focus-within:hidden">{r + 1}</span>
        <button
          type="button"
          onClick={() => onDelete(r)}
          aria-label={`Delete row ${r + 1}`}
          title="Delete row"
          className="hidden h-full w-full items-center justify-center py-1 text-muted hover:text-danger group-hover:flex group-focus-within:flex"
        >
          <TrashIcon size={13} />
        </button>
      </td>
      {row.map((cell, c) => (
        <td key={c}>
          <input
            className={`grid-cell ${numeric[c] ? "is-num" : ""} ${flags[c] ? "is-flag" : ""}`}
            style={{ width: `${widths[c]}ch` }}
            value={cell}
            data-cell={`${r}:${c}`}
            title={flags[c] || undefined}
            aria-label={`Row ${r + 1}, column ${c + 1}${flags[c] ? `. Check: ${flags[c]}` : ""}`}
            onChange={(event) => onCell(r, c, event.target.value)}
            onFocus={() => onFocusCell(r, c)}
            onKeyDown={(event) => onKey(event, r, c)}
            spellCheck={false}
            autoComplete="off"
          />
        </td>
      ))}
      <td className="border-r-0" />
    </tr>
  );
});

/**
 * Editable grid for one extracted table. Flagged cells (the model was unsure,
 * or the arithmetic does not work out) are tinted and explain themselves on
 * focus.
 */
export function TableEditor({
  table,
  extraFlags,
  onChange,
  onExplain,
}: {
  table: ExtractedTable;
  /** Flags computed live by the arithmetic checks. */
  extraFlags: CellFlag[];
  onChange: (table: ExtractedTable) => void;
  onExplain: (text: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef(table);
  tableRef.current = table;

  const numeric = useMemo(() => table.columns.map((c) => c.type === "number" || c.type === "money"), [table.columns]);

  const widths = useMemo(
    () =>
      table.columns.map((column, c) => {
        // Long header labels do not get to make a narrow column wide.
        let longest = Math.min(column.label.length, 13);
        for (const row of table.rows) longest = Math.max(longest, (row[c] ?? "").length);
        return Math.min(34, Math.max(5, longest + 1));
      }),
    // Recompute only when the shape changes, so columns do not jitter while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.columns.length, table.rows.length, table.id],
  );

  const flagGrid = useMemo(() => {
    const columnIndex = new Map(table.columns.map((c, i) => [c.key, i]));
    const grid = table.rows.map(() => table.columns.map(() => ""));
    for (const flag of [...table.flags, ...extraFlags]) {
      const c = columnIndex.get(flag.column);
      if (c === undefined || !grid[flag.row]) continue;
      grid[flag.row][c] = grid[flag.row][c] ? `${grid[flag.row][c]}; ${flag.reason}` : flag.reason;
    }
    return grid;
  }, [table.columns, table.rows, table.flags, extraFlags]);

  const flagGridRef = useRef(flagGrid);
  flagGridRef.current = flagGrid;
  const focused = useRef<{ r: number; c: number } | null>(null);

  // Keep the explanation in step with the focused cell as flags come and go
  // (a cell can become flagged, or cleared, while the user is typing in it).
  useEffect(() => {
    const at = focused.current;
    if (!at) return;
    const reason = flagGrid[at.r]?.[at.c];
    const column = table.columns[at.c];
    onExplain(reason && column ? `Row ${at.r + 1} · ${column.label}: ${reason}` : null);
  }, [flagGrid, table.columns, onExplain]);

  const onCell = useCallback(
    (r: number, c: number, value: string) => {
      const current = tableRef.current;
      const rows = current.rows.slice();
      rows[r] = rows[r].slice();
      rows[r][c] = value;
      // Editing a cell the model was unsure about counts as reviewing it.
      const key = current.columns[c].key;
      const flags = current.flags.filter((f) => !(f.row === r && f.column === key));
      onChange({ ...current, rows, flags });
    },
    [onChange],
  );

  const onDelete = useCallback(
    (r: number) => {
      const current = tableRef.current;
      onChange({
        ...current,
        rows: current.rows.filter((_, i) => i !== r),
        flags: current.flags.filter((f) => f.row !== r).map((f) => (f.row > r ? { ...f, row: f.row - 1 } : f)),
      });
    },
    [onChange],
  );

  const onFocusCell = useCallback(
    (r: number, c: number) => {
      focused.current = { r, c };
      const reason = flagGridRef.current[r]?.[c];
      const column = tableRef.current.columns[c];
      onExplain(reason ? `Row ${r + 1} · ${column.label}: ${reason}` : null);
    },
    [onExplain],
  );

  const focusCell = (r: number, c: number) => {
    const input = wrapRef.current?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`);
    if (input) {
      input.focus();
      input.select();
    }
  };

  const onKey = useCallback((event: KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const last = tableRef.current.rows.length - 1;
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(Math.min(last, r + 1), c);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(Math.max(0, r - 1), c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addRow() {
    onChange({ ...table, rows: [...table.rows, table.columns.map(() => "")] });
    setTimeout(() => focusCell(table.rows.length, 0), 30);
  }

  function addColumn() {
    const used = new Set(table.columns.map((c) => c.key));
    let n = table.columns.length + 1;
    let key = `column_${n}`;
    while (used.has(key)) key = `column_${++n}`;
    onChange({
      ...table,
      columns: [...table.columns, { key, label: labelFromKey(key), sourceLabel: "", type: "text" }],
      rows: table.rows.map((row) => [...row, ""]),
    });
  }

  function renameColumn(c: number, label: string) {
    const columns = table.columns.slice();
    columns[c] = { ...columns[c], label };
    onChange({ ...table, columns });
  }

  function deleteColumn(c: number) {
    const key = table.columns[c].key;
    onChange({
      ...table,
      columns: table.columns.filter((_, i) => i !== c),
      rows: table.rows.map((row) => row.filter((_, i) => i !== c)),
      flags: table.flags.filter((f) => f.column !== key),
    });
  }

  if (!table.columns.length) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-6 text-sm text-muted">
        No table was found on this document. The values that were read are under Details.
        <div className="mt-3">
          <button type="button" className="btn btn-secondary btn-sm" onClick={addColumn}>
            <PlusIcon size={14} /> Start a table
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div ref={wrapRef} className="max-h-[62vh] overflow-auto rounded-xl border border-line bg-surface">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="rownum" />
              {table.columns.map((column, c) => (
                <th key={column.key}>
                  <div className="group/col relative flex items-center">
                    <input
                      className={`grid-cell font-semibold ${numeric[c] ? "is-num" : ""}`}
                      style={{ width: `${widths[c]}ch` }}
                      value={column.label}
                      title={column.label}
                      aria-label={`Column ${c + 1} name`}
                      onChange={(event) => renameColumn(c, event.target.value)}
                      onBlur={(event) => {
                        if (!event.target.value.trim()) renameColumn(c, labelFromKey(toKey(column.key)));
                      }}
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => deleteColumn(c)}
                      aria-label={`Delete column ${column.label}`}
                      title="Delete column"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-surface-2 p-0.5 text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover/col:opacity-100"
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="border-r-0 px-1">
                <button
                  type="button"
                  onClick={addColumn}
                  aria-label="Add column"
                  title="Add column"
                  className="rounded p-1 text-muted hover:bg-surface hover:text-ink"
                >
                  <PlusIcon size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <Row
                key={r}
                r={r}
                row={row}
                numeric={numeric}
                widths={widths}
                flags={flagGrid[r]}
                onCell={onCell}
                onDelete={onDelete}
                onFocusCell={onFocusCell}
                onKey={onKey}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
          <PlusIcon size={14} /> Add row
        </button>
      </div>
    </div>
  );
}
