/**
 * Dates are stored as YYYY-MM-DD. Values written another way ("3/26/2025", "26.03.2025",
 * "Mar 26, 2025") are converted when data comes in. Shared by the app (CSV import, cell
 * edits) and the server (the one-off migration of stored data). No imports.
 *
 * A date like "12/2/2024" is ambiguous on its own, so the order is decided per column:
 * a first part above 12 means day-first, a second part above 12 means month-first.
 */

export type DateOrder = "mdy" | "dmy";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
/** 2026-3-5 or 2026/03/05: year first, not zero-padded or with slashes. */
const YEAR_FIRST = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
/** 3/26/2025, 26.03.2025, 26-03-25: year last. */
const YEAR_LAST = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/;

/** A time after the date (form timestamps, exports): "3/26/2025 10:15:23", "2025-03-26T10:15:00Z". */
const TIME_SUFFIX = /(?:[T\s]+|,\s*)\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(?:[AP]M)?\s*(?:Z|[+-]\d{2}:?\d{2}|UTC|GMT)?$/i;

/** The date part only: a date stored with a time keeps just the day. */
const withoutTime = (value: string) => value.trim().replace(TIME_SUFFIX, "");

const pad = (n: number) => String(n).padStart(2, "0");

const valid = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Rejects 31 April and the like.
  if (date.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};

export const isIsoDate = (value: string) => ISO.test(value.trim());

/** Month-first or day-first for a column, from the values that can only be read one way. */
export function inferDateOrder(values: string[]): { order: DateOrder | null; conflicting: boolean } {
  let mdy = false;
  let dmy = false;
  for (const raw of values) {
    const m = withoutTime(raw).match(YEAR_LAST);
    if (!m) continue;
    const [first, second] = [Number(m[1]), Number(m[2])];
    if (first > 12 && second <= 12) dmy = true;
    if (second > 12 && first <= 12) mdy = true;
  }
  if (mdy && dmy) return { order: null, conflicting: true };
  return { order: mdy ? "mdy" : dmy ? "dmy" : null, conflicting: false };
}

/**
 * YYYY-MM-DD for one value, or null when it isn't a date or its order can't be told.
 * `order` is the column's order (from inferDateOrder or chosen by the person importing).
 */
export function toIsoDate(raw: string, order: DateOrder | null = null): string | null {
  const value = withoutTime(raw);
  if (!value) return null;
  if (ISO.test(value)) return value;

  const yf = value.match(YEAR_FIRST);
  if (yf) return valid(Number(yf[1]), Number(yf[2]), Number(yf[3]));

  const yl = value.match(YEAR_LAST);
  if (yl) {
    const [first, second] = [Number(yl[1]), Number(yl[2])];
    const year = yl[3].length === 2 ? 2000 + Number(yl[3]) : Number(yl[3]);
    // Readable one way only, whatever the column says.
    if (first > 12) return valid(year, second, first);
    if (second > 12) return valid(year, first, second);
    if (!order) return first === second ? valid(year, first, second) : null;
    return order === "mdy" ? valid(year, first, second) : valid(year, second, first);
  }

  // Written-out months ("Mar 26, 2025", "26 March 2025") are unambiguous.
  if (/[a-z]{3}/i.test(value) && /\d{4}/.test(value)) {
    const parsed = Date.parse(`${value} UTC`);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      return valid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  return null;
}

export interface DateColumnResult {
  /** The values with every readable date as YYYY-MM-DD; others left as they were. */
  values: string[];
  /** How many values were rewritten. */
  converted: number;
  /** Non-empty values that aren't dates, or whose order couldn't be told. */
  unreadable: number;
  /** True when some dates could be either order and nothing in the column settles it. */
  ambiguous: boolean;
  order: DateOrder | null;
}

/** Converts a whole column, working out month-first or day-first from the column itself. */
export function normalizeDateColumn(values: string[], order?: DateOrder | null): DateColumnResult {
  const inferred = inferDateOrder(values);
  const use = order ?? inferred.order;
  let converted = 0;
  let unreadable = 0;
  let ambiguous = false;
  const out = values.map((raw) => {
    const value = raw.trim();
    if (!value) return raw;
    const iso = toIsoDate(value, use);
    if (!iso) {
      unreadable++;
      if (!use && YEAR_LAST.test(withoutTime(value))) ambiguous = true;
      return raw;
    }
    if (iso !== value) converted++;
    return iso;
  });
  return { values: out, converted, unreadable, ambiguous: ambiguous || inferred.conflicting, order: use };
}

/** Whether most non-empty values read as dates, so a new CSV column can be typed Date. */
export const looksLikeDates = (values: string[]) => {
  const filled = values.map((v) => v.trim()).filter(Boolean);
  if (filled.length === 0) return false;
  const inferred = inferDateOrder(filled).order;
  const dates = filled.filter((v) => toIsoDate(v, inferred) || YEAR_LAST.test(withoutTime(v))).length;
  return dates / filled.length >= 0.9;
};
