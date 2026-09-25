import { periodRank } from "@/hooks/useManualDatasets";
import type { Periodicity } from "@/hooks/useMetricGroups";

export interface SeriesPoint {
  period: string;
  value: number;
  /** Number of underlying records behind the value (sample size). */
  rows?: number;
}

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

/**
 * Group raw metric points into buckets of the given frequency, averaging
 * values that land in the same bucket. Returns newest first.
 */
export const bucketSeries = (points: SeriesPoint[], periodicity: Periodicity): SeriesPoint[] => {
  const buckets = new Map<string, { rank: number; values: number[]; rows: number }>();

  points.forEach((point) => {
    const rank = periodRank(point.period);
    const label = rank === null ? point.period : bucketLabel(rank, periodicity);
    const entry = buckets.get(label) ?? { rank: rank ?? 0, values: [], rows: 0 };
    entry.values.push(point.value);
    entry.rows += point.rows ?? 1;
    buckets.set(label, entry);
  });

  return Array.from(buckets.entries())
    .map(([period, entry]) => ({
      period,
      value: entry.values.reduce((sum, n) => sum + n, 0) / entry.values.length,
      rows: entry.rows,
      rank: entry.rank,
    }))
    .sort((a, b) => b.rank - a.rank)
    .map(({ period, value, rows }) => ({ period, value, rows }));
};
