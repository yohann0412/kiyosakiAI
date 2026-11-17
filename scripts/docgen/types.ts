import type { DocTypeId } from "@/core/extractor/types";

/** How the document reaches the converter. */
export type Capture = "pdf" | "scan" | "fax" | "photo";

export type FontId = "inter" | "roboto" | "plex" | "serif" | "condensed" | "courier" | "mono";
export type HandId = "patrick" | "kalam" | "caveat" | "indie" | "gloria" | "shadows" | "reenie" | "nothing" | "homemade";

export interface Look {
  font: FontId;
  accent: string;
  /** Table ruling: full grid, row lines only, or none. */
  ruled: "full" | "rows" | "none";
  dateFmt: "us" | "long" | "iso" | "eu" | "dmy";
  moneyFmt: "us" | "plain" | "eu";
  /** Layout variant understood by the template. */
  layout?: string;
  /** Handwriting font for handwritten documents. */
  hand?: HandId;
  /** Ink colour for handwriting. */
  ink?: string;
}

export interface Effects {
  rotate?: number;
  blur?: number;
  noise?: number;
  quality?: number;
  /** Photo scene: tilt angles in degrees. */
  tiltX?: number;
  tiltY?: number;
  tiltZ?: number;
  /** 0..1: how washed out the print is (thermal fade). */
  fade?: number;
  desk?: "wood" | "dark" | "grey" | "cardboard";
  shadow?: boolean;
}

export interface ColumnDef {
  key: string;
  /** Header as printed. */
  label: string;
  align?: "r" | "c";
  /** Relative width hint. */
  w?: number;
}

/** A handwritten mark on top of a printed value (e.g. a corrected weight). */
export interface HandEdit {
  /** Row index in the main table. */
  row: number;
  column: string;
  /** The printed value that gets struck through. The expected value is the cell's. */
  printed: string;
}

export interface DocDef {
  id: string;
  docType: DocTypeId;
  capture: Capture;
  look: Look;
  effects?: Effects;
  difficulty: "easy" | "medium" | "hard";
  /** What makes this document interesting as a test. */
  about: string;
  /** Expected header values: catalog keys, normalized the way the extractor returns them. */
  fields: Record<string, string>;
  /** Printed label per field key, where the template's default label should be overridden. */
  labels?: Record<string, string>;
  /** Printed on the document but not scored (non-catalog details and distractors). */
  extras?: { label: string; value: string }[];
  /** Free text printed in the footer (terms, remit-to, thank-you lines). */
  footer?: string[];
  columns: ColumnDef[];
  /** Expected rows, normalized. */
  rows: string[][];
  /** Second table (the customer order section of a bill of lading). */
  secondary?: { name: string; columns: ColumnDef[]; rows: string[][] };
  /** Rows per page for long tables (forces a page break with a repeated header). */
  rowsPerPage?: number;
  /** Handwritten corrections over printed values. */
  handEdits?: HandEdit[];
  /** Handwritten order forms: rows written and then crossed out (not expected in the output). */
  struckRows?: { after: number; cells: string[] }[];
  /** Handwritten order forms: cells written as ditto marks (expected value is the cell's). */
  dittos?: { row: number; column: string }[];
  /** Fields written in by hand on an otherwise printed document (a tip and total on a receipt). */
  handFields?: string[];
  /** Printed empty rows on a form after the filled ones. */
  blankRows?: number;
}
