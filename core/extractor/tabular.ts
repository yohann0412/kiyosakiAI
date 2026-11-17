import { needsFormulaGuard, parseDate, parseNumber } from "./normalize";
import type { DocTypeId, ExtractedField, ExtractedTable, ValueType } from "./types";

/**
 * Turn an extraction into spreadsheet-shaped data. Pure and dependency-free:
 * the browser uses it for downloads and other programs can use it too.
 */

export interface SheetCell {
  value: string;
  type: ValueType;
}

export interface Sheet {
  name: string;
  header: string[];
  rows: SheetCell[][];
}

/** The parts of a result that exports need (also the shape the editor holds). */
export interface TabularDoc {
  docType: DocTypeId;
  fields: ExtractedField[];
  tables: ExtractedTable[];
}

/**
 * Identifying fields repeated on every row of the "flat" layout, the shape
 * accounting and ERP imports expect (one row per line, document number on
 * each). Totals are left out on purpose: repeated totals get summed by mistake.
 */
const FLAT_KEYS: Record<DocTypeId, string[]> = {
  invoice: ["invoice_number", "invoice_date", "due_date", "po_number", "vendor_name", "customer_name", "currency"],
  packing_slip: ["packing_slip_number", "order_number", "po_number", "ship_date", "shipper_name", "ship_to_name", "carrier", "tracking_number"],
  bill_of_lading: ["bol_number", "ship_date", "shipper_name", "consignee_name", "carrier_name", "scac", "pro_number", "po_number"],
  purchase_order: ["po_number", "po_date", "buyer_name", "vendor_name", "delivery_date", "currency"],
  receipt: ["merchant_name", "date", "receipt_number", "payment_method", "currency"],
  order_form: ["order_number", "order_date", "customer_name", "delivery_date"],
  other: [],
};

export function flatFields(doc: TabularDoc): ExtractedField[] {
  const keys = FLAT_KEYS[doc.docType];
  if (!keys.length) return doc.fields.slice(0, 6);
  return keys.map((key) => doc.fields.find((f) => f.key === key)).filter((f): f is ExtractedField => Boolean(f));
}

function safeSheetName(name: string, used: Set<string>): string {
  // Excel: max 31 chars, none of \ / ? * [ ] :
  let base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n++}`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function tableSheet(table: ExtractedTable): Sheet {
  return {
    name: table.name,
    header: table.columns.map((c) => c.label),
    rows: table.rows.map((row) => table.columns.map((c, i) => ({ value: row[i] ?? "", type: c.type }))),
  };
}

export function detailsSheet(doc: TabularDoc): Sheet {
  return {
    name: "Details",
    header: ["Field", "Value"],
    rows: doc.fields.map((f) => [
      { value: f.label, type: "text" as const },
      { value: f.value, type: f.type },
    ]),
  };
}

/** One row per line item with the document's identifying fields repeated. */
export function flatSheet(doc: TabularDoc, tableIndex = 0): Sheet {
  const table = doc.tables[tableIndex];
  const lead = flatFields(doc);
  const header = [...lead.map((f) => f.label), ...(table?.columns.map((c) => c.label) ?? [])];
  const leadCells = lead.map((f) => ({ value: f.value, type: f.type }));
  const body = table?.rows.length
    ? table.rows.map((row) => [...leadCells, ...table.columns.map((c, i) => ({ value: row[i] ?? "", type: c.type }))])
    : lead.length
      ? [leadCells]
      : [];
  return { name: "Import-ready", header, rows: body };
}

/** Sheets for the Excel download: every table, then the details. */
export function workbookSheets(doc: TabularDoc): Sheet[] {
  const used = new Set<string>();
  const sheets: Sheet[] = [];
  for (const table of doc.tables) {
    if (!table.columns.length) continue;
    sheets.push({ ...tableSheet(table), name: safeSheetName(table.name, used) });
  }
  if (doc.fields.length) sheets.push({ ...detailsSheet(doc), name: safeSheetName("Details", used) });
  if (doc.fields.length && doc.tables[0]?.rows.length) {
    sheets.push({ ...flatSheet(doc), name: safeSheetName("Import-ready", used) });
  }
  if (!sheets.length) sheets.push({ name: "Sheet1", header: [], rows: [] });
  return sheets;
}

/**
 * Several documents in one sheet: a File column, the identifying fields, then
 * the union of all line-item columns (matched by key, so "Qty" on one invoice
 * and "Quantity" on another land in the same column).
 */
export function mergedSheet(docs: { name: string; doc: TabularDoc }[]): Sheet {
  const fieldCols: { key: string; label: string; type: ValueType }[] = [];
  const tableCols: { key: string; label: string; type: ValueType }[] = [];
  for (const { doc } of docs) {
    for (const f of flatFields(doc)) {
      if (!fieldCols.some((c) => c.key === f.key)) fieldCols.push({ key: f.key, label: f.label, type: f.type });
    }
    for (const c of doc.tables[0]?.columns ?? []) {
      if (!tableCols.some((x) => x.key === c.key)) tableCols.push({ key: c.key, label: c.label, type: c.type });
    }
  }
  const rows: SheetCell[][] = [];
  for (const { name, doc } of docs) {
    const table = doc.tables[0];
    const lead: SheetCell[] = [
      { value: name, type: "text" },
      ...fieldCols.map((c) => ({ value: doc.fields.find((f) => f.key === c.key)?.value ?? "", type: c.type })),
    ];
    const dataRows = table?.rows.length ? table.rows : [[]];
    for (const row of dataRows) {
      rows.push([
        ...lead,
        ...tableCols.map((c) => {
          const i = table?.columns.findIndex((x) => x.key === c.key) ?? -1;
          return { value: i >= 0 ? (row[i] ?? "") : "", type: c.type };
        }),
      ]);
    }
  }
  return {
    name: "All line items",
    header: ["File", ...fieldCols.map((c) => c.label), ...tableCols.map((c) => c.label)],
    rows,
  };
}

/**
 * Several documents, one row each: file name, type, then every header value
 * (matched by key). This is the shape an expense log or an AP register needs.
 */
export function summarySheet(docs: { name: string; doc: TabularDoc; typeLabel: string }[]): Sheet {
  const cols: { key: string; label: string; type: ValueType }[] = [];
  for (const { doc } of docs) {
    for (const f of doc.fields) {
      if (!cols.some((c) => c.key === f.key)) cols.push({ key: f.key, label: f.label, type: f.type });
    }
  }
  return {
    name: "Summary",
    header: ["File", "Type", ...cols.map((c) => c.label), "Line items"],
    rows: docs.map(({ name, doc, typeLabel }) => [
      { value: name, type: "text" as const },
      { value: typeLabel, type: "text" as const },
      ...cols.map((c) => ({ value: doc.fields.find((f) => f.key === c.key)?.value ?? "", type: c.type })),
      { value: String(doc.tables[0]?.rows.length ?? 0), type: "number" as const },
    ]),
  };
}

function csvEscape(text: string, delimiter: string): string {
  const guarded = needsFormulaGuard(text) ? `'${text}` : text;
  if (guarded.includes('"') || guarded.includes(delimiter) || /[\r\n]/.test(guarded) || /^\s|\s$/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** RFC 4180 CSV. Cells that look like formulas are neutralised. */
export function toCsv(sheet: Sheet, delimiter = ","): string {
  const lines = [sheet.header, ...sheet.rows.map((row) => row.map((cell) => cell.value))];
  return lines.map((line) => line.map((cell) => csvEscape(cell, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}

/** Tab-separated text for pasting into Google Sheets or Excel. */
export function toTsv(sheet: Sheet): string {
  const clean = (text: string) => (needsFormulaGuard(text) ? `'${text}` : text).replace(/[\t\r\n]+/g, " ");
  const lines = [sheet.header, ...sheet.rows.map((row) => row.map((cell) => cell.value))];
  return lines.map((line) => line.map(clean).join("\t")).join("\n");
}

/** Value for a real spreadsheet cell: numbers and dates become native types. */
export function nativeValue(cell: SheetCell): string | number | Date | null {
  if (cell.value === "") return null;
  if (cell.type === "number" || cell.type === "money") {
    const n = parseNumber(cell.value);
    return n === null ? cell.value : n;
  }
  if (cell.type === "date") {
    const iso = parseDate(cell.value);
    return iso ? new Date(`${iso}T00:00:00Z`) : cell.value;
  }
  return cell.value;
}

export function fileBaseName(doc: TabularDoc, fallback = "document"): string {
  const idKeys = ["invoice_number", "po_number", "bol_number", "packing_slip_number", "order_number", "receipt_number"];
  const id = idKeys.map((k) => doc.fields.find((f) => f.key === k)?.value).find(Boolean);
  const party =
    doc.fields.find((f) => ["vendor_name", "merchant_name", "shipper_name", "customer_name", "buyer_name"].includes(f.key))?.value ?? "";
  const parts = [doc.docType === "other" ? "" : doc.docType.replace(/_/g, "-"), party, id ?? ""]
    .map((p) => p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28))
    .filter(Boolean);
  return parts.join("_") || fallback;
}
