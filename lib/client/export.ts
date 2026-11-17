import { nativeValue, toCsv, toTsv, type Sheet } from "@/core/extractor/tabular";

/**
 * Downloads, built in the browser from the table as the user has edited it.
 * Nothing goes back to the server.
 */

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadCsv(sheet: Sheet, fileName: string) {
  // The byte-order mark makes Excel read accents and currency signs correctly.
  save(new Blob(["﻿", toCsv(sheet)], { type: "text/csv;charset=utf-8" }), fileName);
}

export async function copyForSheets(sheet: Sheet): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(toTsv(sheet));
    return true;
  } catch {
    return false;
  }
}

type Cell = null | {
  value: string | number | Date;
  type?: typeof String | typeof Number | typeof Date;
  format?: string;
  fontWeight?: "bold";
  backgroundColor?: string;
  align?: "left" | "right";
  wrap?: boolean;
};

function sheetToXlsx(sheet: Sheet) {
  const header: Cell[] = sheet.header.map((label) => ({
    value: label,
    type: String,
    fontWeight: "bold",
    backgroundColor: "#E6F2EA",
  }));
  const body: Cell[][] = sheet.rows.map((row) =>
    row.map((cell): Cell => {
      const value = nativeValue(cell);
      if (value === null) return null;
      if (typeof value === "number") {
        return { value, type: Number, align: "right", ...(cell.type === "money" ? { format: "#,##0.00##" } : {}) };
      }
      if (value instanceof Date) return { value, type: Date, format: "yyyy-mm-dd" };
      return { value, type: String };
    }),
  );
  const columns = sheet.header.map((label, c) => {
    let width = label.length;
    for (const row of sheet.rows) width = Math.max(width, (row[c]?.value ?? "").length);
    return { width: Math.min(60, Math.max(10, width + 2)) };
  });
  return { data: [header, ...body], sheet: sheet.name, columns, stickyRowsCount: 1 };
}

export async function downloadXlsx(sheets: Sheet[], fileName: string) {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  // The library's types are stricter than its runtime; the shapes above follow its README.
  const blob = await (writeExcelFile as unknown as (input: unknown) => { toBlob(): Promise<Blob> })(
    sheets.map(sheetToXlsx),
  ).toBlob();
  save(blob, fileName);
}
