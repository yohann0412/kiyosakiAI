/**
 * Pure helpers for cleaning cell text and reading numbers and dates.
 * Used by the extractor's post-processing, the exports and the eval scorer.
 */

/** Collapse whitespace; keep single spaces. */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/ /g, " ")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Read a number out of text such as "$1,234.50", "1.234,50 €", "(45.00)",
 * "45.00-" or "12 %". Returns null when the text is not a single number.
 */
export function parseNumber(value: unknown): number | null {
  let s = cleanText(value);
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  // Currency symbols, ISO codes and percent signs around the number.
  s = s
    .replace(/[$€£¥₹₩₽₺₫฿₱₦]/g, "")
    .replace(/^(usd|cad|aud|eur|gbp|mxn|inr|jpy|cny|chf|nzd|sgd)\b/i, "")
    .replace(/\b(usd|cad|aud|eur|gbp|mxn|inr|jpy|cny|chf|nzd|sgd)$/i, "")
    .replace(/%$/, "")
    .replace(/\s+/g, "");
  if (/^[+-]/.test(s)) {
    if (s[0] === "-") negative = !negative;
    s = s.slice(1);
  }
  if (!s || !/^[\d.,']+$/.test(s) || !/\d/.test(s)) return null;

  s = s.replace(/'/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    // Whichever comes last is the decimal mark.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const parts = s.split(",");
    const tail = parts[parts.length - 1];
    // "1,234" and "12,345,678" are thousands; "12,5" and "1234,50" are decimals.
    const thousands = parts.length > 1 && parts.slice(1).every((p) => p.length === 3) && parts[0].length <= 3;
    if (thousands) s = parts.join("");
    else if (parts.length === 2) s = parts[0] + "." + tail;
    else return null;
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    // "1.234.567" is thousands with dots.
    if (parts.length > 2) {
      if (parts.slice(1).every((p) => p.length === 3)) s = parts.join("");
      else return null;
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Plain decimal text for a number: no thousands separators, no symbols. */
export function formatNumber(n: number, maxDecimals = 4): string {
  if (!Number.isFinite(n)) return "";
  const fixed = n.toFixed(maxDecimals);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

/** Money keeps at least two decimals when it has any cents. */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 10000) / 10000;
  const twoDp = Math.abs(rounded * 100 - Math.round(rounded * 100)) < 1e-6;
  return twoDp ? rounded.toFixed(2) : formatNumber(rounded, 4);
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function isoDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += y >= 70 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Read a date into YYYY-MM-DD. Slash dates are read month-first unless that
 * is impossible (13/02/2026) or `dayFirst` is set. Returns null when unsure.
 */
export function parseDate(value: unknown, dayFirst = false): string | null {
  const s = cleanText(value).replace(/,/g, " ").replace(/\s+/g, " ");
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);
  if (m) return isoDate(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12 && b <= 12) return isoDate(y, b, a);
    if (b > 12 && a <= 12) return isoDate(y, a, b);
    return dayFirst ? isoDate(y, b, a) : isoDate(y, a, b);
  }

  // 14 Mar 2026 / 14-Mar-26 / March 14 2026 / Mar 14th 2026
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[ -]([A-Za-z]{3,9})\.?[ -](\d{2}|\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return isoDate(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = s.match(/^([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)? (\d{2}|\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return isoDate(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);

  return null;
}

/** Excel cells that start like a formula are a known CSV-injection vector. */
export function needsFormulaGuard(text: string): boolean {
  if (!text) return false;
  if (!/^[=+\-@\t\r]/.test(text)) return false;
  // Plain negative or signed numbers are safe.
  return parseNumber(text) === null;
}
