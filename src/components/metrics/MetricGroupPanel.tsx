import * as React from "react";
import { useSectionHeading } from "@/components/metrics/sectionHeading";
import { cn } from "@/lib/utils";
import { ChartBar, Info } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignStatGroup } from "@/components/ds/DesignStatGroup";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignChip } from "@/components/ds/DesignChip";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { byTabOrder, hasScaleLabels, scaleLabelFor, SCALE_POINTS, useManualMetrics, type BreakdownView, type ManualMetric } from "@/hooks/useManualMetrics";
import {
  aggregateDataset,
  comparePeriods,
  useDatasetColumns,
  useDatasetRows,
  type ManualDatasetRow,
} from "@/hooks/useManualDatasets";
import { useDynamicMetricSeries } from "@/hooks/useDynamicMetricSeries";
import MetricBreakdowns from "@/components/metrics/MetricBreakdowns";
import MergedBreakdowns from "@/components/metrics/MergedBreakdowns";
import { useMetricGroups, PERIODICITY_OPTIONS, type Periodicity } from "@/hooks/useMetricGroups";
import { bucketSeries, type SeriesPoint } from "@/lib/periodBuckets";
import { bucketPeriod } from "../../../server/shared/periods.ts";
import { QualitativeSection } from "@/components/metrics/QualitativeSection";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { LINE_COLORS } from "@/lib/chartColors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


const ALL = "__all__";
/** The "All …" choice of a segment select. */
export const ALL_SEGMENT_VALUES = ALL;

const PREVIOUS = "__previous__";

const formatNumber = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const formatValue = (value: number | undefined, unit: string) => {
  const rounded = formatNumber(value);
  if (rounded === "—") return rounded;
  return unit ? `${rounded}${unit === "%" ? "%" : ` ${unit}`}` : rounded;
};

/** The metric as a view shows it: the placement's filters and breakdowns, where it sets them. */
/** A widget's say over how a metric is filtered and broken down on its page. */
export interface MetricDisplayOptions {
  filter_columns?: string[];
  breakdown_views?: Record<string, BreakdownView>;
}

/** Which parts of the panel a widget draws; everything when left out. */
export interface MetricPanelParts {
  cards?: boolean;
  trend?: boolean;
  distribution?: boolean;
  breakdowns?: boolean;
}

const withDisplayOptions = (metric: ManualMetric, options?: MetricDisplayOptions): ManualMetric =>
  options
    ? {
        ...metric,
        filter_columns: options.filter_columns ?? metric.filter_columns,
        breakdown_views: options.breakdown_views ?? metric.breakdown_views,
      }
    : metric;

/** How many responses gave each score (1–5) in one period, for rating metrics. */
export interface ScoreDistribution {
  period: string;
  total: number;
  counts: Record<string, number>;
}

/** Facet values a single metric contributes to the shared filter bar. */
interface Facets {
  periods: string[];
  /** Values available per configured filter column, keyed by its label. */
  segments: Record<string, string[]>;
}

export interface MetricFilters {
  period: string;
  compare: string;
  /** Selected value per filter column label. */
  segments: Record<string, string>;
}
type Filters = MetricFilters;

/** Periods (newest first) and segment values the shown metrics offer to the filter bar. */
export interface MetricFacets {
  periods: string[];
  segments: { label: string; values: string[] }[];
}

/** Starting filters: the newest period against the one before, resolved once periods are known. */
export const INITIAL_METRIC_FILTERS: MetricFilters = { period: ALL, compare: PREVIOUS, segments: {} };

/** Turns the "newest" and "previous" placeholders into real periods once the periods are known. */
export const resolveMetricFilters = (prev: MetricFilters, periods: string[]): MetricFilters => {
  if (periods.length === 0) return prev;
  const next = { ...prev };
  if (prev.period === ALL) next.period = periods[0];
  if (prev.compare === PREVIOUS) next.compare = periods[1] ?? periods[0];
  return next.period === prev.period && next.compare === prev.compare ? prev : next;
};

/** Period, comparison period and segment selects. */
export const MetricFilterBar = ({
  facets,
  filters,
  onChange,
  extra,
}: {
  facets: MetricFacets;
  filters: MetricFilters;
  onChange: React.Dispatch<React.SetStateAction<MetricFilters>>;
  /** Shown at the end of the row, e.g. a response count. */
  extra?: React.ReactNode;
}) => {
  const periodOptions = facets.periods.map((period) => ({ value: period, label: period }));
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <DesignInputSelect
          className="w-[140px]"
          size="small"
          options={periodOptions}
          value={filters.period}
          onChange={(value) => onChange((prev) => ({ ...prev, period: value }))}
        />
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">vs</span>
        <DesignInputSelect
          className="w-[140px]"
          size="small"
          options={periodOptions}
          value={filters.compare}
          onChange={(value) => onChange((prev) => ({ ...prev, compare: value }))}
        />
      </div>
      {facets.segments.length > 0 && (
        <>
          <div className="hidden sm:block h-6 w-px bg-border" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            {facets.segments.map((segment) => (
              <DesignInputSelect
                key={segment.label}
                className="w-[160px]"
                size="small"
                options={[
                  { value: ALL, label: `All ${segment.label.toLowerCase()}s` },
                  ...segment.values.map((value) => ({ value, label: value })),
                ]}
                value={filters.segments[segment.label] ?? ALL}
                onChange={(value) =>
                  onChange((prev) => ({
                    ...prev,
                    segments: { ...prev.segments, [segment.label]: value },
                  }))
                }
              />
            ))}
          </div>
        </>
      )}
      {extra}
    </div>
  );
};

const distinct = (rows: ManualDatasetRow[], key?: string) =>
  key
    ? Array.from(
        new Set(
          rows
            .map((row) => String(row.data?.[key] ?? "").trim())
            .filter((value) => value.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b))
    : [];

/** Under the trend chart: for each rating metric, the share of responses per score (1–5) with its label. */
const ScoreDistributions = ({
  metrics,
  distributions,
}: {
  metrics: ManualMetric[];
  distributions: Record<string, ScoreDistribution | null>;
}) => {
  const heading = useSectionHeading("How people answered");
  const rated = metrics.filter((m) => distributions[m.id]);
  if (rated.length === 0) return null;
  const period = distributions[rated[0].id]?.period;
  return (
    <section className="pt-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[16px] font-medium text-foreground">{heading}</p>
        <p className="text-[12px] text-muted-foreground">{period}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 mt-3">
        {rated.map((m) => {
          const d = distributions[m.id]!;
          const max = Math.max(...SCALE_POINTS.map((p) => d.counts[p] ?? 0), 1);
          return (
            <div key={m.id} className="rounded-[6px] border border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{d.total} responses</p>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {SCALE_POINTS.map((p) => {
                  const count = d.counts[p] ?? 0;
                  const share = d.total ? (count / d.total) * 100 : 0;
                  const label = m.scale_labels?.[p]?.trim();
                  return (
                    <div key={p}>
                      <p className="text-xs text-foreground">
                        {p}
                        {label ? ` – ${label}` : ""}
                        <span className="text-muted-foreground"> · {share.toFixed(share > 0 && share < 10 ? 1 : 0)}%</span>
                      </p>
                      <div className="h-1.5 rounded-full bg-muted mt-1" aria-hidden="true">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** The full 1–5 scale of a rating metric, behind an info icon on its card. */
const ScaleInfo = ({ metric }: { metric: ManualMetric }) => (
  <DesignTooltip
    content={
      <div className="space-y-1">
        <p className="font-medium">What the scores mean</p>
        {SCALE_POINTS.filter((p) => metric.scale_labels?.[p]?.trim()).map((p) => (
          <p key={p}>
            <span className="font-medium">{p}</span> = {metric.scale_labels[p]}
          </p>
        ))}
      </div>
    }
  >
    <button type="button" aria-label={`What the ${metric.name} scores mean`} className="flex hover:text-foreground">
      <Info size={14} />
    </button>
  </DesignTooltip>
);

/** One configured metric, reading either a dataset entered here or a connected live source. */
const MetricStat = ({
  metric,
  filters,
  periodicity,
  onFacets,
  onSeries,
  onDistribution,
}: {
  metric: ManualMetric;
  filters: Filters;
  periodicity: Periodicity;
  onFacets: (id: string, facets: Facets) => void;
  onSeries: (id: string, points: SeriesPoint[]) => void;
  onDistribution?: (id: string, distribution: ScoreDistribution | null) => void;
}) => {
  const isDataset = metric.source_type !== "dynamic";
  const datasetId = isDataset ? metric.dataset_id ?? undefined : undefined;
  const rows = useDatasetRows(datasetId);
  const columns = useDatasetColumns(datasetId);
  const dynamic = useDynamicMetricSeries(
    !isDataset ? metric.source_key : undefined,
    !isDataset ? metric.source_field : undefined,
  );

  // Columns the metric was configured to allow filtering by, resolved to label + key.
  const filterColumns = React.useMemo(() => {
    const keys = Array.isArray(metric.filter_columns) ? metric.filter_columns : [];
    return (columns.data ?? [])
      .filter((column) => keys.includes(column.key))
      .map((column) => ({ key: column.key, label: column.label }));
  }, [columns.data, metric.filter_columns]);

  const filterSignature = JSON.stringify([filterColumns, filters.segments]);
  const filteredRows = React.useMemo(() => {
    const all = rows.data ?? [];
    const [cols, segments] = JSON.parse(filterSignature) as [
      { key: string; label: string }[],
      Record<string, string>,
    ];
    return all.filter((row) =>
      cols.every((column) => {
        const selected = segments[column.label];
        if (!selected || selected === ALL) return true;
        return String(row.data?.[column.key] ?? "").trim() === selected;
      }),
    );
  }, [rows.data, filterSignature]);

  const points = React.useMemo(() => {
    const raw = !isDataset
      ? [...dynamic.points].reverse()
      : !metric.dataset_id || !metric.value_column || !metric.period_column
        ? []
        : aggregateDataset(filteredRows, metric);
    return bucketSeries(raw, periodicity);
  }, [isDataset, dynamic.points, filteredRows, metric, periodicity]);

  // Publish the periods and segments this metric knows about to the filter bar.
  const facetSignature = JSON.stringify({
    periods: points.map((point) => point.period),
    segments: Object.fromEntries(
      filterColumns.map((column) => [column.label, distinct(rows.data ?? [], column.key)]),
    ),
  });
  React.useEffect(() => {
    onFacets(metric.id, JSON.parse(facetSignature) as Facets);
  }, [facetSignature, metric.id, onFacets]);

  const seriesSignature = JSON.stringify(points);
  React.useEffect(() => {
    onSeries(metric.id, JSON.parse(seriesSignature) as SeriesPoint[]);
  }, [seriesSignature, metric.id, onSeries]);

  const currentIndex =
    filters.period === ALL ? 0 : points.findIndex((point) => point.period === filters.period);
  const latest = currentIndex >= 0 ? points[currentIndex] : undefined;
  const candidate =
    filters.compare === PREVIOUS
      ? points[(currentIndex >= 0 ? currentIndex : 0) + 1]
      : points.find((point) => point.period === filters.compare);
  // Comparing a period with itself says nothing (e.g. a live value with a single reading).
  const previous = candidate && candidate.period !== latest?.period ? candidate : undefined;

  const delta =
    latest && previous ? Number((latest.value - previous.value).toFixed(1)) : undefined;

  // For 1–5 ratings: the share of responses per score in the shown period.
  const distributionSignature = React.useMemo(() => {
    const isRating = (columns.data ?? []).find((c) => c.key === metric.value_column)?.kind === "rating";
    if (!isDataset || !isRating || !latest) return "null";
    const values = filteredRows
      .filter((row) => {
        const raw = String(row.data?.[metric.period_column] ?? "").trim();
        return raw && bucketPeriod(raw, periodicity) === latest.period;
      })
      .map((row) => Number(row.data?.[metric.value_column]))
      .filter((v) => Number.isInteger(v) && v >= 1 && v <= 5);
    if (values.length === 0) return "null";
    const counts = Object.fromEntries(SCALE_POINTS.map((p) => [p, values.filter((v) => String(v) === p).length]));
    return JSON.stringify({ period: latest.period, total: values.length, counts });
  }, [isDataset, metric, latest, filteredRows, periodicity, columns.data]);
  React.useEffect(() => {
    onDistribution?.(metric.id, JSON.parse(distributionSignature) as ScoreDistribution | null);
  }, [distributionSignature, metric.id, onDistribution]);

  const isRatingColumn = (columns.data ?? []).find((c) => c.key === metric.value_column)?.kind === "rating";
  const meaning = isRatingColumn ? scaleLabelFor(metric, latest?.value) : undefined;

  return (
    <DesignStatCard
        label={metric.name}
        icon={isRatingColumn && hasScaleLabels(metric) ? <ScaleInfo metric={metric} /> : undefined}
        note={meaning ? `≈ ${meaning.score}: ${meaning.label}` : undefined}
        // "%" stays attached to the number; word units are shown smaller beside it.
        value={metric.unit === "%" ? formatValue(latest?.value, "%") : formatNumber(latest?.value)}
        unit={metric.unit && metric.unit !== "%" && latest ? metric.unit : undefined}
        change={
          delta !== undefined
            ? `${delta >= 0 ? "+" : ""}${delta} vs ${previous?.period}`
            : (latest?.period ?? (filters.period !== ALL ? `No data for ${filters.period}` : undefined))
        }
        changeUp={delta === undefined ? true : delta >= 0}
      />
  );
};

interface MetricGroupPanelProps {
  /** Group name as configured in Metrics → All metrics. */
  group: string;
  /** Optional narrowing, e.g. only the metrics of one touchpoint. */
  match?: (metric: ManualMetric) => boolean;
  /** Exactly these metrics, in this order, whatever group they belong to (a view's placed numbers). */
  metricIds?: string[];
  /** Per metric id: how this view filters and breaks it down, over the metric's own settings. */
  displayOptions?: Record<string, MetricDisplayOptions>;
  /** Draw only these parts (a view's widget); the rest still loads the data they need. */
  parts?: MetricPanelParts;
  /** The trend's chart type. */
  trendChart?: "line" | "bar";
  /** Cards per row; automatic when left out. */
  cardColumns?: number;
  /** Overrides the empty-state title when the narrowed list is empty. */
  emptyTitle?: string;
  /** Receives each shown metric's series (latest period first), e.g. to derive insights. */
  onSeriesChange?: (series: { metric: ManualMetric; points: SeriesPoint[] }[]) => void;
  /** Shows the survey response count in the filter row (survey-based groups only). */
  showResponses?: boolean;
  /** Shows the group's qualitative insights under the numbers (off on sub-tabs). */
  showQualitative?: boolean;
  /**
   * Filters owned by the page, which then draws the filter bar itself (so it can sit at the
   * top and drive other panels too). Without them the panel keeps its own and shows its bar.
   */
  filters?: MetricFilters;
  onFiltersChange?: React.Dispatch<React.SetStateAction<MetricFilters>>;
  /** Receives the periods and segments the shown metrics offer, for a page-owned filter bar. */
  onFacetsChange?: (facets: MetricFacets) => void;
}

/** Shows every metric configured under a metric group, with period and segment filters. */
const MetricGroupPanel = ({
  group,
  match,
  metricIds,
  displayOptions,
  emptyTitle,
  onSeriesChange,
  showResponses = false,
  showQualitative = true,
  parts,
  trendChart = "line",
  cardColumns,
  filters: pageFilters,
  onFiltersChange,
  onFacetsChange,
}: MetricGroupPanelProps) => {
  const navigate = useNavigate();
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const groups = useMetricGroups();
  const topGroup = (groups.data ?? []).find((g) => !g.parent_id && g.name === group);
  const periodicity: Periodicity = (topGroup?.periodicity as Periodicity) ?? "quarterly";
  const trendHeading = useSectionHeading("Evolution over time");
  const periodicityLabel =
    PERIODICITY_OPTIONS.find((o) => o.value === periodicity)?.label ?? "Quarterly";
  const [series, setSeries] = React.useState<Record<string, SeriesPoint[]>>({});
  const [facets, setFacets] = React.useState<Record<string, Facets>>({});
  const [ownFilters, setOwnFilters] = React.useState<Filters>(INITIAL_METRIC_FILTERS);
  const pageOwned = Boolean(pageFilters && onFiltersChange);
  const filters = pageOwned ? pageFilters! : ownFilters;
  const setFilters = pageOwned ? onFiltersChange! : setOwnFilters;
  // Extra metrics from the same group, added to the trend chart for comparison.
  const [compareIds, setCompareIds] = React.useState<string[]>([]);

  const handleFacets = React.useCallback((id: string, next: Facets) => {
    setFacets((prev) => {
      const current = prev[id];
      if (current && JSON.stringify(current) === JSON.stringify(next)) return prev;
      return { ...prev, [id]: next };
    });
  }, []);

  const [distributions, setDistributions] = React.useState<Record<string, ScoreDistribution | null>>({});
  const handleDistribution = React.useCallback((id: string, next: ScoreDistribution | null) => {
    setDistributions((prev) => (JSON.stringify(prev[id]) === JSON.stringify(next) ? prev : { ...prev, [id]: next }));
  }, []);

  const handleSeries = React.useCallback((id: string, points: SeriesPoint[]) => {
    setSeries((prev) => {
      if (prev[id] && JSON.stringify(prev[id]) === JSON.stringify(points)) return prev;
      return { ...prev, [id]: points };
    });
  }, []);

  const groupMetrics = metricIds
    ? metricIds
        .map((id) => (metrics.data ?? []).find((metric) => metric.id === id))
        .filter((metric): metric is ManualMetric => Boolean(metric))
        .map((metric) => withDisplayOptions(metric, displayOptions?.[metric.id]))
    : (metrics.data ?? [])
        .filter((metric) => !metric.archived && metric.surface === group && (!match || match(metric)))
        // In the order set in Metrics → All metrics (alphabetical until arranged there).
        .sort(byTabOrder);

  // Other metrics in the same group that can be laid over the trend chart.
  const comparableMetrics = (metrics.data ?? []).filter(
    (metric) =>
      !metric.archived &&
      metric.surface === group &&
      !groupMetrics.some((shown) => shown.id === metric.id),
  );
  const compareMetrics = comparableMetrics.filter((metric) => compareIds.includes(metric.id));
  const chartMetrics = [...groupMetrics, ...compareMetrics];
  const noopFacets = React.useCallback(() => {}, []);

  const merged = React.useMemo(() => {
    const periods = new Set<string>();
    const segments = new Map<string, Set<string>>();
    groupMetrics.forEach((metric) => {
      const facet = facets[metric.id];
      facet?.periods.forEach((value) => periods.add(value));
      Object.entries(facet?.segments ?? {}).forEach(([label, values]) => {
        const bucket = segments.get(label) ?? new Set<string>();
        values.forEach((value) => bucket.add(value));
        segments.set(label, bucket);
      });
    });
    return {
      periods: Array.from(periods).sort((a, b) => comparePeriods(b, a)),
      segments: Array.from(segments.entries())
        .map(([label, values]) => ({
          label,
          values: Array.from(values).sort((a, b) => a.localeCompare(b)),
        }))
        .filter((segment) => segment.values.length > 0)
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [facets, groupMetrics]);

  // One row per period, one column per metric — oldest first for the trend line.
  const chartData = React.useMemo(() => {
    const byPeriod = new Map<string, Record<string, string | number>>();
    chartMetrics.forEach((metric) => {
      (series[metric.id] ?? []).forEach((point) => {
        const row = byPeriod.get(point.period) ?? { period: point.period };
        row[metric.name] = Number(point.value.toFixed(2));
        byPeriod.set(point.period, row);
      });
    });
    return Array.from(byPeriod.values()).sort((a, b) =>
      comparePeriods(String(a.period), String(b.period)),
    );
  }, [series, chartMetrics]);

  const shownSignature = JSON.stringify(
    groupMetrics.map((metric) => [metric.id, series[metric.id] ?? []]),
  );
  React.useEffect(() => {
    if (!onSeriesChange) return;
    onSeriesChange(
      groupMetrics.map((metric) => ({ metric, points: series[metric.id] ?? [] })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownSignature, onSeriesChange]);

  // Resolve the sentinel defaults to real periods as soon as we know them
  // (a page that owns the filters does this with its own, wider list of periods).
  React.useEffect(() => {
    if (!pageOwned) setOwnFilters((prev) => resolveMetricFilters(prev, merged.periods));
  }, [merged.periods, pageOwned]);

  const facetsSignature = JSON.stringify(merged);
  React.useEffect(() => {
    onFacetsChange?.(JSON.parse(facetsSignature) as MetricFacets);
  }, [facetsSignature, onFacetsChange]);

  if (metrics.isLoading) {
    return (
      <DesignCard className="p-12 flex justify-center">
        <DesignLoader />
      </DesignCard>
    );
  }

  if (groupMetrics.length === 0) {
    // A tab can hold only qualitative insights: show those instead of the empty state.
    if (showQualitative && (qualitative.data ?? []).some((q) => q.group_name === group && q.enabled !== false)) {
      return <QualitativeSection group={group} period={ALL} compare={PREVIOUS} segmentFilters={{}} />;
    }
    return (
      <DesignCard>
        <DesignEmptyState
          icon={<ChartBar size={40} />}
          title={emptyTitle ?? `No metrics in ${group} yet`}
          body="Add quantitative or qualitative metrics to this tab in Metrics → All metrics."
          action={
            <DesignButton
              variant="outlined"
              theme="primary"
              onClick={() => navigate("/settings/metrics")}
            >
              Open metrics settings
            </DesignButton>
          }
        />
      </DesignCard>
    );
  }

  const sampleSize = groupMetrics.reduce((max, metric) => {
    const points = series[metric.id] ?? [];
    const point = points.find((p) => p.period === filters.period) ?? points[0];
    return Math.max(max, point?.rows ?? 0);
  }, 0);

  const qualitativeSection = (
    <QualitativeSection
      group={group}
      period={filters.period}
      compare={filters.compare}
      segmentFilters={Object.fromEntries(Object.entries(filters.segments).filter(([, value]) => value && value !== ALL))}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {!pageOwned && (
        <MetricFilterBar
          facets={merged}
          filters={filters}
          onChange={setFilters}
          extra={
            showResponses &&
            sampleSize > 0 && (
              <span className="ml-auto text-[12px] text-muted-foreground whitespace-nowrap">
                {sampleSize} response{sampleSize === 1 ? "" : "s"}
              </span>
            )
          }
        />
      )}


      {/* The cards also load each metric's values, so they render (hidden) whatever is shown. */}
      <DesignStatGroup className={parts && !parts.cards ? "hidden" : undefined} columns={cardColumns}>
        {groupMetrics.map((metric) => (
          <MetricStat
            key={metric.id}
            metric={metric}
            filters={filters}
            periodicity={periodicity}
            onFacets={handleFacets}
            onSeries={handleSeries}
            onDistribution={handleDistribution}
          />
        ))}
      </DesignStatGroup>

      {/* Feeds the trend chart with the comparison metrics without showing their cards. */}
      <div className="hidden">
        {compareMetrics.map((metric) => (
          <MetricStat
            key={`compare-${metric.id}`}
            metric={metric}
            filters={filters}
            periodicity={periodicity}
            onFacets={noopFacets}
            onSeries={handleSeries}
          />
        ))}
      </div>

      {(!parts || parts.trend) && (
      <section className={parts ? undefined : "pt-2"}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[16px] font-medium text-foreground">{trendHeading}</p>
          <p className="text-[12px] text-muted-foreground">{periodicityLabel}</p>
        </div>
        {comparableMetrics.length > 0 && (
          <>
            <DesignSpacer size="small" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-muted-foreground">Compare with</span>
              {comparableMetrics.map((metric) => (
                <DesignChip
                  key={metric.id}
                  size="small"
                  isActive={compareIds.includes(metric.id)}
                  onClick={() =>
                    setCompareIds((prev) =>
                      prev.includes(metric.id)
                        ? prev.filter((id) => id !== metric.id)
                        : [...prev, metric.id],
                    )
                  }
                >
                  {metric.name}
                </DesignChip>
              ))}
            </div>
          </>
        )}
        <DesignSpacer size="small" />
        {chartData.length === 0 ? (
          <DesignEmptyState
            icon={<ChartBar size={40} />}
            title="No history yet"
            body="Once these metrics have values across more than one period, the trend appears here."
          />
        ) : (
          <div className="h-[256px] w-full rounded-[6px] border border-border p-4">
            <ResponsiveContainer width="100%" height="100%">
              {trendChart === "bar" ? (
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                    width={44}
                    {...(group === "Impact" ? { domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5], allowDataOverflow: true } : {})}
                  />
                  <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }} cursor={{ fill: "var(--border)", opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {chartMetrics.map((metric, index) => (
                    <Bar key={metric.id} dataKey={metric.name} fill={LINE_COLORS[index % LINE_COLORS.length]} maxBarSize={32} />
                  ))}
                </BarChart>
              ) : (
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                  width={44}
                  {...(group === "Impact" ? { domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5], allowDataOverflow: true } : {})}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {chartMetrics.map((metric, index) => (
                  <Line
                    key={metric.id}
                    type="monotone"
                    dataKey={metric.name}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                    connectNulls
                  />
                ))}
              </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </section>
      )}

      {(!parts || parts.distribution) && <ScoreDistributions metrics={groupMetrics} distributions={distributions} />}

      {parts && !parts.breakdowns ? null : groupMetrics.length > 1 ? (
        <MergedBreakdowns
          group={group}
          metrics={groupMetrics}
          filters={{ period: filters.period, segments: filters.segments }}
          periodicity={periodicity}
        />
      ) : (
        groupMetrics.map((metric) => (
          <MetricBreakdowns
            key={`breakdown-${metric.id}`}
            metric={metric}
            filters={{ period: filters.period, segments: filters.segments }}
            periodicity={periodicity}
          />
        ))
      )}

      {showQualitative && qualitativeSection}
    </div>
  );
};

export default MetricGroupPanel;
