import { DOC_TYPES, columnSpec, fieldSpec, isDocTypeId, labelFromKey, toKey } from "./doctypes";
import { cleanText, formatMoney, formatNumber, parseDate, parseNumber } from "./normalize";
import type { RawExtraction } from "./prompt";
import type {
  CellFlag,
  DocTypeHint,
  DocTypeId,
  ExtractedColumn,
  ExtractedField,
  ExtractedTable,
  ValueType,
} from "./types";

const VALUE_TYPES: ValueType[] = ["text", "number", "money", "date"];
const MAX_TABLES = 4;

function normalizeValue(raw: unknown, type: ValueType): string {
  const text = cleanText(raw);
  if (!text) return "";
  if (type === "number" || type === "money") {
    const n = parseNumber(text);
    if (n === null) return text;
    if (type === "money") return formatMoney(n);
    // Keep printed precision for plain numbers ("2.50" stays "2.50").
    const decimals = /[.,](\d+)\s*$/.exec(text.replace(/[^\d.,-]/g, ""))?.[1]?.length ?? 0;
    const looksDecimal = decimals > 0 && decimals !== 3;
    return looksDecimal ? n.toFixed(Math.min(decimals, 6)) : formatNumber(n, 6);
  }
  if (type === "date") return parseDate(text) ?? text;
  return text;
}

function uniqueKey(base: string, used: Set<string>): string {
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  used.add(key);
  return key;
}

export interface Processed {
  docType: DocTypeId;
  fields: ExtractedField[];
  tables: ExtractedTable[];
  notes: string[];
}

/**
 * Turn the model's raw JSON into the clean, typed result: canonical keys and
 * labels, rectangular tables, normalized numbers and dates, valid flags.
 */
export function postprocess(raw: RawExtraction, hint: DocTypeHint, opts: { truncated?: boolean } = {}): Processed {
  const docType: DocTypeId = isDocTypeId(raw.document_type)
    ? raw.document_type
    : hint !== "auto"
      ? hint
      : "other";
  const spec = DOC_TYPES[docType];

  // ---- fields -----------------------------------------------------------
  const usedFieldKeys = new Set<string>();
  const fieldFlags = new Map<string, string>();
  for (const item of raw.uncertain_fields ?? []) {
    const key = toKey(cleanText(item?.key));
    const reason = cleanText(item?.reason);
    if (key && reason) fieldFlags.set(key, reason);
  }

  const collected: ExtractedField[] = [];
  for (const item of raw.fields ?? []) {
    const rawKey = toKey(cleanText(item?.key) || cleanText(item?.label));
    if (!rawKey) continue;
    const known = fieldSpec(docType, rawKey);
    const type = known?.type ?? "text";
    const value = normalizeValue(item?.value, type);
    const flag = fieldFlags.get(rawKey);
    if (!value && !flag) continue;
    // A canonical key should appear once; a repeat is kept under a numbered key.
    const key = uniqueKey(rawKey, usedFieldKeys);
    collected.push({
      key,
      label: known && key === rawKey ? known.label : cleanText(item?.label) || labelFromKey(key),
      value,
      type,
      ...(flag ? { flag } : {}),
    });
  }
  // Canonical fields first, in catalog order; extras after, in document order.
  const order = new Map(spec.fields.map((x, i) => [x.key, i]));
  const fields = collected
    .map((field, i) => ({ field, rank: order.get(field.key) ?? 1000 + i }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.field);

  // ---- tables -----------------------------------------------------------
  const notes = (raw.notes ?? []).map(cleanText).filter(Boolean);
  const tables: ExtractedTable[] = [];
  const rawTables = (raw.tables ?? []).slice(0, MAX_TABLES);

  rawTables.forEach((rawTable, tableIndex) => {
    const isMain = tableIndex === 0;
    const usedColumnKeys = new Set<string>();
    const columns: ExtractedColumn[] = (rawTable?.columns ?? []).map((col, i) => {
      const sourceLabel = cleanText(col?.label);
      const rawKey = toKey(cleanText(col?.key) || sourceLabel || `column_${i + 1}`);
      const known = isMain ? columnSpec(docType, rawKey) : undefined;
      const key = uniqueKey(rawKey, usedColumnKeys);
      const declared = VALUE_TYPES.includes(col?.type as ValueType) ? (col?.type as ValueType) : "text";
      return {
        key,
        label: known && key === rawKey ? known.label : sourceLabel || labelFromKey(key),
        sourceLabel,
        type: known?.type ?? declared,
      };
    });
    if (!columns.length) return;

    let rows = (rawTable?.rows ?? [])
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => columns.map((col, c) => normalizeValue(row[c], col.type)));

    // A cut-off response can end in half a row; a partial row is worse than none.
    const rawRows = rawTable?.rows ?? [];
    const lastRaw = rawRows[rawRows.length - 1];
    if (opts.truncated && tableIndex === rawTables.length - 1 && Array.isArray(lastRaw) && lastRaw.length < columns.length) {
      rows = rows.slice(0, -1);
    }

    // Remember original row numbers so flags still point at the right row
    // after empty rows are dropped.
    const kept: { row: string[]; original: number }[] = [];
    rows.forEach((row, i) => {
      if (row.some((cell) => cell !== "")) kept.push({ row, original: i });
    });

    // Drop columns that are empty in every row (the model sometimes adds a
    // catalog column the document does not have).
    const keepColumn = columns.map((_, c) => kept.length === 0 || kept.some((k) => k.row[c] !== ""));
    const finalColumns = columns.filter((_, c) => keepColumn[c]);
    const finalRows = kept.map((k) => k.row.filter((_, c) => keepColumn[c]));
    if (!finalColumns.length) return;

    const rowIndexByOriginal = new Map(kept.map((k, i) => [k.original, i]));
    const columnKeys = new Set(finalColumns.map((c) => c.key));
    const flags: CellFlag[] = [];
    for (const item of raw.uncertain ?? []) {
      if ((item?.table ?? 0) !== tableIndex) continue;
      const row = rowIndexByOriginal.get((item?.row ?? 0) - 1);
      const column = toKey(cleanText(item?.column));
      const reason = cleanText(item?.reason);
      if (row === undefined || !columnKeys.has(column) || !reason) continue;
      flags.push({ row, column, reason });
    }

    tables.push({
      id: `t${tables.length + 1}`,
      name: isMain ? spec.tableName : cleanText(rawTable?.name) || `Table ${tables.length + 1}`,
      columns: finalColumns,
      rows: finalRows,
      flags,
    });
  });

  if (!tables.length) {
    tables.push({ id: "t1", name: spec.tableName, columns: [], rows: [], flags: [] });
  }

  return { docType, fields, tables, notes };
}
