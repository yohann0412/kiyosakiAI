import { describe, expect, it } from "vitest";
import { runChecks } from "@/core/extractor/checks";
import { DOC_TYPES } from "@/core/extractor/doctypes";
import { postprocess } from "@/core/extractor/postprocess";
import type { RawExtraction } from "@/core/extractor/prompt";
import type { ExtractionResult } from "@/core/extractor/types";
import { checkEvalSeal, loadGolden, scoreDoc, valuesMatch, type GoldenDoc } from "@/scripts/eval-lib";

/** What a perfect model would return for a golden document. */
function oracle(doc: GoldenDoc, mutate?: (raw: RawExtraction) => void): ExtractionResult {
  const raw: RawExtraction = {
    document_type: doc.docType,
    fields: Object.entries(doc.fields).map(([key, value]) => ({ key, label: key, value })),
    tables: doc.tables.map((table) => ({
      name: table.name,
      columns: table.columns.map((c) => ({ key: c.key, label: c.label, type: "text" })),
      // Copy: tests mutate the reading, never the golden document.
      rows: table.rows.map((row) => row.slice()),
    })),
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  };
  mutate?.(raw);
  const processed = postprocess(raw, doc.docType);
  return {
    docType: processed.docType,
    docTypeLabel: DOC_TYPES[processed.docType].label,
    fields: processed.fields,
    tables: processed.tables,
    checks: runChecks(processed.fields, processed.tables),
    notes: [],
    pages: 1,
    truncated: false,
    usage: { provider: "test", model: "test", inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 0 },
  };
}

const golden = loadGolden();

describe("golden set", () => {
  it("is sealed and intact", () => {
    const report = checkEvalSeal();
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("has documents for every tuned type", () => {
    expect(golden.length).toBeGreaterThanOrEqual(19);
    const types = new Set(golden.map((doc) => doc.docType));
    for (const type of ["invoice", "packing_slip", "bill_of_lading", "purchase_order", "receipt", "order_form"]) {
      expect(types.has(type as GoldenDoc["docType"])).toBe(true);
    }
  });

  it.each(golden.map((doc) => [doc.id, doc] as const))("%s: a perfect reading scores 100%%", (_id, doc) => {
    const score = scoreDoc(doc, oracle(doc));
    expect(score.mismatches).toEqual([]);
    expect(score.score).toBe(1);
  });

  it.each(golden.map((doc) => [doc.id, doc] as const))("%s: the document's own arithmetic holds", (_id, doc) => {
    const failed = oracle(doc).checks.filter((check) => !check.ok);
    expect(failed).toEqual([]);
  });
});

describe("scoring", () => {
  const doc = golden.find((d) => d.id === "inv-01-clean-pdf")!;

  it("counts a wrong digit against the score and names it", () => {
    const score = scoreDoc(
      doc,
      oracle(doc, (raw) => {
        raw.tables![0].rows![2][3] = "14.26";
      }),
    );
    expect(score.cellsCorrect).toBe(score.cellsTotal - 1);
    expect(score.mismatches).toHaveLength(1);
    expect(score.mismatches[0].where).toBe("table row 3 unit_price");
  });

  it("does not let one dropped row shift every row after it", () => {
    const score = scoreDoc(
      doc,
      oracle(doc, (raw) => {
        raw.tables![0].rows!.splice(1, 1);
      }),
    );
    const columns = doc.tables[0].columns.length;
    expect(score.cellsCorrect).toBe(score.cellsTotal - columns);
  });

  it("counts an extra row (a total read as a line item) against the score", () => {
    const score = scoreDoc(
      doc,
      oracle(doc, (raw) => {
        raw.tables![0].rows!.push(["", "Total", "", "", "1249.94"]);
      }),
    );
    expect(score.cellsTotal).toBe((doc.tables[0].rows.length + 1) * doc.tables[0].columns.length);
    expect(score.score).toBeLessThan(1);
  });

  it("scores a wrong document type and a missing field", () => {
    const score = scoreDoc(
      doc,
      oracle(doc, (raw) => {
        raw.fields = raw.fields!.filter((f) => f.key !== "due_date");
      }),
    );
    expect(score.fieldsCorrect).toBe(score.fieldsTotal - 1);
    expect(score.mismatches[0]).toMatchObject({ where: "field due_date", actual: "(missing)" });
  });

  it("matches columns by printed header when the key differs", () => {
    const packing = golden.find((d) => d.id === "ps-03-export-photo")!;
    const score = scoreDoc(
      packing,
      oracle(packing, (raw) => {
        const column = raw.tables![0].columns!.find((c) => c.key === "net_weight_kg")!;
        column.key = "net_wt";
      }),
    );
    expect(score.score).toBe(1);
  });
});

describe("valuesMatch", () => {
  it.each([
    ["1729.30", "$1,729.30", "money", "", true],
    ["1729.30", "1729.3", "money", "", true],
    ["1729.30", "1792.30", "money", "", false],
    ["2026-11-03", "11/03/2026", "date", "", true],
    ["2026-11-03", "2026-11-04", "date", "", false],
    ["214 lb", "214 lbs", "text", "total_weight", true],
    ["214 lb", "214", "text", "total_weight", true],
    ["214 lb", "241 lb", "text", "total_weight", false],
    ["14:32", "2:32 PM", "text", "time", true],
    ["4417", "************4417", "text", "card_last4", true],
    ["3rd Party", "Third Party", "text", "freight_terms", true],
    ["EUR", "€", "text", "currency", true],
    ["HH-771820, HH-771821", "HH-771821; HH-771820", "text", "po_number", true],
    ["92 Harbor Street, Portland, ME 04101", "92 Harbor Street Portland ME 04101", "text", "", true],
    ["12 x 8 x 6 in", "12 × 8 × 6 in", "text", "", true],
    ["", "", "text", "", true],
    ["", "5", "number", "", false],
    ["X", "", "text", "", false],
  ])("%s vs %s (%s)", (expected, actual, type, key, outcome) => {
    expect(valuesMatch(expected as string, actual as string, type as "text", key as string)).toBe(outcome);
  });
});
