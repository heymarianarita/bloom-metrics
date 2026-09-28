/**
 * Period labels (2026-Q2, 2026-03, 3/26/2025…): chronological rank and bucketing by
 * reporting frequency. Shared by the app and the server, so charts, the Insights
 * chat and qualitative summaries put a date in the same period. No imports.
 */

export type Periodicity = "daily" | "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly";

/** Chronological rank for a period label (date, quarter, month or year). */
export const periodRank = (period: string): number | null => {
  const value = period.trim();
  if (!value) return null;

  // 2026-Q2 / Q2 2026
  const quarter = value.match(/^(\d{4})[-\s]?Q([1-4])$/i) ?? value.match(/^Q([1-4])[-\s](\d{4})$/i);
  if (quarter) {
    const year = Number(quarter[1].length === 4 ? quarter[1] : quarter[2]);
    const q = Number(quarter[1].length === 4 ? quarter[2] : quarter[1]);
    return Date.UTC(year, (q - 1) * 3, 1);
  }

  // ISO-ish dates: 2026-03-05, 2026/03, 2026
  const iso = value.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2] ?? 1) - 1, Number(iso[3] ?? 1));

  // Two-part dates: 05/03/2026 (day-first) or 5/29/2026 (month-first).
  const dmy = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    // If the second part can't be a month, the date is month-first (US style).
    const monthFirst = second > 12 && first <= 12;
    const month = monthFirst ? first : second;
    const day = monthFirst ? second : first;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return Date.UTC(year, month - 1, day);
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Compare two period labels chronologically, falling back to text order. */
export const comparePeriods = (a: string, b: string) => {
  const ra = periodRank(a);
  const rb = periodRank(b);
  if (ra !== null && rb !== null) return ra - rb;
  if (ra !== null) return 1;
  if (rb !== null) return -1;
  return a.localeCompare(b);
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Label a timestamp according to the reporting frequency of a metric group. */
export const bucketLabel = (timestamp: number, periodicity: Periodicity) => {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  switch (periodicity) {
    case "daily":
      return `${year}-${pad(month + 1)}-${pad(date.getUTCDate())}`;
    case "weekly": {
      const target = new Date(Date.UTC(year, month, date.getUTCDate()));
      const day = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - day);
      const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
      const week = Math.ceil(((target.getTime() - yearStart) / 86400000 + 1) / 7);
      return `${target.getUTCFullYear()}-W${pad(week)}`;
    }
    case "monthly":
      return `${year}-${pad(month + 1)}`;
    case "semiannual":
      return `${year}-H${month < 6 ? 1 : 2}`;
    case "yearly":
      return String(year);
    case "quarterly":
    default:
      return `${year}-Q${Math.floor(month / 3) + 1}`;
  }
};

/** The bucket a period label falls into, or the label itself when it is not a date. */
export const bucketPeriod = (period: string, periodicity: Periodicity) => {
  const rank = periodRank(period);
  return rank === null ? period.trim() : bucketLabel(rank, periodicity);
};
