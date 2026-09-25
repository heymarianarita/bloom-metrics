import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { usePerformanceSheet, type PerformanceQuarter } from "@/hooks/usePerformanceSheet";

const CHART_COLORS = ["#007782", "#28865A", "#D04555", "#5A6566", "#8A5CF6"];

const toNumber = (raw: string) => {
  const stripped = (raw ?? "").replace(/[%,\s€$£]/g, "");
  const value = Number(stripped);
  return stripped === "" || Number.isNaN(value) ? null : value;
};

interface TableRow {
  id: number;
  cells: string[];
}

const QuarterSheetPanel = () => {
  const { data, isLoading, error, refetch } = usePerformanceSheet();
  const [active, setActive] = React.useState<string | null>(null);

  const quarters = data?.quarters ?? [];
  const activeQuarter: PerformanceQuarter | undefined =
    quarters.find((q) => q.quarter === active) ?? quarters[quarters.length - 1];

  const columns: DataTableColumn<TableRow>[] = React.useMemo(() => {
    if (!activeQuarter) return [];
    return activeQuarter.headers.map((header, index) => ({
      key: `col-${index}`,
      header: header || `Column ${index + 1}`,
      width: index === 0 ? "1.6fr" : "1fr",
      sortable: index === 0,
      render: (row: TableRow) => row.cells[index] || "—",
    }));
  }, [activeQuarter]);

  const rows: TableRow[] = React.useMemo(
    () => (activeQuarter?.rows ?? []).map((cells, id) => ({ id, cells })),
    [activeQuarter],
  );

  const chart = React.useMemo(() => {
    if (!activeQuarter || activeQuarter.numericColumns.length === 0) return null;
    const series = activeQuarter.numericColumns.slice(0, 5);
    const chartData = activeQuarter.rows.map((cells, i) => {
      const point: Record<string, string | number | null> = {
        label: cells[0] || `Row ${i + 1}`,
      };
      series.forEach((c) => {
        point[activeQuarter.headers[c] || `Column ${c + 1}`] = toNumber(cells[c]);
      });
      return point;
    });
    return {
      keys: series.map((c) => activeQuarter.headers[c] || `Column ${c + 1}`),
      data: chartData,
    };
  }, [activeQuarter]);

  if (isLoading) {
    return (
      <DesignCard className="p-12 flex justify-center">
        <DesignLoader />
      </DesignCard>
    );
  }

  if (error) {
    return (
      <DesignInfoBanner
        type="error"
        title="Could not load the Performance sheet"
        description={(error as Error).message}
        actionLabel="Retry"
        onAction={() => refetch()}
        showCloseButton={false}
      />
    );
  }

  if (data && data.configured === false) {
    return (
      <DesignInfoBanner
        type="warning"
        title="Performance sheet is not connected"
        description={
          data.details ??
          "Add the Google service account key and the Performance spreadsheet ID as backend secrets, then share the sheet with the service account as Viewer."
        }
        showCloseButton={false}
      />
    );
  }

  if (!activeQuarter) {
    return (
      <DesignCard>
        <DesignEmptyState
          icon={<Table size={40} />}
          title="No quarters found"
          body="The Performance spreadsheet has no readable tabs yet — each tab is treated as one quarter."
        />
      </DesignCard>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {quarters.map((q) => (
          <DesignButton
            key={q.quarter}
            size="small"
            variant={q.quarter === activeQuarter.quarter ? "filled" : "outlined"}
            theme="primary"
            onClick={() => setActive(q.quarter)}
          >
            {q.quarter}
          </DesignButton>
        ))}
      </div>
      <DesignSpacer size="medium" />

      {chart && chart.keys.length > 0 && (
        <>
          <DesignCard className="p-4">
            <h3 className="text-[18px] font-[580] text-foreground">
              {activeQuarter.quarter} overview
            </h3>
            <DesignSpacer size="small" />
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {chart.keys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={[6, 6, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DesignCard>
          <DesignSpacer size="medium" />
        </>
      )}

      <DesignDataTable
        title={`${activeQuarter.quarter} data`}
        columns={columns}
        data={rows}
        rowKey={(row) => String(row.id)}
        searchPlaceholder="Search rows"
        pageSize={10}
        totalResultsLabel={`${rows.length} rows`}
        emptyTitle="No rows in this quarter"
        emptyBody="Add rows to this tab in the Performance spreadsheet."
      />
    </>
  );
};

export default QuarterSheetPanel;
