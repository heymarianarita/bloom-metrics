import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { query, toIso } from "../db.ts";
import type { FnHandler } from "../functions/types.ts";
import ga4Analytics from "../functions/ga4-analytics.ts";
import sheetsAnalytics from "../functions/sheets-analytics.ts";

/**
 * Read-only tools the Insights chat can call to look at the app's data.
 *
 * They only read what the pages already show to any visitor (the public
 * tables, the stored Figma and GA4 snapshots, the survey sheet). Nothing here
 * writes, and credentials or user tables are never reachable.
 */

/** Tool results above this size are cut, so one broad call can't flood the context. */
const MAX_RESULT_CHARS = 60_000;

const asJson = (v: unknown) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const callFunction = async (fn: FnHandler, body: Record<string, unknown>) => {
  const res = await fn({ method: "POST", query: new URLSearchParams(), body, headers: {}, user: null });
  return res.body as Record<string, any>;
};

/** Chronological rank of a period label (2026-Q2, 2026-03, 2026-03-05…). Mirrors periodRank in the app. */
const periodRank = (period: string): number | null => {
  const value = period.trim();
  const quarter = value.match(/^(\d{4})[-\s]?Q([1-4])$/i) ?? value.match(/^Q([1-4])[-\s](\d{4})$/i);
  if (quarter) {
    const year = Number(quarter[1].length === 4 ? quarter[1] : quarter[2]);
    const q = Number(quarter[1].length === 4 ? quarter[2] : quarter[1]);
    return Date.UTC(year, (q - 1) * 3, 1);
  }
  const iso = value.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2] ?? 1) - 1, Number(iso[3] ?? 1));
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const byPeriod = (a: string, b: string) => (periodRank(a) ?? 0) - (periodRank(b) ?? 0) || a.localeCompare(b);

const matchesFilters = (data: Record<string, unknown>, filters?: Record<string, string | string[]>) =>
  Object.entries(filters ?? {}).every(([col, want]) => {
    const have = String(data?.[col] ?? "").trim().toLowerCase();
    const wanted = (Array.isArray(want) ? want : [want]).map((w) => String(w).trim().toLowerCase());
    return wanted.includes(have);
  });

const findDataset = async (ref: string) => {
  const rows = await query<{ id: string; slug: string; name: string }>(
    "SELECT id, slug, name FROM manual_datasets WHERE id = ? OR slug = ? OR name = ? LIMIT 1",
    [ref, ref, ref],
  );
  return rows[0];
};

// ---- Tool implementations --------------------------------------------------

const filtersSchema = z
  .record(z.union([z.string(), z.array(z.string())]))
  .optional()
  .describe("Only rows whose column equals one of the values, e.g. {\"role\": \"Designer\"}. Case-insensitive.");

const listSources = async () => {
  const [groups, metrics, datasets, columns, counts, figma, ga4, templates, perfQuarters] = await Promise.all([
    query("SELECT name, slug, periodicity, description FROM metric_groups ORDER BY sort_order"),
    query<Record<string, any>>(
      `SELECT slug, name, unit, surface, description, dataset_id, value_column, period_column, aggregation,
              source_type, source_key, source_field, filter_columns
         FROM manual_metrics WHERE archived = 0 ORDER BY surface, sort_order`,
    ),
    query<{ id: string; slug: string; name: string; description: string }>(
      "SELECT id, slug, name, description FROM manual_datasets WHERE archived = 0 ORDER BY sort_order",
    ),
    query<{ dataset_id: string; key: string; label: string; kind: string }>(
      "SELECT dataset_id, `key`, label, kind FROM manual_dataset_columns ORDER BY sort_order",
    ),
    query<{ dataset_id: string; n: number }>("SELECT dataset_id, COUNT(*) AS n FROM manual_dataset_rows GROUP BY dataset_id"),
    query<{ file_key: string; file_name: string | null; quarters: number; first: string; last: string }>(
      `SELECT file_key, MAX(file_name) AS file_name, COUNT(*) AS quarters, MIN(quarter) AS first, MAX(quarter) AS last
         FROM figma_adoption_snapshots GROUP BY file_key`,
    ),
    query<{ range_start: string; range_end: string; properties: unknown; created_at: string }>(
      "SELECT range_start, range_end, properties, created_at FROM ga4_report_snapshots ORDER BY created_at DESC LIMIT 1",
    ),
    query("SELECT slug, name FROM ai_template_definitions WHERE archived = 0 ORDER BY sort_order"),
    query<{ quarter: string }>("SELECT DISTINCT quarter FROM performance_entries"),
  ]);
  const datasetName = new Map(datasets.map((d) => [d.id, d.slug]));
  const latestGa4 = ga4[0];
  return {
    metricGroups: groups,
    metrics: metrics.map(({ dataset_id, filter_columns, ...m }) => ({
      ...m,
      dataset: dataset_id ? datasetName.get(dataset_id) ?? dataset_id : null,
      filterColumns: asJson(filter_columns),
    })),
    datasets: datasets.map((d) => ({
      slug: d.slug,
      name: d.name,
      description: d.description,
      rowCount: counts.find((c) => c.dataset_id === d.id)?.n ?? 0,
      columns: columns.filter((c) => c.dataset_id === d.id).map(({ key, label, kind }) => ({ key, label, kind })),
    })),
    figmaLibraries: figma,
    ga4: latestGa4
      ? {
          latestSnapshot: { range: [latestGa4.range_start, latestGa4.range_end], receivedAt: toIso(latestGa4.created_at) },
          properties: ((asJson(latestGa4.properties) as any[]) ?? []).map((p) => ({
            id: p.id,
            label: p.label,
            periodKeys: Object.keys(p.periods ?? {}),
          })),
        }
      : null,
    aiTemplates: templates,
    performanceQuarters: perfQuarters.map((q) => q.quarter).sort(byPeriod),
  };
};

const datasetRowsInput = z.object({
  dataset: z.string().describe("Dataset slug (from list_data_sources)."),
  filters: filtersSchema,
  columns: z.array(z.string()).optional().describe("Only return these column keys (default: all)."),
  limit: z.number().int().min(1).max(2000).optional().describe("Max rows to return (default 500)."),
});

const getDatasetRows = async (input: z.infer<typeof datasetRowsInput>) => {
  const dataset = await findDataset(input.dataset);
  if (!dataset) return { error: `No dataset "${input.dataset}". Call list_data_sources for the slugs.` };
  const rows = await query<{ data: unknown }>(
    "SELECT data FROM manual_dataset_rows WHERE dataset_id = ? ORDER BY sort_order",
    [dataset.id],
  );
  const matching = rows.map((r) => (asJson(r.data) ?? {}) as Record<string, unknown>).filter((d) => matchesFilters(d, input.filters));
  const limit = input.limit ?? 500;
  const pick = (d: Record<string, unknown>) =>
    input.columns?.length ? Object.fromEntries(input.columns.map((c) => [c, d[c]])) : d;
  return {
    dataset: dataset.slug,
    totalRows: rows.length,
    matchingRows: matching.length,
    returned: Math.min(limit, matching.length),
    rows: matching.slice(0, limit).map(pick),
  };
};

const metricSeriesInput = z.object({
  metric: z.string().describe("Metric slug or name (from list_data_sources)."),
  filters: filtersSchema,
  groupBy: z.string().optional().describe("Dataset column to split the series by (e.g. \"role\"): one series per value."),
});

/** Per-period values for a dataset-backed metric, aggregated the way the Metrics pages do. */
const getMetricSeries = async (input: z.infer<typeof metricSeriesInput>) => {
  const metric = (
    await query<Record<string, any>>(
      "SELECT * FROM manual_metrics WHERE (slug = ? OR name = ?) AND archived = 0 LIMIT 1",
      [input.metric, input.metric],
    )
  )[0];
  if (!metric) return { error: `No metric "${input.metric}". Call list_data_sources for the slugs.` };

  const manualValues = await query<{ period: string; value: number; note: string }>(
    "SELECT period, value, note FROM manual_metric_values WHERE metric_id = ?",
    [metric.id],
  );
  if (metric.source_type === "dynamic") {
    return {
      metric: metric.name,
      note: `This metric is read live from "${metric.source_key}" (field "${metric.source_field}"). Use the Figma, GA4 or survey tools instead.`,
      manualValues,
    };
  }
  if (!metric.dataset_id || !metric.value_column || !metric.period_column) {
    return { metric: metric.name, unit: metric.unit, values: manualValues.sort((a, b) => byPeriod(a.period, b.period)) };
  }

  const rows = (
    await query<{ data: unknown }>("SELECT data FROM manual_dataset_rows WHERE dataset_id = ? ORDER BY sort_order", [
      metric.dataset_id,
    ])
  )
    .map((r) => (asJson(r.data) ?? {}) as Record<string, unknown>)
    .filter((d) => matchesFilters(d, input.filters));

  const aggregate = (subset: Record<string, unknown>[]) => {
    const buckets = new Map<string, number[]>();
    subset.forEach((d) => {
      const period = String(d[metric.period_column] ?? "").trim();
      const num = Number(d[metric.value_column]);
      if (!period || !Number.isFinite(num)) return;
      buckets.set(period, [...(buckets.get(period) ?? []), num]);
    });
    return Array.from(buckets.entries())
      .map(([period, nums]) => {
        const total = nums.reduce((s, n) => s + n, 0);
        const value =
          metric.aggregation === "avg"
            ? total / nums.length
            : metric.aggregation === "latest"
              ? nums[nums.length - 1]
              : metric.aggregation === "count"
                ? nums.length
                : total;
        return { period, value: Number(value.toFixed(3)), rows: nums.length };
      })
      .sort((a, b) => byPeriod(a.period, b.period));
  };

  const base = {
    metric: metric.name,
    unit: metric.unit,
    aggregation: metric.aggregation,
    periodColumn: metric.period_column,
    valueColumn: metric.value_column,
    note: "Raw periods from the dataset (oldest first). The page may bucket them by the group's periodicity.",
  };
  if (input.groupBy) {
    const groups = new Map<string, Record<string, unknown>[]>();
    rows.forEach((d) => {
      const key = String(d[input.groupBy!] ?? "(blank)").trim() || "(blank)";
      groups.set(key, [...(groups.get(key) ?? []), d]);
    });
    return {
      ...base,
      groupBy: input.groupBy,
      series: Object.fromEntries(Array.from(groups.entries()).map(([k, subset]) => [k, aggregate(subset)])),
    };
  }
  return { ...base, values: aggregate(rows) };
};

const figmaHistoryInput = z.object({
  fileKey: z.string().optional().describe("Library file key (default: all libraries)."),
});

const getFigmaHistory = async (input: z.infer<typeof figmaHistoryInput>) => {
  const rows = await query<Record<string, unknown>>(
    "SELECT file_key, file_name, quarter, period_start, period_end, inserts, detaches, usages, component_count, " +
      "components_used, documented_count, documentation_coverage, detach_rate " +
      `FROM figma_adoption_snapshots${input.fileKey ? " WHERE file_key = ?" : ""} ORDER BY file_key, quarter`,
    input.fileKey ? [input.fileKey] : [],
  );
  return {
    note: "One row per library per quarter. detach_rate and documentation_coverage are fractions or percentages as stored. Figma keeps about 12 months of analytics.",
    snapshots: rows,
  };
};

const figmaComponentsInput = z.object({
  fileKey: z.string().describe("Library file key."),
  quarter: z.string().optional().describe("e.g. 2026-Q2 (default: latest captured quarter)."),
  sortBy: z.enum(["inserts", "detaches", "usages", "detach_rate", "name"]).optional().describe("Default: inserts."),
  order: z.enum(["desc", "asc"]).optional().describe("Default: desc."),
  search: z.string().optional().describe("Only components whose name or page contains this text."),
  undocumentedOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional().describe("Default 50."),
});

const getFigmaComponents = async (input: z.infer<typeof figmaComponentsInput>) => {
  const rows = await query<{ file_name: string | null; quarter: string; components: unknown }>(
    `SELECT file_name, quarter, components FROM figma_adoption_snapshots WHERE file_key = ?
       ${input.quarter ? "AND quarter = ?" : ""} ORDER BY quarter DESC LIMIT 1`,
    input.quarter ? [input.fileKey, input.quarter] : [input.fileKey],
  );
  const row = rows[0];
  if (!row) return { error: "No snapshot for that library/quarter. Call get_figma_history to see what exists." };
  type C = { name: string; page?: string; inserts?: number; detaches?: number; usages?: number; documented?: boolean };
  let comps = ((asJson(row.components) as C[]) ?? []).map((c) => ({
    ...c,
    detach_rate: c.inserts ? Number(((c.detaches ?? 0) / c.inserts).toFixed(3)) : null,
  }));
  const total = comps.length;
  if (input.search) {
    const s = input.search.toLowerCase();
    comps = comps.filter((c) => `${c.name} ${c.page ?? ""}`.toLowerCase().includes(s));
  }
  if (input.undocumentedOnly) comps = comps.filter((c) => !c.documented);
  const key = input.sortBy ?? "inserts";
  const dir = input.order === "asc" ? 1 : -1;
  comps.sort((a, b) =>
    key === "name" ? dir * a.name.localeCompare(b.name) : dir * (((a as any)[key] ?? -1) - ((b as any)[key] ?? -1)),
  );
  return {
    library: row.file_name,
    quarter: row.quarter,
    totalComponents: total,
    matching: comps.length,
    components: comps.slice(0, input.limit ?? 50),
  };
};

const ga4Input = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default: 90 days ago)."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default: today)."),
  property: z.string().optional().describe("Property id or label (default: all)."),
  includeDaily: z.boolean().optional().describe("Include the day-by-day rows (large)."),
  topPagesLimit: z.number().int().min(0).max(200).optional().describe("Top pages per property (default 15)."),
});

const getGa4Report = async (input: z.infer<typeof ga4Input>) => {
  const report = await callFunction(ga4Analytics, { startDate: input.startDate, endDate: input.endDate });
  if (!report?.ok) return { error: report?.error ?? "No Google Analytics data", details: report?.details };
  const want = input.property?.toLowerCase();
  const topN = input.topPagesLimit ?? 15;
  return {
    note: "Served from the latest stored GA4 export overlapping the range; check `range` for the dates it actually covers. `periods` holds preset windows with previous-period and year-ago totals.",
    range: report.range,
    refreshedAt: report.refreshedAt,
    properties: (report.properties ?? [])
      .filter((p: any) => !want || String(p.id) === want || String(p.label).toLowerCase().includes(want))
      .map((p: any) => ({
        id: p.id,
        label: p.label,
        totals: p.totals,
        periods: Object.fromEntries(
          Object.entries(p.periods ?? {}).map(([k, v]: [string, any]) => [
            k,
            { range: v?.range, previousRange: v?.previousRange, totals: v?.totals, previousTotals: v?.previousTotals, yearAgoTotals: v?.yearAgoTotals, topPages: (v?.pages ?? []).slice(0, topN) },
          ]),
        ),
        topPages: (p.topPages ?? []).slice(0, topN),
        ...(input.includeDaily ? { daily: p.daily } : { dailyRows: (p.daily ?? []).length }),
        error: p.error,
      })),
  };
};

const surveyInput = z.object({
  quarter: z.string().optional().describe("Only this quarter, e.g. 2026-Q2 (default: all quarters)."),
  sections: z
    .array(z.enum(["survey", "milestones", "rag", "okrs"]))
    .optional()
    .describe("Which tabs to return (default: all)."),
});

const getSurveyResults = async (input: z.infer<typeof surveyInput>) => {
  const data = await callFunction(sheetsAnalytics, {});
  if (!data?.configured) return { error: data?.error ?? "The survey sheet is not configured" };
  const sections = input.sections ?? ["survey", "milestones", "rag", "okrs"];
  const q = input.quarter;
  const byQuarter = (obj: Record<string, unknown> | undefined) =>
    q ? Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => k === q)) : obj;
  const rowsInQuarter = (rows: any[] | undefined) => (q ? (rows ?? []).filter((r) => !r.quarter || r.quarter === q) : rows);
  return {
    quarters: data.quarters,
    refreshedAt: data.refreshedAt,
    note: "Survey scores per quarter: `all`, plus breakdowns `byRole` and `byBU` (business unit), each with a response count where available.",
    ...(sections.includes("survey") && { survey: byQuarter(data.survey) }),
    ...(sections.includes("milestones") && { milestones: rowsInQuarter(data.milestones) }),
    ...(sections.includes("rag") && { rag: byQuarter(data.rag) }),
    ...(sections.includes("okrs") && { okrs: rowsInQuarter(data.okrs) }),
  };
};

const performanceInput = z.object({
  quarter: z.string().optional().describe("e.g. 2026-Q2 (default: all)."),
  team: z.string().optional().describe("Only teams whose name contains this text."),
});

const getPerformanceEntries = async (input: z.infer<typeof performanceInput>) => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (input.quarter) {
    where.push("quarter = ?");
    params.push(input.quarter);
  }
  if (input.team) {
    where.push("team LIKE ?");
    params.push(`%${input.team}%`);
  }
  const rows = await query(
    `SELECT quarter, team, intended_outcomes, main_deliverables, headcount, discovery_rag, delivery_rag, impact_rag, comment
       FROM performance_entries ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY quarter, sort_order`,
    params,
  );
  return { note: "RAG = Red/Amber/Green grades for discovery, delivery and impact.", entries: rows };
};

const getAiTemplateMetrics = async () => {
  const rows = await query(
    `SELECT d.name AS template, m.quarter, m.prototypes_created, m.active_users, m.active_teams, m.prototypes_off_bloom, m.note
       FROM ai_template_metrics m JOIN ai_template_definitions d ON d.id = m.template_id
      WHERE d.archived = 0 ORDER BY d.sort_order, m.quarter`,
  );
  return { entries: rows };
};

// ---- Registry ----------------------------------------------------------------

interface ToolDef<S extends z.ZodTypeAny> {
  description: string;
  /** Short progress label shown in the chat while the tool runs. */
  status: string;
  input: S;
  run: (input: z.infer<S>) => Promise<unknown>;
}

/** Typed per tool here, so each run() sees its parsed input; stored loosely in TOOLS. */
const tool = <S extends z.ZodTypeAny>(def: ToolDef<S>) => def as unknown as ToolDef<z.ZodTypeAny>;

const TOOLS: Record<string, ToolDef<z.ZodTypeAny>> = {
  list_data_sources: tool({
    description:
      "Catalog of everything that can be queried: metric groups, metrics (with their dataset, value/period columns, aggregation and filterable columns), datasets with their columns and row counts, Figma libraries with captured quarters, GA4 properties, AI templates and performance quarters. Call this first when you don't yet know the slugs or columns.",
    status: "Looking at available data",
    input: z.object({}),
    run: listSources,
  }),
  get_metric_series: tool({
    description:
      "Per-period values of a dataset-backed metric, aggregated like the Metrics pages (sum/avg/latest/count per period). Optionally filter rows (e.g. one business unit) or split the series by a column (groupBy) to compare segments. Includes the number of underlying rows per period (sample size).",
    status: "Calculating metric values",
    input: metricSeriesInput,
    run: getMetricSeries,
  }),
  get_dataset_rows: tool({
    description:
      "Raw rows of a manual dataset (e.g. survey responses or adoption records), optionally filtered by column values and limited to some columns. Use for drill-downs the metric series can't answer.",
    status: "Reading dataset rows",
    input: datasetRowsInput,
    run: getDatasetRows,
  }),
  get_figma_history: tool({
    description:
      "Quarterly Figma library adoption snapshots: inserts, detaches, usages, detach rate, component counts, components used, documentation coverage.",
    status: "Reading Figma history",
    input: figmaHistoryInput,
    run: getFigmaHistory,
  }),
  get_figma_components: tool({
    description:
      "Per-component Figma stats for one library and quarter (inserts, detaches, usages, detach rate, documented). Sort, search and filter to find top/bottom components.",
    status: "Reading Figma components",
    input: figmaComponentsInput,
    run: getFigmaComponents,
  }),
  get_ga4_report: tool({
    description:
      "Google Analytics (documentation sites): totals per property (active users, new users, sessions, page views, engagement), preset periods with previous-period and year-ago comparisons, and top pages.",
    status: "Reading Google Analytics",
    input: ga4Input,
    run: getGa4Report,
  }),
  get_survey_results: tool({
    description:
      "Survey sheet: satisfaction/efficiency/discoverability/confidence/handoff/UMUX scores per quarter with breakdowns by role and business unit, plus milestones, RAG grades and OKRs.",
    status: "Reading survey results",
    input: surveyInput,
    run: getSurveyResults,
  }),
  get_performance_entries: tool({
    description: "Quarterly team performance entries: intended outcomes, deliverables, headcount and discovery/delivery/impact RAG grades.",
    status: "Reading team performance",
    input: performanceInput,
    run: getPerformanceEntries,
  }),
  get_ai_template_metrics: tool({
    description: "AI prototyping template metrics per quarter: prototypes created, active users, active teams, prototypes made off Bloom.",
    status: "Reading AI template metrics",
    input: z.object({}),
    run: getAiTemplateMetrics,
  }),
};

export const toolDefinitions = (): Anthropic.Beta.BetaTool[] =>
  Object.entries(TOOLS).map(([name, def]) => ({
    name,
    description: def.description,
    input_schema: zodToJsonSchema(def.input),
    eager_input_streaming: true,
  }));

export const toolStatus = (name: string) => TOOLS[name]?.status ?? "Looking at the data";

/** Validates and runs one tool call. Returns the text for the tool_result and whether it failed. */
export async function runTool(name: string, rawInput: unknown): Promise<{ content: string; isError: boolean }> {
  const def = TOOLS[name];
  if (!def) return { content: `Unknown tool ${name}`, isError: true };
  const parsed = def.input.safeParse(rawInput ?? {});
  if (!parsed.success) return { content: `Invalid input: ${parsed.error.message}`, isError: true };
  try {
    let text = JSON.stringify(await def.run(parsed.data));
    if (text.length > MAX_RESULT_CHARS) {
      text = `${text.slice(0, MAX_RESULT_CHARS)}… [truncated: ask for fewer rows/columns or add filters]`;
    }
    return { content: text, isError: false };
  } catch (e) {
    console.error(`insights tool ${name} failed`, e);
    return { content: `The tool failed: ${e instanceof Error ? e.message : String(e)}`, isError: true };
  }
}

/** Minimal Zod → JSON Schema for the shapes used above (objects, strings, numbers, booleans, enums, arrays, records). */
function zodToJsonSchema(schema: z.ZodTypeAny): Anthropic.Beta.BetaTool.InputSchema {
  const convert = (s: z.ZodTypeAny): Record<string, unknown> => {
    const description = s.description ? { description: s.description } : {};
    if (s instanceof z.ZodOptional) return { ...convert(s.unwrap()), ...description };
    if (s instanceof z.ZodString) return { type: "string", ...description };
    if (s instanceof z.ZodNumber) return { type: s.isInt ? "integer" : "number", ...description };
    if (s instanceof z.ZodBoolean) return { type: "boolean", ...description };
    if (s instanceof z.ZodEnum) return { type: "string", enum: s.options, ...description };
    if (s instanceof z.ZodArray) return { type: "array", items: convert(s.element), ...description };
    if (s instanceof z.ZodUnion) return { anyOf: s.options.map(convert), ...description };
    if (s instanceof z.ZodRecord) return { type: "object", additionalProperties: convert(s.valueSchema), ...description };
    if (s instanceof z.ZodObject) {
      const shape = s.shape as Record<string, z.ZodTypeAny>;
      return {
        type: "object",
        properties: Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, convert(v)])),
        required: Object.entries(shape).filter(([, v]) => !v.isOptional()).map(([k]) => k),
        ...description,
      };
    }
    throw new Error("Unsupported schema in insights tools");
  };
  return convert(schema) as Anthropic.Beta.BetaTool.InputSchema;
}
