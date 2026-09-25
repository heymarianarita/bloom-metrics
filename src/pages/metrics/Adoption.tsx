import * as React from "react";
import { PuzzlePiece } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignStatGroup } from "@/components/ds/DesignStatGroup";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignButton } from "@/components/ds/DesignButton";
import FigmaSourceBar from "@/components/figma/FigmaSourceBar";
import FigmaRangeControls from "@/components/figma/FigmaRangeControls";
import FigmaComponentChart from "@/components/figma/FigmaComponentChart";
import {
  getStoredFigmaFileKey,
  useFigmaAnalytics,
  useFigmaLibraries,
  type FigmaComponentRow,
} from "@/hooks/useFigmaAnalytics";
import { useFigmaHistory } from "@/hooks/useFigmaHistory";
import MetricGroupPanel from "@/components/metrics/MetricGroupPanel";
import { useManualMetrics, type ManualMetric } from "@/hooks/useManualMetrics";
import { InsightsPanel, metricInsights, type Insight, type MetricSeries } from "@/components/metrics/InsightsPanel";

/** Fixed tabs; every other sub-tab is one metric configured in Settings → Metrics. */
const TOUCHPOINTS = [
  { id: "overview", label: "Overview" },
  { id: "design", label: "Figma" },
] as const;

type TouchpointId = (typeof TOUCHPOINTS)[number]["id"];

const numberFormat = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : value.toLocaleString();

const toISO = (date: Date) => date.toISOString().slice(0, 10);

/** Quarter-to-date, matching how the team reports. */
const quarterToDate = () => {
  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3);
  return {
    startDate: toISO(new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1))),
    endDate: toISO(now),
    label: `${now.getUTCFullYear()}-Q${q + 1}`,
  };
};


const totalsOf = (rows: FigmaComponentRow[]) => {
  const inserts = rows.reduce((acc, r) => acc + (r.inserts ?? 0), 0);
  const detaches = rows.reduce((acc, r) => acc + (r.detaches ?? 0), 0);
  const used = rows.filter((r) => (r.inserts ?? 0) > 0).length;
  return {
    inserts,
    detaches,
    used,
    never: rows.length - used,
    detachRate:
      inserts + detaches > 0 ? Number(((detaches / (inserts + detaches)) * 100).toFixed(1)) : null,
  };
};

const Adoption = () => {
  const { pathname } = useLocation();
  const slug = pathname.split("/")[3] ?? "overview";
  const metrics = useManualMetrics();
  const metricTab = (metrics.data ?? []).find(
    (metric) => !metric.archived && metric.surface === "Adoption" && metric.slug === slug,
  );
  const touchpoint = (TOUCHPOINTS.some((t) => t.id === slug) ? slug : "overview") as TouchpointId;
  const [fileKey, setFileKey] = React.useState(getStoredFigmaFileKey);
  const [range, setRange] = React.useState(() => {
    const q = quarterToDate();
    return { startDate: q.startDate, endDate: q.endDate };
  });
  const [compareRange, setCompareRange] = React.useState(() => {
    const now = new Date();
    const q = Math.floor(now.getUTCMonth() / 3) - 1;
    const year = now.getUTCFullYear() + (q < 0 ? -1 : 0);
    const qi = (q + 4) % 4;
    return {
      startDate: toISO(new Date(Date.UTC(year, qi * 3, 1))),
      endDate: toISO(new Date(Date.UTC(year, qi * 3 + 3, 0))),
      label: `${year}-Q${qi + 1}`,
    };
  });
  const libraries = useFigmaLibraries();
  const excludedPages = React.useMemo(
    () => (libraries.data ?? []).find((l) => l.key === fileKey)?.excludedPages ?? [],
    [libraries.data, fileKey],
  );

  const navigate = useNavigate();
  const [metricSeries, setMetricSeries] = React.useState<MetricSeries>([]);
  React.useEffect(() => setMetricSeries([]), [slug]);
  const { data, isLoading, isFetching, error, refetch } = useFigmaAnalytics(fileKey, range);
  const history = useFigmaHistory(fileKey);
  const compareQuery = useFigmaAnalytics(fileKey, {
    startDate: compareRange.startDate,
    endDate: compareRange.endDate,
  });

  const handleFileKeyChange = (key: string) => {
    setFileKey(key);
  };

  const visibleComponents = React.useMemo(
    () => (data?.components ?? []).filter((c) => !excludedPages.includes(c.page)),
    [data, excludedPages],
  );

  const [componentView, setComponentView] = React.useState("all");
  const rateOf = (r: FigmaComponentRow) => {
    const i = r.inserts ?? 0;
    const d = r.detaches ?? 0;
    return i + d > 0 ? (d / (i + d)) * 100 : 0;
  };
  const componentViews = React.useMemo(() => {
    const byInserts = [...visibleComponents].sort((a, b) => (b.inserts ?? 0) - (a.inserts ?? 0));
    const top = new Set(byInserts.slice(0, 10).map((r) => r.key));
    const views: { id: string; label: string; match: (r: FigmaComponentRow) => boolean }[] = [
      { id: "all", label: "All", match: () => true },
      { id: "never", label: "Never inserted", match: (r) => (r.inserts ?? 0) === 0 },
      { id: "detached", label: "Detached", match: (r) => (r.detaches ?? 0) > 0 },
      { id: "high", label: "High detach rate (>10%)", match: (r) => rateOf(r) > 10 },
      { id: "low", label: "Low usage (1–10)", match: (r) => (r.inserts ?? 0) > 0 && (r.inserts ?? 0) <= 10 },
      { id: "top", label: "Most inserted", match: (r) => top.has(r.key) },
    ];
    return views.map((v) => ({ ...v, rows: visibleComponents.filter(v.match) }));
  }, [visibleComponents]);
  const activeView = componentViews.find((v) => v.id === componentView) ?? componentViews[0];
  const tableRows =
    activeView.id === "top"
      ? [...activeView.rows].sort((a, b) => (b.inserts ?? 0) - (a.inserts ?? 0))
      : activeView.id === "high"
        ? [...activeView.rows].sort((a, b) => rateOf(b) - rateOf(a))
        : activeView.rows;

  const totals = React.useMemo(() => totalsOf(visibleComponents), [visibleComponents]);
  const compareTotals = React.useMemo(() => {
    const rows = compareQuery.data?.components;
    if (!rows || compareQuery.data?.configured === false) return null;
    return totalsOf(rows.filter((c) => !excludedPages.includes(c.page)));
  }, [compareQuery.data, excludedPages]);
  const changeText = (current: number | null, prior: number | null | undefined, suffix = "") => {
    if (current === null || prior === null || prior === undefined) return undefined;
    const d = Number((current - prior).toFixed(1));
    return `${d >= 0 ? "+" : ""}${d.toLocaleString()}${suffix} vs ${compareRange.label}`;
  };
  const isUp = (current: number | null, prior: number | null | undefined) =>
    current !== null && prior !== null && prior !== undefined ? current >= prior : true;

  /** Insights are derived from the same numbers the panels show, never hardcoded. */
  const figmaInsights: Insight[] = React.useMemo(() => {
    if (!data) return [];
    const out: Insight[] = [];
    const libRate = totals.detachRate;

    const worst = [...visibleComponents]
      .filter((c) => (c.inserts ?? 0) + (c.detaches ?? 0) > 100)
      .map((c) => ({
        name: c.name,
        rate: ((c.detaches ?? 0) / ((c.inserts ?? 0) + (c.detaches ?? 0))) * 100,
      }))
      .sort((a, b) => b.rate - a.rate)[0];

    if (worst && libRate !== null) {
      const gap = worst.rate - libRate;
      out.push({
        kind: gap >= 5 ? "Risk" : "Needs attention",
        title:
          gap >= 5
            ? `${worst.name} detaches far above the library average`
            : `${worst.name} has the highest detach rate`,
        body: `${worst.rate.toFixed(1)}% against ${libRate.toFixed(1)}% across the library in this range.`,
      });
    }

    const snaps = history.data ?? [];
    const latest = snaps[snaps.length - 1];
    if (latest && latest.insertsDelta !== null) {
      const up = latest.insertsDelta >= 0;
      const rateDown = (latest.detachRateDelta ?? 0) <= 0;
      out.push({
        kind: up && rateDown ? "Growth" : "Needs attention",
        title:
          up && rateDown
            ? "Detach rate falling while insertions climb"
            : "Insertions and detach rate moved together",
        body: `Insertions ${up ? "up" : "down"} ${Math.abs(latest.insertsDelta).toLocaleString()} and detach rate ${
          rateDown ? "down" : "up"
        } ${Math.abs(latest.detachRateDelta ?? 0).toFixed(1)} points on ${snaps[snaps.length - 2]?.quarter ?? "the previous quarter"}.`,
      });
    }

    if (totals.never > 0) {
      out.push({
        kind: "Needs attention",
        title: `${totals.never} components have never been inserted`,
        body: `${Math.round((totals.never / Math.max(visibleComponents.length, 1)) * 100)}% of the ${
          visibleComponents.length
        } published in this range — candidates for deprecation rather than promotion.`,
      });
    }

    return out;
  }, [data, totals, visibleComponents, history.data]);

  const isDesign = !metricTab && touchpoint === "design";
  const insights = React.useMemo(
    () => (isDesign ? figmaInsights : metricInsights(metricSeries)),
    [isDesign, figmaInsights, metricSeries],
  );

  const columns: DataTableColumn<FigmaComponentRow>[] = [
    { key: "name", header: "Component", sortable: true, width: "2fr" },
    { key: "page", header: "Page", width: "1fr" },
    {
      key: "variantCount",
      header: "Variants",
      width: "100px",
      render: (r) => (r.variantCount ?? 1).toLocaleString(),
    },
    {
      key: "inserts",
      header: "Insertions",
      width: "0.9fr",
      sortable: true,
      render: (row) => numberFormat(row.inserts),
    },
    {
      key: "detaches",
      header: "Detachments",
      width: "0.9fr",
      sortable: true,
      render: (row) => numberFormat(row.detaches),
    },
    {
      key: "rate",
      header: "Detach rate",
      width: "0.9fr",
      render: (row) => {
        const i = row.inserts ?? 0;
        const d = row.detaches ?? 0;
        if (i + d === 0) return "—";
        const rate = (d / (i + d)) * 100;
        return <span className={rate > 10 ? "text-destructive font-medium" : ""}>{rate.toFixed(1)}%</span>;
      },
    },
  ];

  const q = quarterToDate();

  /* ── Primary panel ─────────────────────────────────────────────── */
  const primaryPanel = (
    <DesignCard variant="default" className="lg:col-span-2 flex flex-col min-w-0 pt-0">

      {/* One sub-tab per metric configured under the Adoption group. */}
      {metricTab && (
        <div className="p-5">
          <MetricGroupPanel
            group="Adoption"
            match={(metric) => metric.id === metricTab.id}
            emptyTitle={`No data for ${metricTab.name} yet`}
            onSeriesChange={setMetricSeries}
          />
        </div>
      )}

      {!metricTab && touchpoint === "overview" && (
        <div className="p-5">
          <MetricGroupPanel group="Adoption" onSeriesChange={setMetricSeries} />
        </div>
      )}

      {touchpoint === "design" && (
        <>
          <div className="px-5 pt-5 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <FigmaRangeControls
              startDate={range.startDate}
              endDate={range.endDate}
              onApplyRange={(startDate, endDate) => setRange({ startDate, endDate })}
              onCompareChange={(startDate, endDate, label) =>
                setCompareRange({ startDate, endDate, label })
              }
              isLoading={isFetching}
            />
            <div className="hidden sm:block h-6 w-px bg-border" aria-hidden="true" />
            <FigmaSourceBar
              fileKey={fileKey}
              onFileKeyChange={handleFileKeyChange}
              onRefresh={() => refetch()}
              isLoading={isFetching}
            />
          </div>

          {error && (
            <div className="px-5 pb-3">
              <DesignInfoBanner
                type="error"
                title="Could not load Figma data"
                description={(error as Error).message}
              />
            </div>
          )}

          {!error && data?.configured === false && (
            <div className="px-5 pb-3">
              <DesignInfoBanner
                type="warning"
                title="Figma is not connected yet"
                description={
                  data.details ??
                  "Add a Figma access token in Settings → Dynamic sources to pull component adoption data."
                }
                actionLabel="Open data sources"
                onAction={() => navigate("/settings/data-sources")}
                showCloseButton={false}
              />
            </div>
          )}


          {!fileKey && (
            <div className="p-5">
              <DesignEmptyState
                icon={<PuzzlePiece size={40} />}
                title="Connect a Figma library"
                body="Paste a Figma library file URL above to pull component inventory and adoption metrics."
              />
            </div>
          )}

          {isLoading && fileKey && (
            <div className="p-12 flex justify-center">
              <DesignLoader />
            </div>
          )}

          {data && data.configured !== false && (
            <>
              {!data.analyticsAvailable && data.analyticsNote && (
                <div className="px-5 pb-3">
                  <DesignInfoBanner
                    type="warning"
                    title="Library Analytics unavailable"
                    description={data.analyticsNote}
                  />
                </div>
              )}

              <DesignStatGroup className="mx-5 mb-3">
                <DesignStatCard
                  label="Insertions"
                  value={numberFormat(totals.inserts)}
                  change={changeText(totals.inserts, compareTotals?.inserts)}
                  changeUp={isUp(totals.inserts, compareTotals?.inserts)}
                />
                <DesignStatCard
                  label="Detachments"
                  value={numberFormat(totals.detaches)}
                  change={changeText(totals.detaches, compareTotals?.detaches)}
                  changeUp={!isUp(totals.detaches, compareTotals?.detaches)}
                />
                <DesignStatCard
                  label="Detach rate"
                  value={totals.detachRate === null ? "—" : `${totals.detachRate}%`}
                  change={changeText(totals.detachRate, compareTotals?.detachRate, " pts")}
                  changeUp={!isUp(totals.detachRate, compareTotals?.detachRate)}
                />
                <DesignStatCard
                  label="Never inserted"
                  value={numberFormat(totals.never)}
                  change={changeText(totals.never, compareTotals?.never)}
                  changeUp={!isUp(totals.never, compareTotals?.never)}
                />
              </DesignStatGroup>

              <div className="px-5 pb-3">
                <FigmaComponentChart
                  rows={visibleComponents}
                  periodLabel={`${range.startDate} – ${range.endDate}`}
                />
              </div>

              <div className="flex-1">
                <DesignDataTable
                  title="Components"
                  columns={columns}
                  data={tableRows}
                  tabs={componentViews.map((v) => ({ id: v.id, label: v.label, count: v.rows.length }))}
                  activeTab={activeView.id}
                  onTabChange={setComponentView}
                  rowKey={(row) => row.key}
                  searchPlaceholder="Search components"
                  pageSize={10}
                  totalResultsLabel={`${tableRows.length} components`}
                  emptyTitle="No components found"
                  emptyBody="No components match this view for the selected pages."
                />
              </div>
            </>
          )}
        </>
      )}
    </DesignCard>
  );

  /* ── Secondary panel — data insights ───────────────────────────── */
  const insightsPanel = (
    <InsightsPanel
      subject={metricTab?.name ?? (touchpoint === "design" ? "Figma" : "Adoption")}
      insights={insights}
      emptyText="Insights appear once this touchpoint has data to analyse."
      className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)]"
      footer={
        isDesign && (
          <div className="mt-auto pt-4 space-y-3">
            <div className="p-3 rounded-[6px] bg-[var(--spacing-bg)]">
              <p className="text-sm font-medium text-foreground">Snapshots every 1st and 15th</p>
              <p className="text-xs text-muted-foreground mt-1">
                Figma is range-based, so quarters are stored as they close.
              </p>
            </div>
            <div className="p-3 rounded-[6px] bg-[var(--spacing-bg)]">
              <p className="text-sm font-medium text-foreground">{q.label} in progress</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quarter-to-date figures compare against the same weeks last quarter.
              </p>
            </div>
          </div>
        )
      }
    />
  );

  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        <DesignPageHeader
          title="Adoption"
          subtitle="Where Bloom is actually used across design and code"
        />
        <DesignSpacer size="medium" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[12px] items-start">
          {primaryPanel}
          {insightsPanel}
        </div>
      </div>
    </AppShell>
  );
};

export default Adoption;
