import { formatMoney, formatNumber, parseNumber } from "./normalize";
import type { Check, ExtractedField, ExtractedTable } from "./types";

/**
 * Arithmetic checks done in code after extraction. They never change a value:
 * they only tell the user where the document (or the reading of it) does not
 * add up, which is where transcription errors hide.
 */

function near(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff <= 0.021 || diff <= Math.abs(b) * 0.002;
}

function fieldNumber(fields: ExtractedField[], key: string): number | null {
  const field = fields.find((x) => x.key === key);
  if (!field) return null;
  const direct = parseNumber(field.value);
  if (direct !== null) return direct;
  // "4,812 lb" -> 4812
  const m = /^[^\d-]*(-?[\d.,]+)/.exec(field.value);
  return m ? parseNumber(m[1]) : null;
}

function columnIndex(table: ExtractedTable, key: string): number {
  return table.columns.findIndex((c) => c.key === key);
}

function columnSum(table: ExtractedTable, key: string): { sum: number; count: number } | null {
  const c = columnIndex(table, key);
  if (c < 0) return null;
  let sum = 0;
  let count = 0;
  for (const row of table.rows) {
    const n = parseNumber(row[c]);
    if (n !== null) {
      sum += n;
      count++;
    }
  }
  return count ? { sum, count } : null;
}

export function runChecks(fields: ExtractedField[], tables: ExtractedTable[]): Check[] {
  const checks: Check[] = [];
  const main = tables[0];
  if (!main || !main.rows.length) return checks;

  // ---- quantity x unit price = amount, row by row ------------------------
  const q = columnIndex(main, "quantity");
  const p = columnIndex(main, "unit_price");
  const a = columnIndex(main, "amount");
  const d = columnIndex(main, "discount");
  const t = columnIndex(main, "tax_rate");
  if (q >= 0 && p >= 0 && a >= 0) {
    let tested = 0;
    let failed = 0;
    main.rows.forEach((row, r) => {
      const qty = parseNumber(row[q]);
      const price = parseNumber(row[p]);
      const amount = parseNumber(row[a]);
      if (qty === null || price === null || amount === null) return;
      tested++;
      const base = qty * price;
      const candidates = [base];
      if (d >= 0) {
        const discountText = row[d];
        const discount = parseNumber(discountText);
        if (discount !== null) {
          candidates.push(base - Math.abs(discount));
          if (/%/.test(discountText) || Math.abs(discount) <= 100) candidates.push(base * (1 - Math.abs(discount) / 100));
        }
      }
      if (t >= 0) {
        const rate = parseNumber(row[t]);
        if (rate !== null && rate > 0 && rate < 100) candidates.push(...candidates.map((x) => x * (1 + rate / 100)));
      }
      if (candidates.some((x) => near(x, amount))) return;
      failed++;
      if (!main.flags.some((f) => f.row === r && f.column === "amount")) {
        main.flags.push({
          row: r,
          column: "amount",
          reason: `Quantity × unit price is ${formatMoney(base)}, but this says ${formatMoney(amount)}`,
          source: "check",
        });
      }
    });
    if (tested) {
      checks.push({
        id: "line_math",
        ok: failed === 0,
        message:
          failed === 0
            ? `Quantity × unit price matches the amount on all ${tested} row${tested === 1 ? "" : "s"}`
            : `${failed} of ${tested} rows don't multiply out (highlighted)`,
      });
    }
  }

  // ---- line amounts add up to the subtotal -------------------------------
  const amounts = columnSum(main, "amount");
  const subtotal = fieldNumber(fields, "subtotal");
  const total = fieldNumber(fields, "total");
  const tax = fieldNumber(fields, "tax_total") ?? 0;
  const shipping = fieldNumber(fields, "shipping_total") ?? 0;
  const discount = Math.abs(fieldNumber(fields, "discount_total") ?? 0);
  const tip = fieldNumber(fields, "tip") ?? 0;

  if (amounts && amounts.count === main.rows.length) {
    const targets: { value: number; name: string }[] = [];
    if (subtotal !== null) targets.push({ value: subtotal, name: "subtotal" });
    if (total !== null) {
      targets.push({ value: total, name: "total" });
      // Tax-inclusive documents and documents without a printed subtotal.
      targets.push({ value: total - tax - shipping - tip + discount, name: "total before tax and charges" });
    }
    if (targets.length) {
      const hit = targets.find((x) => near(amounts.sum, x.value) || near(amounts.sum - discount, x.value));
      checks.push({
        id: "line_sum",
        ok: Boolean(hit),
        message: hit
          ? `Line amounts add up to the ${hit.name} (${formatMoney(hit.value)})`
          : `Line amounts add up to ${formatMoney(amounts.sum)}, but the document's ${targets[0].name} is ${formatMoney(targets[0].value)}`,
      });
    }
  }

  // ---- subtotal + tax + shipping - discount = total -----------------------
  if (subtotal !== null && total !== null) {
    const computed = subtotal - discount + tax + shipping + tip;
    const ok = near(computed, total) || near(subtotal + tax + shipping + tip, total);
    checks.push({
      id: "total_math",
      ok,
      message: ok
        ? `Subtotal, tax and charges add up to the total (${formatMoney(total)})`
        : `Subtotal, tax and charges come to ${formatMoney(computed)}, but the total says ${formatMoney(total)}`,
    });
  }

  // ---- freight and packing totals ----------------------------------------
  const sums: { column: string; field: string; label: string }[] = [
    { column: "package_qty", field: "total_packages", label: "Package quantities" },
    { column: "handling_unit_qty", field: "total_handling_units", label: "Handling units" },
    { column: "weight", field: "total_weight", label: "Line weights" },
  ];
  for (const item of sums) {
    const sum = columnSum(main, item.column);
    const target = fieldNumber(fields, item.field);
    if (!sum || target === null) continue;
    const ok = near(sum.sum, target);
    checks.push({
      id: `${item.column}_sum`,
      ok,
      message: ok
        ? `${item.label} add up to the document total (${formatNumber(target)})`
        : `${item.label} add up to ${formatNumber(sum.sum)}, but the document total is ${formatNumber(target)}`,
    });
  }

  return checks;
}
