import * as React from "react";
import { Smiley, Lightning, Compass, ShieldCheck, Handshake, ChartLineUp } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignButton } from "@/components/ds/DesignButton";
import { useNavigate } from "react-router-dom";
import MetricGroupPanel from "@/components/metrics/MetricGroupPanel";
import { useSheetsAnalytics, type SurveyMetrics } from "@/hooks/useSheetsAnalytics";
import { cn } from "@/lib/utils";
import { InsightsPanel, metricInsights, type MetricSeries } from "@/components/metrics/InsightsPanel";

type MetricKey = keyof SurveyMetrics;

const METRICS: { key: MetricKey; label: string; icon: React.ReactNode }[] = [
  { key: "csat", label: "CSAT", icon: <Smiley size={18} /> },
  { key: "efficiency", label: "Efficiency", icon: <Lightning size={18} /> },
  { key: "discoverability", label: "Discoverability", icon: <Compass size={18} /> },
  { key: "confidence", label: "Confidence", icon: <ShieldCheck size={18} /> },
  { key: "handoff", label: "Handoff", icon: <Handshake size={18} /> },
  { key: "zhUmux", label: "Zeroheight UMUX", icon: <ChartLineUp size={18} /> },
  { key: "sbUmux", label: "Storybook UMUX", icon: <ChartLineUp size={18} /> },
];

const formatScore = (value: number | undefined) =>
  value === undefined || Number.isNaN(value) ? "—" : value.toFixed(1);

interface SegmentRow {
  segment: string;
  type: "Role" | "Business unit";
  metrics: SurveyMetrics;
}

const Impact = () => {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, error, refetch } = useSheetsAnalytics();
  const [selectedQuarter, setSelectedQuarter] = React.useState<string | null>(null);
  const [metricSeries, setMetricSeries] = React.useState<MetricSeries>([]);
  const insights = React.useMemo(() => metricInsights(metricSeries), [metricSeries]);

  const quarters = data?.quarters ?? [];
  const activeQuarter = selectedQuarter ?? quarters[quarters.length - 1] ?? null;
  const activeIndex = activeQuarter ? quarters.indexOf(activeQuarter) : -1;
  const previousQuarter = activeIndex > 0 ? quarters[activeIndex - 1] : null;

  const current = activeQuarter ? data?.survey?.[activeQuarter] : undefined;
  const previous = previousQuarter ? data?.survey?.[previousQuarter] : undefined;

  const segmentRows: SegmentRow[] = React.useMemo(() => {
    if (!current) return [];
    const roleRows: SegmentRow[] = Object.entries(current.byRole ?? {}).map(([segment, metrics]) => ({
      segment,
      type: "Role",
      metrics,
    }));
    const buRows: SegmentRow[] = Object.entries(current.byBU ?? {}).map(([segment, metrics]) => ({
      segment,
      type: "Business unit",
      metrics,
    }));
    return [...roleRows, ...buRows];
  }, [current]);

  const columns: DataTableColumn<SegmentRow>[] = [
    { key: "segment", header: "Segment", sortable: true, width: "1.4fr" },
    {
      key: "type",
      header: "Type",
      width: "1fr",
      render: (row) => (
        <DesignBadge theme={row.type === "Role" ? "primary" : "dark"} styling="light">
          {row.type}
        </DesignBadge>
      ),
    },
    ...METRICS.map((m) => ({
      key: m.key,
      header: m.label,
      width: "1fr",
      sortable: true,
      render: (row: SegmentRow) => formatScore(row.metrics[m.key]),
    })),
  ];

  

  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        <DesignPageHeader
          title="Impact"
          subtitle={
            activeQuarter
              ? `How satisfied and efficient teams feel using the design system in ${activeQuarter}`
              : "How satisfied and efficient teams feel using the design system"
          }
          secondaryActions={
            quarters.length > 0 && (
              <div className="flex items-center gap-1">
                {quarters.map((q) => (
                  <DesignButton
                    key={q}
                    size="small"
                    variant={q === activeQuarter ? "filled" : "outlined"}
                    theme="primary"
                    onClick={() => setSelectedQuarter(q)}
                  >
                    {q}
                  </DesignButton>
                ))}
              </div>
            )
          }
        />
        <DesignSpacer size="medium" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[12px] items-start">
          <DesignCard variant="default" className="lg:col-span-2 min-w-0 p-5">
            <MetricGroupPanel group="Impact" showResponses onSeriesChange={setMetricSeries} />
          </DesignCard>
          <InsightsPanel
            subject="Impact"
            insights={insights}
            className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)]"
          />
        </div>
        <DesignSpacer size="medium" />

        {error && (
          <>
            <DesignInfoBanner
              type="error"
              title="Could not load survey data"
              description={(error as Error).message}
              actionLabel="Retry"
              onAction={() => refetch()}
              showCloseButton={false}
            />
            <DesignSpacer size="medium" />
          </>
        )}


        {isLoading && (
          <DesignCard className="p-12 flex justify-center">
            <DesignLoader />
          </DesignCard>
        )}

        {!isLoading && data && data.configured !== false && quarters.length === 0 && (
          <DesignCard>
            <DesignEmptyState
              icon={<Smiley size={40} />}
              title="No survey data yet"
              body="Add rows to the survey tab of your Google Sheet: one row per quarter, role, and business unit."
            />
          </DesignCard>
        )}

        {!isLoading && current && (
          <>
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4", isFetching && "opacity-60")}>
              {METRICS.map((m) => {
                const value = current.all[m.key];
                const prevValue = previous?.all[m.key];
                const delta =
                  value !== undefined && prevValue !== undefined
                    ? Number((value - prevValue).toFixed(1))
                    : undefined;
                return (
                  <DesignStatCard
                    key={m.key}
                    label={m.label}
                    value={formatScore(value)}
                    icon={m.icon}
                    change={delta !== undefined ? `${delta >= 0 ? "+" : ""}${delta} vs ${previousQuarter}` : undefined}
                    changeUp={delta !== undefined ? delta >= 0 : true}
                  />
                );
              })}
            </div>
            <DesignSpacer size="medium" />

            {segmentRows.length > 0 && (
              <DesignDataTable
                title="Breakdown by role and business unit"
                columns={columns}
                data={segmentRows}
                rowKey={(row) => `${row.type}-${row.segment}`}
                searchPlaceholder="Search segments"
                pageSize={10}
                totalResultsLabel={`${segmentRows.length} segments`}
                emptyTitle="No segment breakdown"
                emptyBody="Add role or business_unit rows to the survey tab to see a breakdown."
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Impact;
