import { needsFormulaGuard } from "@/core/extractor/normalize";

/** A lead as stored and as written to leads/inbound.csv. */
export interface Lead {
  id: string;
  created_at: string;
  email: string;
  name: string;
  company: string;
  doc_type: string;
  volume: string;
  docs_per_day: number;
  current_process: string;
  notes: string;
  source_page: string;
  docs_converted: number;
  qualified: boolean;
  alerted: string;
}

export const LEAD_COLUMNS: (keyof Lead)[] = [
  "id",
  "created_at",
  "email",
  "name",
  "company",
  "doc_type",
  "volume",
  "docs_per_day",
  "current_process",
  "notes",
  "source_page",
  "docs_converted",
  "qualified",
  "alerted",
];

function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Leads are typed by strangers and opened in Excel: neutralise formulas.
  if (needsFormulaGuard(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const LEAD_CSV_HEADER = LEAD_COLUMNS.join(",") + "\n";

export function leadCsvRow(lead: Lead): string {
  return LEAD_COLUMNS.map((column) => cell(lead[column])).join(",") + "\n";
}
