/**
 * How a metric turns dataset rows into one value per period. Shared by the app and the
 * insights tools so both compute the same numbers.
 */

export type Aggregation = "sum" | "avg" | "latest" | "count" | "ratio" | "count_if";

export type CountOp = "eq" | "lt" | "lte" | "gt" | "gte";

export interface AggregationOptions {
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
