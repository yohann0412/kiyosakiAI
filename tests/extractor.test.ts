import { describe, expect, it } from "vitest";
import { runChecks } from "@/core/extractor/checks";
import { toKey } from "@/core/extractor/doctypes";
import { formatMoney, needsFormulaGuard, parseDate, parseNumber } from "@/core/extractor/normalize";
import { postprocess } from "@/core/extractor/postprocess";
import { mockSample } from "@/core/extractor/providers/mock";
import { salvageJson } from "@/core/extractor/salvage";
import { flatSheet, mergedSheet, nativeValue, toCsv, toTsv, workbookSheets } from "@/core/extractor/tabular";
import { worstCaseCostUsd, costUsd } from "@/core/extractor/pricing";

describe("parseNumber", () => {
  it.each([
    ["1234.50", 1234.5],
    ["$1,234.50", 1234.5],
    ["1.234,50 €", 1234.5],
    ["1,234", 1234],
    ["12,5", 12.5],
    ["1234,50", 1234.5],
    ["(45.00)", -45],
    ["45.00-", -45],
    ["-12", -12],
    ["USD 99.90", 99.9],
    ["8.25%", 8.25],
    ["1'250.00", 1250],
    ["12,345,678", 12345678],
    ["1.234.567", 1234567],
    ["0.0125", 0.0125],
  ])("%s -> %s", (text, expected) => {
    expect(parseNumber(text)).toBeCloseTo(expected as number, 6);
  });

  it.each(["", "abc", "2 cs", "12/05/2026", "N/A", "1,2,3"])("rejects %s", (text) => {
    expect(parseNumber(text)).toBeNull();
  });
});

describe("parseDate", () => {
  it.each([
    ["2026-11-03", "2026-11-03"],
    ["11/03/2026", "2026-11-03"],
    ["13/02/2026", "2026-02-13"],
    ["3 Nov 2026", "2026-11-03"],
    ["Nov 3, 2026", "2026-11-03"],
    ["November 3rd, 2026", "2026-11-03"],
    ["03-Nov-26", "2026-11-03"],
    ["2026/11/03", "2026-11-03"],
  ])("%s -> %s", (text, expected) => {
    expect(parseDate(text)).toBe(expected);
  });

  it("reads day-first when asked", () => {
    expect(parseDate("03/11/2026", true)).toBe("2026-11-03");
  });

  it.each(["", "soon", "31/31/2026", "Net 30"])("rejects %s", (text) => {
    expect(parseDate(text)).toBeNull();
  });
});

describe("formula guard", () => {
  it("flags formula-like text but not negative numbers", () => {
    expect(needsFormulaGuard("=HYPERLINK(1)")).toBe(true);
    expect(needsFormulaGuard("@SUM(A1)")).toBe(true);
    expect(needsFormulaGuard("+cmd|' /C calc'!A0")).toBe(true);
    expect(needsFormulaGuard("-12.50")).toBe(false);
    expect(needsFormulaGuard("+15")).toBe(false);
    expect(needsFormulaGuard("Widget")).toBe(false);
  });
});

describe("salvageJson", () => {
  const full = JSON.stringify({
    document_type: "invoice",
    fields: [{ key: "total", label: "Total", value: "10.00" }],
    tables: [
      {
        name: "Line items",
        columns: [
          { key: "description", label: "Description", type: "text" },
          { key: "amount", label: "Amount", type: "money" },
        ],
        rows: [
          ["Widget \"large\"", "4.00"],
          ["Gadget", "6.00"],
          ["Gizmo, blue", "9.00"],
        ],
      },
    ],
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  });

  it("parses complete JSON untouched", () => {
    expect(salvageJson(full)).toEqual(JSON.parse(full));
  });

  it("recovers the complete rows from a cut-off response", () => {
    const cut = full.slice(0, full.indexOf('"Gizmo') + 4);
    const recovered = salvageJson(cut) as { tables: { rows: string[][] }[] };
    expect(recovered.tables[0].rows.slice(0, 2)).toEqual([
      ['Widget "large"', "4.00"],
      ["Gadget", "6.00"],
    ]);
  });

  it("recovers at every cut point without throwing", () => {
    for (let i = 20; i < full.length; i += 7) {
      const recovered = salvageJson(full.slice(0, i));
      expect(recovered === null || typeof recovered === "object").toBe(true);
    }
  });

  it("never cuts after an object key", () => {
    const recovered = salvageJson('{"document_type":"invoice","fields":[{"key":"total","label":') as { fields: unknown[] };
    expect(recovered).toBeTruthy();
    expect(JSON.stringify(recovered)).not.toContain('"label":}');
  });

  it("returns null for non-JSON", () => {
    expect(salvageJson("sorry, I cannot")).toBeNull();
  });
});

describe("postprocess", () => {
  it("maps catalog keys to clean labels and normalizes values", () => {
    const out = postprocess(mockSample("invoice"), "invoice");
    expect(out.docType).toBe("invoice");
    const total = out.fields.find((f) => f.key === "total");
    expect(total).toMatchObject({ label: "Total", value: "1729.30", type: "money" });
    const table = out.tables[0];
    expect(table.columns.map((c) => c.label)).toEqual(["SKU", "Description", "Quantity", "Unit", "Unit price", "Amount"]);
    expect(table.columns[0].sourceLabel).toBe("Item #");
    expect(table.rows[0]).toEqual(["BX-1208", "Corrugated box 12x8x6, 32 ECT", "500", "EA", "0.84", "420.00"]);
    // 1-based row 3 -> index 2
    expect(table.flags).toContainEqual({ row: 2, column: "unit_price", reason: "faint print: 21.50 or 21.80" });
  });

  it("orders catalog fields first and keeps extras", () => {
    const out = postprocess(
      {
        document_type: "invoice",
        fields: [
          { key: "Route #", label: "Route #", value: "14" },
          { key: "total", label: "TOTAL", value: "$5.00" },
          { key: "invoice_number", label: "No.", value: "A-1" },
          { key: "due_date", label: "Due", value: "" },
        ],
        tables: [],
        uncertain: [],
        uncertain_fields: [],
        notes: [],
      },
      "auto",
    );
    expect(out.fields.map((f) => f.key)).toEqual(["invoice_number", "total", "route_number"]);
    expect(out.fields[2].label).toBe("Route #");
    expect(out.tables).toHaveLength(1);
    expect(out.tables[0].rows).toHaveLength(0);
  });

  it("makes tables rectangular, drops empty rows and columns, and keeps flags aligned", () => {
    const out = postprocess(
      {
        document_type: "receipt",
        fields: [],
        tables: [
          {
            name: "Items",
            columns: [
              { key: "description", label: "Item", type: "text" },
              { key: "quantity", label: "Qty", type: "number" },
              { key: "amount", label: "Amount", type: "money" },
              { key: "sku", label: "Code", type: "text" },
            ],
            rows: [["Coffee", "", "3.5"], ["", "", ""], ["Bagel", "", "2", "", "extra"], ["Tea  \n green", "", "(1.00)"]],
          },
        ],
        uncertain: [
          { table: 0, row: 4, column: "amount", reason: "smudged" },
          { table: 0, row: 9, column: "amount", reason: "out of range" },
          { table: 0, row: 1, column: "nope", reason: "bad column" },
        ],
        uncertain_fields: [],
        notes: [" "],
      },
      "receipt",
    );
    const table = out.tables[0];
    expect(table.columns.map((c) => c.key)).toEqual(["description", "amount"]);
    expect(table.rows).toEqual([
      ["Coffee", "3.50"],
      ["Bagel", "2.00"],
      ["Tea green", "-1.00"],
    ]);
    expect(table.flags).toEqual([{ row: 2, column: "amount", reason: "smudged" }]);
    expect(out.notes).toEqual([]);
  });

  it("drops a half-written last row when the response was cut off", () => {
    const raw = {
      document_type: "invoice",
      fields: [],
      tables: [
        {
          name: "Line items",
          columns: [
            { key: "description", label: "Description", type: "text" },
            { key: "amount", label: "Amount", type: "money" },
          ],
          rows: [["A", "1.00"], ["B"]],
        },
      ],
      uncertain: [],
      uncertain_fields: [],
      notes: [],
    };
    expect(postprocess(raw, "invoice", { truncated: true }).tables[0].rows).toEqual([["A", "1.00"]]);
    expect(postprocess(raw, "invoice").tables[0].rows).toEqual([["A", "1.00"], ["B", ""]]);
  });

  it("falls back to the hint, then to other, for an unknown type", () => {
    const raw = { document_type: "memo", fields: [], tables: [], uncertain: [], uncertain_fields: [], notes: [] };
    expect(postprocess(raw, "receipt").docType).toBe("receipt");
    expect(postprocess(raw, "auto").docType).toBe("other");
  });
});

describe("runChecks", () => {
  it("passes on a consistent invoice", () => {
    const out = postprocess(mockSample("invoice"), "invoice");
    const checks = runChecks(out.fields, out.tables);
    expect(checks.map((c) => [c.id, c.ok])).toEqual([
      ["line_math", true],
      ["line_sum", true],
      ["total_math", true],
    ]);
  });

  it("flags the row that does not multiply out and the broken sum", () => {
    const raw = mockSample("invoice");
    raw.tables![0].rows![1][5] = "171.00"; // was 117.00: a classic digit swap
    const out = postprocess(raw, "invoice");
    const checks = runChecks(out.fields, out.tables);
    expect(checks.find((c) => c.id === "line_math")?.ok).toBe(false);
    expect(checks.find((c) => c.id === "line_sum")?.ok).toBe(false);
    expect(out.tables[0].flags.some((f) => f.row === 1 && f.column === "amount")).toBe(true);
  });

  it("checks freight totals on a bill of lading", () => {
    const out = postprocess(mockSample("bill_of_lading"), "bill_of_lading");
    const checks = runChecks(out.fields, out.tables);
    expect(checks.map((c) => [c.id, c.ok])).toEqual([
      ["package_qty_sum", true],
      ["handling_unit_qty_sum", true],
      ["weight_sum", true],
    ]);
  });

  it("accepts tax-inclusive totals when there is no subtotal", () => {
    const out = postprocess(
      {
        document_type: "receipt",
        fields: [
          { key: "tax_total", label: "Tax", value: "0.80" },
          { key: "total", label: "Total", value: "10.80" },
        ],
        tables: [
          {
            name: "Items",
            columns: [
              { key: "description", label: "", type: "text" },
              { key: "amount", label: "", type: "money" },
            ],
            rows: [["A", "4.00"], ["B", "6.00"]],
          },
        ],
        uncertain: [],
        uncertain_fields: [],
        notes: [],
      },
      "receipt",
    );
    expect(runChecks(out.fields, out.tables).find((c) => c.id === "line_sum")?.ok).toBe(true);
  });
});

describe("tabular", () => {
  const doc = (() => {
    const out = postprocess(mockSample("invoice"), "invoice");
    return { docType: out.docType, fields: out.fields, tables: out.tables };
  })();

  it("builds a workbook with tables, details and an import-ready sheet", () => {
    const sheets = workbookSheets(doc);
    expect(sheets.map((s) => s.name)).toEqual(["Line items", "Details", "Import-ready"]);
    expect(sheets[0].rows).toHaveLength(5);
  });

  it("repeats identifying fields on every flat row, without totals", () => {
    const flat = flatSheet(doc);
    expect(flat.header.slice(0, 3)).toEqual(["Invoice number", "Invoice date", "Due date"]);
    expect(flat.header).not.toContain("Total");
    expect(flat.rows.every((r) => r[0].value === "INV-20418")).toBe(true);
  });

  it("writes safe RFC 4180 CSV", () => {
    const csv = toCsv({
      name: "x",
      header: ["a", "b"],
      rows: [
        [
          { value: 'He said "hi", ok', type: "text" },
          { value: "=1+1", type: "text" },
        ],
        [
          { value: "-5.00", type: "money" },
          { value: "line\nbreak", type: "text" },
        ],
      ],
    });
    expect(csv).toBe('a,b\r\n"He said ""hi"", ok",\'=1+1\r\n-5.00,"line\nbreak"\r\n');
  });

  it("writes TSV without tabs or newlines inside cells", () => {
    const tsv = toTsv({ name: "x", header: ["a"], rows: [[{ value: "x\ty\nz", type: "text" }]] });
    expect(tsv).toBe("a\nx y z");
  });

  it("gives spreadsheets real numbers and dates", () => {
    expect(nativeValue({ value: "1729.30", type: "money" })).toBe(1729.3);
    expect(nativeValue({ value: "2 cs", type: "number" })).toBe("2 cs");
    expect(nativeValue({ value: "2026-11-03", type: "date" })).toEqual(new Date("2026-11-03T00:00:00Z"));
    expect(nativeValue({ value: "", type: "money" })).toBeNull();
  });

  it("merges documents by column key", () => {
    const po = postprocess(mockSample("purchase_order"), "purchase_order");
    const merged = mergedSheet([
      { name: "a.pdf", doc },
      { name: "b.pdf", doc: { docType: po.docType, fields: po.fields, tables: po.tables } },
    ]);
    expect(merged.header[0]).toBe("File");
    expect(merged.header.filter((h) => h === "Description")).toHaveLength(1);
    expect(merged.rows).toHaveLength(9);
    expect(merged.rows.every((r) => r.length === merged.header.length)).toBe(true);
  });
});

describe("misc", () => {
  it("makes snake_case keys", () => {
    expect(toKey("Item #")).toBe("item_number");
    expect(toKey("Qté livrée")).toBe("qte_livree");
    expect(toKey("  ")).toBe("column");
  });

  it("formats money", () => {
    expect(formatMoney(12)).toBe("12.00");
    expect(formatMoney(0.0125)).toBe("0.0125");
    expect(formatMoney(-3.5)).toBe("-3.50");
  });

  it("prices a worst-case upload above a typical one", () => {
    const typical = costUsd("claude-opus-5-5", { inputTokens: 6000, outputTokens: 1500 });
    expect(typical).toBeCloseTo(0.054, 3);
    expect(worstCaseCostUsd("claude-opus-5-5", 10, 16000)).toBeGreaterThan(typical);
    expect(costUsd("mystery-model", { inputTokens: 1_000_000, outputTokens: 0 })).toBe(8);
  });
});
