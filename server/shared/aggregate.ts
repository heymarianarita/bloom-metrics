import { bucketLabel, periodRank, type Periodicity } from "./periods.ts";

/**
 * How a metric turns dataset rows into one value per period. Shared by the app and the
 * insights tools so both compute the same numbers.
 */

export type Aggregation = "sum" | "avg" | "latest" | "count" | "ratio" | "count_if";

export type CountOp = "eq" | "lt" | "lte" | "gt" | "gte";

/**
 * How a period's value is built from rows on several dates:
 *   average — each date's value, averaged (the original behaviour)
 *   total   — every row of the period at once (things that happen: insertions)
 *   last    — only the period's latest date (snapshots: a scan's shares)
 */
export type OverTime = "average" | "total" | "last";

export interface AggregationOptions {
  /** How the rows of a period on different dates combine; "average" when left out. */
  over_time?: OverTime;
  /** ratio: the column summed below the line (value = sum(value) ÷ sum(this) × 100). */
  denominator_column?: string;
  /** count_if: rows whose value compares this way to `threshold` are counted. */
  op?: CountOp;
  threshold?: number;
}

export interface AggregationConfig {
  value_column: string;
  period_column: string;
  aggregation: string;
  aggregation_options?: AggregationOptions | null;
}

const compare = (value: number, op: CountOp, threshold: number) =>
  op === "lt" ? value < threshold
    : op === "lte" ? value <= threshold
      : op === "gt" ? value > threshold
        : op === "gte" ? value >= threshold
          : value === threshold;

/** One value per period, in no particular order; `rows` is how many rows went into it. */
export function aggregateRows(
  rows: Record<string, unknown>[],
  config: AggregationConfig,
): { period: string; value: number; rows: number }[] {
  const options = config.aggregation_options ?? {};
  const buckets = new Map<string, { values: number[]; below: number }>();
  rows.forEach((data) => {
    const period = String(data?.[config.period_column] ?? "").trim();
    if (!period) return;
    const num = Number(data?.[config.value_column]);
    if (!Number.isFinite(num)) return;
    const bucket = buckets.get(period) ?? { values: [], below: 0 };
    bucket.values.push(num);
    if (config.aggregation === "ratio" && options.denominator_column) {
      const below = Number(data?.[options.denominator_column]);
      if (Number.isFinite(below)) bucket.below += below;
    }
    buckets.set(period, bucket);
  });

  return Array.from(buckets.entries()).flatMap(([period, { values, below }]) => {
    const total = values.reduce((sum, n) => sum + n, 0);
    let value: number;
    switch (config.aggregation) {
      case "avg":
        value = total / values.length;
        break;
      case "latest":
        value = values[values.length - 1];
        break;
      case "count":
        value = values.length;
        break;
      case "ratio":
        // Nothing to divide by: no value for this period rather than a misleading 0%.
        if (!below) return [];
        value = (total / below) * 100;
        break;
      case "count_if":
        value = values.filter((n) => compare(n, options.op ?? "eq", options.threshold ?? 0)).length;
        break;
      default:
        value = total;
    }
    return [{ period, value, rows: values.length }];
  });
}

/**
 * One value per period of the given frequency (newest first): rows are put in their period,
 * then combined as the metric's `over_time` says. `cutoffs` leaves out, per period label, the
 * rows dated after a moment (comparing a running period with the same stretch of another).
 */
export function periodSeries(
  rows: Record<string, unknown>[],
  config: AggregationConfig,
  periodicity: Periodicity,
  cutoffs: Record<string, number> = {},
): { period: string; value: number; rows: number }[] {
  const groups = new Map<string, { rank: number; rows: { raw: string; rank: number | null; data: Record<string, unknown> }[] }>();
  for (const data of rows) {
    const raw = String(data?.[config.period_column] ?? "").trim();
    if (!raw) continue;
    const rank = periodRank(raw);
    const label = rank === null ? raw : bucketLabel(rank, periodicity);
    const cutoff = cutoffs[label];
    if (cutoff !== undefined && rank !== null && rank > cutoff) continue;
    const group = groups.get(label) ?? { rank: rank ?? 0, rows: [] };
    group.rank = Math.min(group.rank, rank ?? group.rank);
    group.rows.push({ raw, rank, data });
    groups.set(label, group);
  }
  const overTime = config.aggregation_options?.over_time ?? "average";
  const out: { period: string; value: number; rows: number; rank: number }[] = [];
  for (const [period, group] of groups) {
    let picked = group.rows;
    if (overTime === "last") {
      const latest = Math.max(...group.rows.map((r) => r.rank ?? -Infinity));
      picked = group.rows.filter((r) => (r.rank ?? -Infinity) === latest);
    }
    if (overTime === "average") {
      const perDate = aggregateRows(picked.map((r) => r.data), config);
      if (!perDate.length) continue;
      out.push({
        period,
        value: perDate.reduce((sum, p) => sum + p.value, 0) / perDate.length,
        rows: perDate.reduce((sum, p) => sum + p.rows, 0),
        rank: group.rank,
      });
      continue;
    }
    // Every picked row counts as one period.
    const [point] = aggregateRows(
      picked.map((r) => ({ ...r.data, [config.period_column]: period })),
      config,
    );
    if (point) out.push({ ...point, period, rank: group.rank });
  }
  return out.sort((a, b) => b.rank - a.rank).map(({ period, value, rows: n }) => ({ period, value, rows: n }));
}
