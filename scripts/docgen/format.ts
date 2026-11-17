import { DOC_TYPES } from "@/core/extractor/doctypes";
import type { DocTypeId, ValueType } from "@/core/extractor/types";
import type { Look } from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function group(intPart: string, sep: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** "1234.50" -> "$1,234.50" / "1,234.50" / "1.234,50 €" */
export function money(value: string, look: Look, symbol = true): string {
  if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return value;
  const negative = value.startsWith("-");
  const [int, dec = ""] = value.replace("-", "").split(".");
  let out: string;
  if (look.moneyFmt === "eu") out = `${group(int, ".")}${dec ? "," + dec : ""}${symbol ? " €" : ""}`;
  else out = `${symbol && look.moneyFmt === "us" ? "$" : ""}${group(int, ",")}${dec ? "." + dec : ""}`;
  return negative ? `-${out}` : out;
}

export function number(value: string, look: Look): string {
  if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return value;
  const [int, dec = ""] = value.split(".");
  if (look.moneyFmt === "eu") return `${group(int, ".")}${dec ? "," + dec : ""}`;
  return `${group(int, ",")}${dec ? "." + dec : ""}`;
}

/** "2026-11-03" -> the look's date format */
export function date(value: string, look: Look): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const [, y, mo, d] = m;
  switch (look.dateFmt) {
    case "us":
      return `${mo}/${d}/${y}`;
    case "long":
      return `${MONTHS[+mo - 1]} ${+d}, ${y}`;
    case "eu":
      return `${d}.${mo}.${y}`;
    case "dmy":
      return `${+d} ${MONTHS[+mo - 1].slice(0, 3)} ${y}`;
    default:
      return value;
  }
}

export function fieldType(docType: DocTypeId, key: string): ValueType {
  return DOC_TYPES[docType].fields.find((f) => f.key === key)?.type ?? "text";
}

export function columnType(docType: DocTypeId, key: string): ValueType {
  return DOC_TYPES[docType].columns.find((c) => c.key === key)?.type ?? "text";
}

export function show(value: string, type: ValueType, look: Look, symbol = true): string {
  if (type === "money") return money(value, look, symbol);
  if (type === "date") return date(value, look);
  if (type === "number") return number(value, look);
  return value;
}
