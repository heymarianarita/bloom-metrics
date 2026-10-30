import * as React from "react";
import { SquaresFour } from "@phosphor-icons/react";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import CodeAdoptionPanel, { scanPeriod, type CodeAdoptionContext } from "@/components/code/CodeAdoptionPanel";
import MetricGroupPanel, {
  ALL_SEGMENT_VALUES,
  INITIAL_METRIC_FILTERS,
  MetricFilterBar,
  resolveMetricFilters,
  type MetricDisplayOptions,
  type MetricFacets,
  type MetricFilters,
  type MetricPanelParts,
} from "@/components/metrics/MetricGroupPanel";
import { QualitativeSection } from "@/components/metrics/QualitativeSection";
import { SectionHeadingProvider } from "@/components/metrics/sectionHeading";
import type { MetricSeries } from "@/components/metrics/InsightsPanel";
import { useManualMetrics, type BreakdownView, type ManualMetric } from "@/hooks/useManualMetrics";
import { useAllDatasetColumns, type ManualDatasetColumn } from "@/hooks/useManualDatasets";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { useCodeAdoption } from "@/hooks/useCodeAdoption";
import type { MetricGroup, Periodicity } from "@/hooks/useMetricGroups";
import { itemsOf, useViewItems, widgetMetrics, widthOf, type CodeSection, type ViewItem } from "@/hooks/useViewItems";
import { reportRepo, type CodeAdoptionCharts } from "../../../server/shared/codeAdoptionCharts.ts";
import { comparePeriods } from "../../../server/shared/periods.ts";

const mergeFacets = (list: MetricFacets[]): MetricFacets => {
  const periods = new Set<string>();
  const segments = new Map<string, Set<string>>();
  for (const f of list) {
    f.periods.forEach((p) => periods.add(p));
    f.segments.forEach((s) => {
      const bucket = segments.get(s.label) ?? new Set<string>();
      s.values.forEach((v) => bucket.add(v));
      segments.set(s.label, bucket);
    });
  }
  return {
    periods: [...periods].sort((a, b) => comparePeriods(b, a)),
    segments: [...segments]
      .map(([label, values]) => ({ label, values: [...values].sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
};

const PARTS: Partial<Record<ViewItem["kind"], MetricPanelParts>> = {
  card: { cards: true },
  trend: { trend: true },
  distribution: { distribution: true },
  breakdown: { breakdowns: true },
};

/**
 * A Metrics view as laid out in Metrics → Views: its sections top to bottom, narrower ones side
 * by side, under one filter bar for the whole page.
 * Render it with `key={view.id}` so filters start fresh on each view.
 */
const ViewBlocks = ({
  view,
  groups,
  renderFigma,
  onSeriesChange,
  onCodeContextChange,
  showResponses,
}: {
  view: MetricGroup;
  groups: MetricGroup[];
  /** The Figma panel, when the page can draw it (it keeps its own date controls). */
  renderFigma?: () => React.ReactNode;
  /** Every shown number's series, for the Insights panel. */
  onSeriesChange?: (series: MetricSeries) => void;
  onCodeContextChange?: (ctx: CodeAdoptionContext) => void;
  /** Survey views: the response count next to the filters. */
  showResponses?: boolean;
}) => {
  const viewItems = useViewItems();
  const metrics = useManualMetrics();
  const columns = useAllDatasetColumns();
  const qualitative = useQualitativeSources();
  const codeAdoption = useCodeAdoption();
  const top = view.parent_id ? groups.find((g) => g.id === view.parent_id) ?? view : view;
  const periodicity = (top.periodicity ?? "quarterly") as Periodicity;

  // Sections that can still be drawn (their metric, question or panel exists).
  const widgets = React.useMemo(() => {
    const known = new Set((metrics.data ?? []).map((m) => m.id));
    return itemsOf(viewItems.data, view.id).filter((item) => {
      if (item.hidden) return false;
      if (PARTS[item.kind]) return widgetMetrics(item).some((id) => known.has(id));
      if (item.kind === "themes") return (qualitative.data ?? []).some((q) => q.id === item.ref);
      if (item.kind === "figma") return Boolean(renderFigma);
      if (item.kind === "text") return Boolean(item.options?.text?.trim());
      return item.kind === "code" && Boolean(item.ref);
    });
  }, [viewItems.data, view.id, metrics.data, qualitative.data, renderFigma]);

  // The page's filters (column labels) as each metric's dataset columns.
  const filterKeys = React.useCallback(
    (metric: ManualMetric | undefined) => {
      if (!metric) return [];
      const labels = view.filters ?? [];
      return ((columns.data ?? []) as ManualDatasetColumn[])
        .filter((c) => c.dataset_id === metric.dataset_id && labels.includes(c.label))
        .map((c) => c.key);
    },
    [columns.data, view.filters],
  );
  const metricById = React.useMemo(() => new Map((metrics.data ?? []).map((m) => [m.id, m])), [metrics.data]);
  const displayOptions = (item: ViewItem): Record<string, MetricDisplayOptions> =>
    Object.fromEntries(
      widgetMetrics(item).map((id) => {
        const keys = filterKeys(metricById.get(id));
        if (item.kind !== "breakdown" || !item.options?.column) {
          return [id, { filter_columns: keys, breakdown_views: {} }];
        }
        const column = item.options.column;
        const views: Record<string, BreakdownView> = Object.fromEntries(keys.map((k) => [k, "none" as BreakdownView]));
        views[column] = item.options.view ?? "table";
        return [id, { filter_columns: [...new Set([...keys, column])], breakdown_views: views }];
      }),
    );

  // One filter bar for the whole view: periods and segments from every number, plus the quarters with code scans.
  const [filters, setFilters] = React.useState<MetricFilters>(INITIAL_METRIC_FILTERS);
  const [widgetFacets, setWidgetFacets] = React.useState<Record<string, MetricFacets>>({});
  const [widgetSeries, setWidgetSeries] = React.useState<Record<string, MetricSeries>>({});
  const widgetIds = widgets.map((w) => w.id).join("|");
  const handlers = React.useMemo(
    () =>
      Object.fromEntries(
        widgetIds.split("|").map((id) => [
          id,
          {
            facets: (f: MetricFacets) =>
              setWidgetFacets((prev) => (JSON.stringify(prev[id]) === JSON.stringify(f) ? prev : { ...prev, [id]: f })),
            series: (s: MetricSeries) => setWidgetSeries((prev) => ({ ...prev, [id]: s })),
          },
        ]),
      ),
    [widgetIds],
  );

  const codePaths = [...new Set(widgets.flatMap((w) => (w.kind === "code" ? [w.ref] : [])))];
  const facets = React.useMemo(() => {
    const scanPeriods = (codeAdoption.data?.repos ?? [])
      .filter((repo) => codePaths.some((p) => reportRepo(p) === repo.repo))
      .flatMap((repo) => repo.snapshots.map((s) => scanPeriod(s, periodicity)));
    const numberFacets = widgets.flatMap((w) => (widgetFacets[w.id] ? [widgetFacets[w.id]] : []));
    return mergeFacets([...numberFacets, { periods: scanPeriods, segments: [] }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetFacets, codeAdoption.data?.repos, codePaths.join("|"), periodicity, widgetIds]);
  React.useEffect(() => {
    setFilters((prev) => resolveMetricFilters(prev, facets.periods));
  }, [facets.periods]);
  const periodChosen = facets.periods.includes(filters.period);

  // Each metric once, however many widgets show it.
  const series = React.useMemo(() => {
    const byMetric = new Map<string, MetricSeries[number]>();
    widgets.forEach((w) => (widgetSeries[w.id] ?? []).forEach((s) => byMetric.set(s.metric.id, s)));
    return [...byMetric.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetSeries, widgetIds]);
  const seriesSignature = JSON.stringify(series.map((s) => [s.metric.id, s.points]));
  React.useEffect(() => {
    onSeriesChange?.(series);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesSignature, onSeriesChange]);

  if (viewItems.isLoading || metrics.isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <DesignLoader />
      </div>
    );
  }
  if (widgets.length === 0) {
    return (
      <div className="p-5">
        <DesignEmptyState
          icon={<SquaresFour size={40} />}
          title={`Nothing in ${view.name} yet`}
          body="Lay out what this view shows in Metrics → Views."
        />
      </div>
    );
  }

  const segmentFilters = Object.fromEntries(
    Object.entries(filters.segments).filter(([, value]) => value && value !== ALL_SEGMENT_VALUES),
  );
  const firstCode = widgets.find((w) => w.kind === "code");
  const drawnReports = new Set<string>();

  const renderWidget = (item: ViewItem) => {
    const parts = PARTS[item.kind];
    if (parts) {
      return (
        <MetricGroupPanel
          group={top.name}
          metricIds={widgetMetrics(item)}
          displayOptions={displayOptions(item)}
          parts={parts}
          trendChart={item.options?.chart === "bar" ? "bar" : "line"}
          cardColumns={item.kind === "card" ? item.options?.columns : undefined}
          showQualitative={false}
          showResponses={showResponses && item.kind === "card"}
          filters={filters}
          onFiltersChange={setFilters}
          onFacetsChange={handlers[item.id]?.facets}
          onSeriesChange={handlers[item.id]?.series}
        />
      );
    }
    switch (item.kind) {
      case "code": {
        // The scan line and banners once per report, above its first part.
        const bare = drawnReports.has(item.ref);
        drawnReports.add(item.ref);
        const chart = item.options?.chart && item.section !== "shares" ? { [item.section]: item.options.chart } : {};
        return (
          <div className="-mx-5 -my-4">
            <CodeAdoptionPanel
              reportPath={item.ref}
              sections={[item.section as CodeSection]}
              chartOverrides={chart as Partial<CodeAdoptionCharts>}
              bare={bare}
              onContextChange={item.id === firstCode?.id ? onCodeContextChange : undefined}
              {...(periodChosen ? { period: filters.period, compare: filters.compare, periodicity } : {})}
            />
          </div>
        );
      }
      case "themes": {
        const source = (qualitative.data ?? []).find((q) => q.id === item.ref);
        return source ? (
          <QualitativeSection
            group={source.group_name}
            sourceIds={[source.id]}
            period={filters.period}
            compare={filters.compare}
            segmentFilters={segmentFilters}
          />
        ) : null;
      }
      case "figma":
        return <div className="-mx-5 -my-4">{renderFigma?.()}</div>;
      case "text":
        return item.options?.style === "note" ? (
          <p className="text-sm text-muted-foreground whitespace-pre-line">{item.options.text}</p>
        ) : (
          <h2 className="text-[18px] font-[580] leading-6">{item.options?.text}</h2>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {facets.periods.length > 0 && (
        <div className="px-5 pt-5">
          <MetricFilterBar facets={facets} filters={filters} onChange={setFilters} />
        </div>
      )}
      <div className="grid grid-cols-6 gap-x-6 px-5 py-2">
        {widgets.map((item) => (
          <div key={item.id} className="col-span-6 lg:[grid-column:span_var(--span)/span_var(--span)] min-w-0 py-4" style={{ "--span": widthOf(item).span } as React.CSSProperties}>
            <SectionHeadingProvider value={item.options?.title?.trim() || undefined}>{renderWidget(item)}</SectionHeadingProvider>
          </div>
        ))}
      </div>
    </>
  );
};

export default ViewBlocks;
