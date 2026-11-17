/**
 * Shared pieces of the eval tooling: the seal over eval/ and the scorer.
 * This file lives outside eval/ on purpose: the agent may improve how results
 * are reported, but the golden documents and their expected values are frozen.
 * Changing the scoring rules changes what the accuracy number means, so any
 * change here must be logged in lab_notebook.md and results.tsv with a
 * before/after on the same extractor.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DOC_TYPES } from "@/core/extractor/doctypes";
import { cleanText, parseDate, parseNumber } from "@/core/extractor/normalize";
import type { DocTypeId, ExtractionResult, ExtractedTable, ValueType } from "@/core/extractor/types";

const EVAL_ROOT = path.join(process.cwd(), "eval");
const MANIFEST = path.join(EVAL_ROOT, "MANIFEST.sha256");
/** Hash of the manifest itself, kept outside eval/ so a quiet edit of both is harder to miss. */
const LOCK = path.join(process.cwd(), "scripts", "eval-manifest.lock");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (full !== MANIFEST) out.push(full);
  }
  return out;
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function currentManifest(): string {
  return walk(EVAL_ROOT)
    .map((file) => `${sha256(fs.readFileSync(file))}  ${path.relative(EVAL_ROOT, file).split(path.sep).join("/")}`)
    .sort((a, b) => a.slice(66).localeCompare(b.slice(66)))
    .join("\n");
}

/** Write the seal. Only the bootstrap and a human-run reseal call this. */
export function sealEval(): number {
  const manifest = currentManifest();
  fs.writeFileSync(MANIFEST, manifest + "\n");
  fs.writeFileSync(LOCK, sha256(manifest + "\n") + "\n");
  return manifest.split("\n").length;
}

export interface GuardReport {
  ok: boolean;
  problems: string[];
  files: number;
}

/** Has anything under eval/ changed since it was sealed? */
export function checkEvalSeal(): GuardReport {
  if (!fs.existsSync(MANIFEST)) return { ok: false, problems: ["eval/MANIFEST.sha256 is missing: the golden set has not been sealed"], files: 0 };
  const sealed = fs.readFileSync(MANIFEST, "utf8");
  const problems: string[] = [];
  if (!fs.existsSync(LOCK) || fs.readFileSync(LOCK, "utf8").trim() !== sha256(sealed)) {
    problems.push("eval/MANIFEST.sha256 does not match scripts/eval-manifest.lock (the manifest itself was changed)");
  }
  const before = new Map(sealed.trim().split("\n").map((line) => [line.slice(66), line.slice(0, 64)]));
  const after = new Map(currentManifest().split("\n").map((line) => [line.slice(66), line.slice(0, 64)]));
  for (const [file, hash] of before) {
    if (!after.has(file)) problems.push(`deleted: eval/${file}`);
    else if (after.get(file) !== hash) problems.push(`modified: eval/${file}`);
  }
  for (const file of after.keys()) if (!before.has(file)) problems.push(`added: eval/${file}`);
  return { ok: problems.length === 0, problems, files: before.size };
}

// ---------------------------------------------------------------- golden set

export interface GoldenDoc {
  id: string;
  docType: DocTypeId;
  capture: string;
  difficulty: string;
  about: string;
  files: string[];
  fields: Record<string, string>;
  tables: { name: string; columns: { key: string; label: string }[]; rows: string[][] }[];
  dir: string;
}

export function loadGolden(): GoldenDoc[] {
  const dir = path.join(EVAL_ROOT, "golden_docs");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, "expected.json")))
    .map((entry) => ({ ...JSON.parse(fs.readFileSync(path.join(dir, entry.name, "expected.json"), "utf8")), dir: path.join(dir, entry.name) }) as GoldenDoc)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function mediaTypeOf(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

// -------------------------------------------------------------------- scorer

/** Text compared without regard to case, spacing or separating punctuation. */
function textKey(value: string): string {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[\s,;:'"`()]/g, "");
}

function timeKey(value: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?m?\.?$/i.exec(cleanText(value));
  if (!m) return textKey(value);
  let hour = Number(m[1]);
  if (m[3]?.toLowerCase() === "p" && hour < 12) hour += 12;
  if (m[3]?.toLowerCase() === "a" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${m[2]}`;
}

const CURRENCY: Record<string, string> = { "€": "eur", $: "usd", "us$": "usd", "£": "gbp" };

/** Is `actual` an acceptable reading of `expected`? */
export function valuesMatch(expected: string, actual: string, type: ValueType, key = ""): boolean {
  const e = cleanText(expected);
  const a = cleanText(actual);
  if (e === "") return a === "";
  if (a === "") return false;

  if (type === "money" || type === "number") {
    const en = parseNumber(e);
    const an = parseNumber(a);
    if (en !== null) return an !== null && Math.abs(en - an) < 0.005;
  }
  if (type === "date") {
    const ed = parseDate(e);
    if (ed) return parseDate(a) === ed;
  }
  if (key === "time") return timeKey(e) === timeKey(a);
  if (key === "card_last4") return a.replace(/\D/g, "").slice(-4) === e;
  if (key.endsWith("phone")) return a.replace(/\D/g, "").endsWith(e.replace(/\D/g, ""));
  if (key === "currency") {
    const norm = (v: string) => CURRENCY[v.toLowerCase()] ?? v.toLowerCase();
    return norm(e) === norm(a);
  }
  if (key === "freight_terms") {
    const norm = (v: string) => textKey(v).replace("third", "3rd").replace("-", "");
    return norm(e) === norm(a);
  }
  if (key === "po_number" && e.includes(",")) {
    const set = (v: string) => v.split(/[,;/]|\band\b/).map(textKey).filter(Boolean).sort().join("|");
    return set(e) === set(a);
  }
  // "214 lb" against "214" or "214 lbs": the number has to be right, the unit is not scored.
  const quantity = /^(-?[\d.,]+)\s*[a-z]{1,4}\.?$/i.exec(e);
  if (quantity) {
    const en = parseNumber(quantity[1]);
    const an = parseNumber(/^[^\d-]*(-?[\d.,]+)/.exec(a)?.[1] ?? "");
    return en !== null && an !== null && Math.abs(en - an) < 0.005;
  }
  return textKey(e) === textKey(a);
}

export interface Mismatch {
  where: string;
  expected: string;
  actual: string;
}

export interface DocScore {
  id: string;
  docType: DocTypeId;
  capture: string;
  difficulty: string;
  typeCorrect: boolean;
  fieldsCorrect: number;
  fieldsTotal: number;
  cellsCorrect: number;
  cellsTotal: number;
  rowsExpected: number;
  rowsActual: number;
  /** (fields + cells correct) / (fields + cells expected, with extra rows counted against). */
  score: number;
  mismatches: Mismatch[];
}

function labelKey(text: string): string {
  return textKey(text).replace(/[^a-z0-9]/g, "");
}

function columnValueType(docType: DocTypeId, key: string, isMain: boolean): ValueType {
  return (isMain ? DOC_TYPES[docType].columns.find((c) => c.key === key)?.type : undefined) ?? "text";
}

function scoreTable(
  docType: DocTypeId,
  expected: GoldenDoc["tables"][number],
  actual: ExtractedTable | undefined,
  isMain: boolean,
  label: string,
  mismatches: Mismatch[],
): { correct: number; total: number; rowsActual: number } {
  const cols = expected.columns;
  const n = expected.rows.length;
  if (!actual) {
    mismatches.push({ where: label, expected: `${n} rows`, actual: "table missing" });
    return { correct: 0, total: n * cols.length, rowsActual: 0 };
  }
  // Map expected columns to actual columns: by key, then by printed header.
  const map = cols.map((col) => {
    let i = actual.columns.findIndex((c) => c.key === col.key);
    if (i < 0 && col.label) {
      i = actual.columns.findIndex((c) => labelKey(c.sourceLabel) === labelKey(col.label) || labelKey(c.label) === labelKey(col.label));
    }
    return i;
  });
  const types = cols.map((col) => columnValueType(docType, col.key, isMain));
  const m = actual.rows.length;
  const cell = (r: number, c: number) => (map[c] >= 0 ? (actual.rows[r][map[c]] ?? "") : "");
  const rowMatches = (i: number, j: number) => {
    let count = 0;
    for (let c = 0; c < cols.length; c++) if (valuesMatch(expected.rows[i][c] ?? "", cell(j, c), types[c], cols[c].key)) count++;
    return count;
  };

  // Align rows so a dropped or extra row does not shift every row after it.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const pick: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1][j - 1] + rowMatches(i - 1, j - 1);
      const up = dp[i - 1][j];
      const left = dp[i][j - 1];
      if (diag >= up && diag >= left) {
        dp[i][j] = diag;
        pick[i][j] = 0;
      } else if (up >= left) {
        dp[i][j] = up;
        pick[i][j] = 1;
      } else {
        dp[i][j] = left;
        pick[i][j] = 2;
      }
    }
  }
  const pairs: [number, number][] = [];
  for (let i = n, j = m; i > 0 && j > 0; ) {
    if (pick[i][j] === 0) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (pick[i][j] === 1) i--;
    else j--;
  }
  const paired = new Map(pairs);
  for (let i = 0; i < n; i++) {
    const j = paired.get(i);
    if (j === undefined) {
      mismatches.push({ where: `${label} row ${i + 1}`, expected: expected.rows[i].join(" | "), actual: "(row missing)" });
      continue;
    }
    for (let c = 0; c < cols.length; c++) {
      const exp = expected.rows[i][c] ?? "";
      const act = cell(j, c);
      if (!valuesMatch(exp, act, types[c], cols[c].key)) {
        mismatches.push({ where: `${label} row ${i + 1} ${cols[c].key}`, expected: exp, actual: map[c] < 0 ? "(column missing)" : act });
      }
    }
  }
  if (m > n) mismatches.push({ where: label, expected: `${n} rows`, actual: `${m} rows (extra rows count against the score)` });
  return { correct: dp[n][m], total: Math.max(n, m) * cols.length, rowsActual: m };
}

export function scoreDoc(golden: GoldenDoc, result: ExtractionResult): DocScore {
  const mismatches: Mismatch[] = [];
  const typeCorrect = result.docType === golden.docType;
  if (!typeCorrect) mismatches.push({ where: "document_type", expected: golden.docType, actual: result.docType });

  let fieldsCorrect = typeCorrect ? 1 : 0;
  let fieldsTotal = 1;
  for (const [key, expected] of Object.entries(golden.fields)) {
    fieldsTotal++;
    const type = DOC_TYPES[golden.docType].fields.find((f) => f.key === key)?.type ?? "text";
    const actual = result.fields.find((f) => f.key === key)?.value ?? "";
    if (valuesMatch(expected, actual, type, key)) fieldsCorrect++;
    else mismatches.push({ where: `field ${key}`, expected, actual: actual || "(missing)" });
  }

  let cellsCorrect = 0;
  let cellsTotal = 0;
  let rowsActual = 0;
  golden.tables.forEach((table, t) => {
    let actual: ExtractedTable | undefined = result.tables[0];
    if (t > 0) {
      // Secondary tables: take the extra table whose columns overlap most.
      const keys = new Set(table.columns.map((c) => c.key));
      const labels = new Set(table.columns.map((c) => labelKey(c.label)));
      actual = result.tables
        .slice(1)
        .map((candidate) => ({
          candidate,
          overlap: candidate.columns.filter((c) => keys.has(c.key) || labels.has(labelKey(c.sourceLabel)) || labels.has(labelKey(c.label))).length,
        }))
        .sort((a, b) => b.overlap - a.overlap)
        .find((x) => x.overlap > 0)?.candidate;
    }
    const scored = scoreTable(golden.docType, table, actual, t === 0, t === 0 ? "table" : `table "${table.name}"`, mismatches);
    cellsCorrect += scored.correct;
    cellsTotal += scored.total;
    if (t === 0) rowsActual = scored.rowsActual;
  });

  return {
    id: golden.id,
    docType: golden.docType,
    capture: golden.capture,
    difficulty: golden.difficulty,
    typeCorrect,
    fieldsCorrect,
    fieldsTotal,
    cellsCorrect,
    cellsTotal,
    rowsExpected: golden.tables[0]?.rows.length ?? 0,
    rowsActual,
    score: (fieldsCorrect + cellsCorrect) / (fieldsTotal + cellsTotal),
    mismatches,
  };
}
