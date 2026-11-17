/**
 * Shared types for the document extractor.
 *
 * This file is dependency-free on purpose: browser code, the eval runner and
 * other programs (Demo Forge) all import it.
 */

export type DocTypeId =
  | "invoice"
  | "packing_slip"
  | "bill_of_lading"
  | "purchase_order"
  | "receipt"
  | "order_form"
  | "other";

/** What the caller thinks the document is. "auto" lets the model decide. */
export type DocTypeHint = DocTypeId | "auto";

export type ValueType = "text" | "number" | "money" | "date";

export interface FieldSpec {
  key: string;
  label: string;
  type: ValueType;
  /** Short note for the model on what belongs here. */
  hint?: string;
}

export interface ColumnSpec {
  key: string;
  label: string;
  type: ValueType;
  hint?: string;
}

export interface DocTypeSpec {
  id: DocTypeId;
  label: string;
  plural: string;
  /** Header-level values (one per document). */
  fields: FieldSpec[];
  /** Columns of the main line-item table. */
  columns: ColumnSpec[];
  /** Name of the main table as shown to users. */
  tableName: string;
  /** Type-specific reading guidance appended to the prompt. */
  guidance: string;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  type: ValueType;
  /** Set when the model was unsure or a check failed. */
  flag?: string;
}

export interface ExtractedColumn {
  key: string;
  /** Clean label used in exports. */
  label: string;
  /** Header text exactly as printed on the document, when there was one. */
  sourceLabel: string;
  type: ValueType;
}

export interface CellFlag {
  /** 0-based row index. */
  row: number;
  /** Column key. */
  column: string;
  reason: string;
  /** "check" when an arithmetic check raised it; absent when the model did. */
  source?: "check";
}

export interface ExtractedTable {
  id: string;
  name: string;
  columns: ExtractedColumn[];
  /** rows[r][c] lines up with columns[c]. Always strings; "" for empty. */
  rows: string[][];
  flags: CellFlag[];
}

export interface Check {
  id: string;
  ok: boolean;
  message: string;
}

export interface ExtractionUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ms: number;
}

export interface ExtractionResult {
  docType: DocTypeId;
  docTypeLabel: string;
  fields: ExtractedField[];
  /** tables[0] is the main line-item table (may have zero rows). */
  tables: ExtractedTable[];
  /** Arithmetic and consistency checks run in code, not by the model. */
  checks: Check[];
  /** Plain-language notes for the user (page cap hit, unreadable area, ...). */
  notes: string[];
  pages: number;
  /** True when the page cap or the output cap cut the document short. */
  truncated: boolean;
  usage: ExtractionUsage;
}

export interface DocumentInput {
  data: Uint8Array;
  /** application/pdf, image/jpeg, image/png, image/webp or image/gif */
  mediaType: string;
}

export interface ExtractOptions {
  /** One PDF, or one or more page images in reading order. */
  inputs: DocumentInput[];
  hint?: DocTypeHint;
  /** Hard page cap (cost control). Extra PDF pages are dropped and noted. */
  maxPages?: number;
  /** Override the configured provider ("anthropic" | "mock"). */
  provider?: string;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export type ExtractorErrorCode =
  | "not_configured"
  | "unsupported_file"
  | "unreadable_file"
  | "too_many_pages"
  | "refused"
  | "empty_result"
  | "provider_error"
  | "rate_limited"
  | "timeout";

export class ExtractorError extends Error {
  code: ExtractorErrorCode;
  /** Safe to show to an end user. */
  userMessage: string;
  constructor(code: ExtractorErrorCode, userMessage: string, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ExtractorError";
    this.code = code;
    this.userMessage = userMessage;
  }
}
