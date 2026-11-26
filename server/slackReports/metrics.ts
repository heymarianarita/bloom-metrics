import { query } from "../db.ts";
import { periodSeries, type AggregationConfig } from "../shared/aggregate.ts";
import { bucketPeriod } from "../shared/periods.ts";
import sheetsAnalytics from "../functions/sheets-analytics.ts";

/**
 * One value per metric for a quarter and the quarter before it, computed the way the Metrics
 * pages do: dataset metrics are bucketed by quarter with their own aggregation; live sources
 * read their stored quarterly history (Figma snapshots, code adoption reports, the survey sheet).
 */

export interface ReportMetric {
  id: string;
  name: string;
  unit: string;
  direction: "up" | "down" | "none";
  value: number | null;
  previous: number | null;
  /** Rows behind the value, for the AI summary to judge small samples. */
  rows: number | null;
  /** Why there's no value, when the metric's source can't be read by quarter. */
  unavailable?: string;
}

type MetricRow = {
  id: string;
  name: string;
  unit: string;
  direction: string;
  archived: number;
  dataset_id: string | null;
  value_column: string;
  period_column: string;
  aggregation: string;
  aggregation_options: unknown;
  source_type: string;
  source_key: string;
  source_field: string;
};

type Point = { value: number; rows: number };
type Lookup = (quarter: string) => Point | null;

const asJson = (v: unknown) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const FIGMA_COLUMNS: Record<string, string> = {
  totalInserts: "inserts",
  totalDetaches: "detaches",
  totalUsages: "usages",
  detachRate: "detach_rate",
  componentCount: "component_count",
};

const CODE_COLUMNS = new Set(["ds_percent", "native_percent", "tagged_percent", "untagged_percent", "total_files"]);

const average = (values: number[]): Point | null =>
  values.length ? { value: values.reduce((sum, n) => sum + n, 0) / values.length, rows: values.length } : null;

/** Reads each source once per report, however many metrics use it. */
function sources() {
  const datasetRows = new Map<string, Promise<Record<string, unknown>[]>>();
  let survey: Promise<Record<string, { all?: Record<string, number> }>> | null = null;

  const dataset = (id: string) => {
    if (!datasetRows.has(id)) {
      datasetRows.set(
        id,
        query<{ data: unknown }>("SELECT data FROM manual_dataset_rows WHERE dataset_id = ? ORDER BY sort_order", [id]).then(
          (rows) => rows.map((r) => (asJson(r.data) ?? {}) as Record<string, unknown>),
        ),
      );
    }
    return datasetRows.get(id)!;
  };

  const surveyScores = () => {
    survey ??= sheetsAnalytics({ method: "POST", query: new URLSearchParams(), body: {}, headers: {}, user: null }).then(
      (res) => ((res.body as { survey?: Record<string, { all?: Record<string, number> }> })?.survey ?? {}),
    );
    return survey;
  };

  return { dataset, surveyScores };
}

async function lookupFor(metric: MetricRow, src: ReturnType<typeof sources>): Promise<Lookup | string> {
  if (metric.source_type !== "dynamic") {
    if (!metric.dataset_id || !metric.value_column || !metric.period_column) return "This metric has no dataset set up.";
    const config: AggregationConfig = {
      value_column: metric.value_column,
      period_column: metric.period_column,
      aggregation: metric.aggregation,
      aggregation_options: asJson(metric.aggregation_options) as AggregationConfig["aggregation_options"],
    };
    const series = periodSeries(await src.dataset(metric.dataset_id), config, "quarterly");
    return (quarter) => series.find((p) => p.period === quarter) ?? null;
  }

  const index = metric.source_key.indexOf(":");
  const kind = index === -1 ? metric.source_key : metric.source_key.slice(0, index);
  const item = index === -1 ? "" : metric.source_key.slice(index + 1);

  if (kind === "figma") {
    const column = FIGMA_COLUMNS[metric.source_field];
    if (!column) return "Unknown Figma value.";
    let fileKey = item;
    if (!fileKey) {
      // Older metrics stored plain "figma" and read the first library in Settings.
      const [config] = await query<{ config: unknown }>("SELECT config FROM data_source_configs WHERE source_key = 'figma'");
      const libraries = (asJson(config?.config) as { libraries?: { fileKey?: string }[] } | null)?.libraries ?? [];
      fileKey = libraries.find((l) => l.fileKey)?.fileKey ?? "";
    }
    const rows = await query<{ quarter: string; value: number | null }>(
      `SELECT quarter, \`${column}\` AS value FROM figma_adoption_snapshots WHERE file_key = ?`,
      [fileKey],
    );
    return (quarter) => {
      const row = rows.find((r) => r.quarter === quarter);
      return row && row.value !== null ? { value: Number(row.value), rows: 1 } : null;
    };
  }

  if (kind === "code_adoption") {
    if (!CODE_COLUMNS.has(metric.source_field)) return "Unknown code adoption value.";
    const rows = await query<{ generated_at: string; value: number | null }>(
      `SELECT generated_at, \`${metric.source_field}\` AS value FROM code_adoption_snapshots WHERE repo = ?`,
      [item],
    );
    // One value per weekly report; a quarter is their average, as on the Metrics pages.
    return (quarter) =>
      average(
        rows
          .filter((r) => r.value !== null && bucketPeriod(r.generated_at.slice(0, 10), "quarterly") === quarter)
          .map((r) => Number(r.value)),
      );
  }

  if (kind === "survey_sheet") {
    const survey = await src.surveyScores();
    return (quarter) => {
      const value = survey[quarter]?.all?.[metric.source_field];
      return value === undefined || value === null ? null : { value: Number(value), rows: 1 };
    };
  }

  if (kind === "ga4_documentation") return "Google Analytics values only cover the last 90 days, not whole quarters.";
  return "This metric's source can't be read by quarter.";
}

/** The metrics the Impact page shows: its group's and its subgroups', in their order there. */
export async function impactMetricIds(): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT m.id FROM manual_metrics m
       JOIN metric_groups g ON g.slug = 'impact' AND g.parent_id IS NULL
      WHERE m.archived = 0
        AND (m.surface = g.name OR m.subgroup_id IN (SELECT s.id FROM metric_groups s WHERE s.parent_id = g.id))
      ORDER BY m.sort_order, m.name`,
  );
  return rows.map((r) => r.id);
}

export async function reportMetrics(metricIds: string[], quarter: string, previous: string): Promise<ReportMetric[]> {
  if (!metricIds.length) return [];
  const rows = await query<MetricRow>(
    `SELECT id, name, unit, direction, archived, dataset_id, value_column, period_column, aggregation, aggregation_options,
            source_type, source_key, source_field
       FROM manual_metrics WHERE id IN (?)`,
    [metricIds],
  );
  const byId = new Map(rows.filter((r) => !r.archived).map((r) => [r.id, r]));
  const src = sources();

  return Promise.all(
    metricIds
      .map((id) => byId.get(id))
      .filter((m): m is MetricRow => Boolean(m))
      .map(async (metric): Promise<ReportMetric> => {
        const base = {
          id: metric.id,
          name: metric.name,
          unit: metric.unit ?? "",
          direction: (["up", "down", "none"].includes(metric.direction) ? metric.direction : "up") as ReportMetric["direction"],
        };
        try {
          const lookup = await lookupFor(metric, src);
          if (typeof lookup === "string") return { ...base, value: null, previous: null, rows: null, unavailable: lookup };
          const current = lookup(quarter);
          return { ...base, value: current?.value ?? null, previous: lookup(previous)?.value ?? null, rows: current?.rows ?? null };
        } catch (e) {
          console.error(`slack report: could not read metric ${metric.name}`, e);
          return { ...base, value: null, previous: null, rows: null, unavailable: "Couldn't read this metric's data." };
        }
      }),
  );
}
