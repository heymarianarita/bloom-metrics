import * as React from "react";
import { Gauge, CheckCircle } from "@phosphor-icons/react";
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
import PerformanceEntriesPanel from "@/components/performance/PerformanceEntriesPanel";
import { useSheetsAnalytics, type Milestone, type RagGrades } from "@/hooks/useSheetsAnalytics";


const GRADE_THEME: Record<string, "success" | "highlight" | "error" | "muted"> = {
  green: "success",
  "on track": "success",
  g: "success",
  amber: "highlight",
  yellow: "highlight",
  "at risk": "highlight",
  a: "highlight",
  red: "error",
  "off track": "error",
  r: "error",
};

const gradeTheme = (grade?: string) => GRADE_THEME[(grade ?? "").toLowerCase()] ?? "muted";

const STATUS_THEME: Record<string, "success" | "primary" | "error" | "muted" | "highlight"> = {
  done: "success",
  completed: "success",
  "in progress": "primary",
  "on track": "success",
  delayed: "error",
  "at risk": "highlight",
  planned: "muted",
  "not started": "muted",
};

const statusTheme = (status?: string) => STATUS_THEME[(status ?? "").toLowerCase()] ?? "muted";

interface RagRow {
  quarter: string;
  grades: RagGrades;
}

const Performance = () => {
  const { data, isLoading, error, refetch } = useSheetsAnalytics();

  const ragRows: RagRow[] = React.useMemo(
    () =>
      Object.entries(data?.rag ?? {})
        .map(([quarter, grades]) => ({ quarter, grades }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter)),
    [data],
  );

  const milestones: Milestone[] = React.useMemo(
    () =>
      [...(data?.milestones ?? [])].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [data],
  );

  const latestRag = ragRows[ragRows.length - 1]?.grades;

  const summary = React.useMemo(() => {
    const total = milestones.length;
    const done = milestones.filter((m) => statusTheme(m.status) === "success").length;
    const delayed = milestones.filter((m) => statusTheme(m.status) === "error").length;
    const upcoming = milestones.filter((m) => statusTheme(m.status) === "muted").length;
    return { total, done, delayed, upcoming };
  }, [milestones]);

  const ragColumns: DataTableColumn<RagRow>[] = [
    { key: "quarter", header: "Quarter", width: "1fr", sortable: true },
    {
      key: "discovery",
      header: "Discovery",
      width: "1fr",
      render: (row) => (
        <DesignBadge theme={gradeTheme(row.grades.discovery)} styling="light">
          {row.grades.discovery ?? "—"}
        </DesignBadge>
      ),
    },
    {
      key: "delivery",
      header: "Delivery",
      width: "1fr",
      render: (row) => (
        <DesignBadge theme={gradeTheme(row.grades.delivery)} styling="light">
          {row.grades.delivery ?? "—"}
        </DesignBadge>
      ),
    },
    {
      key: "impact",
      header: "Impact",
      width: "1fr",
      render: (row) => (
        <DesignBadge theme={gradeTheme(row.grades.impact)} styling="light">
          {row.grades.impact ?? "—"}
        </DesignBadge>
      ),
    },
  ];

  const milestoneColumns: DataTableColumn<Milestone>[] = [
    { key: "name", header: "Milestone", width: "1.6fr", sortable: true },
    { key: "phase", header: "Phase", width: "1fr", sortable: true },
    { key: "date", header: "Date", width: "0.9fr", sortable: true },
    {
      key: "status",
      header: "Status",
      width: "0.9fr",
      render: (row) => (
        <DesignBadge theme={statusTheme(row.status)} styling="light">
          {row.status ?? "—"}
        </DesignBadge>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        <DesignPageHeader
          title="Performance"
          subtitle="Quarterly performance per team, recorded in the internal database"
        />
        <DesignSpacer size="medium" />

        <PerformanceEntriesPanel readOnly />
        <DesignSpacer size="large" />

        {isLoading && (
          <DesignCard className="p-12 flex justify-center">
            <DesignLoader />
          </DesignCard>
        )}


        {!isLoading && (ragRows.length > 0 || milestones.length > 0) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <DesignStatCard
                label="Latest discovery"
                value={latestRag?.discovery ?? "—"}
                icon={<Gauge size={18} />}
              />
              <DesignStatCard
                label="Latest delivery"
                value={latestRag?.delivery ?? "—"}
                icon={<Gauge size={18} />}
              />
              <DesignStatCard
                label="Latest impact"
                value={latestRag?.impact ?? "—"}
                icon={<Gauge size={18} />}
              />
              <DesignStatCard
                label="Milestones done"
                value={`${summary.done} / ${summary.total}`}
                icon={<CheckCircle size={18} />}
                change={summary.delayed > 0 ? `${summary.delayed} delayed` : undefined}
                changeUp={summary.delayed === 0}
              />
            </div>
            <DesignSpacer size="medium" />

            {ragRows.length > 0 && (
              <>
                <DesignDataTable
                  title="RAG status by quarter"
                  columns={ragColumns}
                  data={ragRows}
                  rowKey={(row) => row.quarter}
                  hidePagination
                  hideToolbar
                  emptyTitle="No RAG grades"
                  emptyBody="Add rows to the rag tab to track discovery, delivery, and impact status."
                />
                <DesignSpacer size="medium" />
              </>
            )}

            {milestones.length > 0 && (
              <DesignDataTable
                title="Milestones"
                columns={milestoneColumns}
                data={milestones}
                rowKey={(row) => String(row.id)}
                searchPlaceholder="Search milestones"
                pageSize={10}
                totalResultsLabel={`${milestones.length} milestones`}
                emptyTitle="No milestones"
                emptyBody="Add rows to the milestones tab to track delivery progress."
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Performance;
