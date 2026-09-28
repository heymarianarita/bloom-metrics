import { bucketLabel, periodRank } from "../../server/shared/periods.ts";
import type { Periodicity } from "@/hooks/useMetricGroups";

export interface SeriesPoint {
  period: string;
  value: number;
  /** Number of underlying records behind the value (sample size). */
  rows?: number;
}

export { bucketLabel };

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
