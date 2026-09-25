import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
import { ChartBar } from "@phosphor-icons/react";
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
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignLoader } from "@/components/ds/DesignLoader";
import {
  aggregateDataset,
  comparePeriods,
  useDatasetColumns,
  useDatasetRows,
  type ManualDatasetRow,
} from "@/hooks/useManualDatasets";
import type { BreakdownView, ManualMetric } from "@/hooks/useManualMetrics";
import { bucketSeries, type SeriesPoint } from "@/lib/periodBuckets";
import type { Periodicity } from "@/hooks/useMetricGroups";
import { isTeamLabel, useTeamBusinessUnits } from "@/hooks/useTeamBusinessUnits";

const COLORS = [
  "var(--primary)",
  "var(--btn-success)",
  "var(--destructive)",
  "var(--btn-highlight)",
  "var(--primary-medium)",
  "var(--primary-dark)",
];

const ALL = "__all__";

const formatValue = (value: number | undefined, unit: string) => {
  if (value === undefined || Number.isNaN(value)) return "—";
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${rounded}${unit === "%" ? "%" : ` ${unit}`}` : rounded;
};

interface BreakdownFilters {
  period: string;
  segments: Record<string, string>;
}

interface SegmentSeries {
  value: string;
  points: SeriesPoint[];
}

/** One breakdown of a metric, split by the values of a single dataset column. */
const BUSINESS_UNITS_UNAVAILABLE = {
  title: "Business units need GetDX",
  body: "Teams are grouped into business units using GetDX. Connect GetDX in Settings → Dynamic sources to see this breakdown.",
};

const Breakdown = ({
  metric,
  label,
  columnKey,
  view,
  rows,
  periodicity,
  period,
  valueMap,
  unavailable,
}: {
  valueMap?: Record<string, string>;
  /** Shown instead of the breakdown when its grouping can't be computed. */
  unavailable?: { title: string; body: string };
  metric: ManualMetric;
  label: string;
  columnKey: string;
  view: BreakdownView;
  rows: ManualDatasetRow[];
  periodicity: Periodicity;
  period: string;
}) => {
  const series: SegmentSeries[] = React.useMemo(() => {
    const groups = new Map<string, ManualDatasetRow[]>();
    rows.forEach((row) => {
      const raw = String(row.data?.[columnKey] ?? "").trim();
      if (!raw) return;
      const value = valueMap ? valueMap[raw] ?? "Marketplace" : raw;
      groups.set(value, [...(groups.get(value) ?? []), row]);
    });
    return Array.from(groups.entries())
      .map(([value, groupRows]) => ({
        value,
        points: bucketSeries(aggregateDataset(groupRows, metric), periodicity),
      }))
      .filter((segment) => segment.points.length > 0)
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [rows, columnKey, metric, periodicity, valueMap]);

  /** Value of each segment in the selected period (or its latest period). */
  const current = React.useMemo(
    () =>
      series
        .map((segment) => {
          const point =
            period === ALL
              ? segment.points[0]
              : segment.points.find((p) => p.period === period);
          return { value: segment.value, point };
        })
        .filter((entry) => entry.point !== undefined)
        .map((entry) => ({
          segment: entry.value,
          value: Number(entry.point!.value.toFixed(2)),
          rows: entry.point!.rows,
          period: entry.point!.period,
        }))
        .sort((a, b) => b.value - a.value),
    [series, period],
  );

  /** One row per period, one column per segment value — oldest first. */
  const overTime = React.useMemo(() => {
    const byPeriod = new Map<string, Record<string, string | number>>();
    series.forEach((segment) => {
      segment.points.forEach((point) => {
        const row = byPeriod.get(point.period) ?? { period: point.period };
        row[segment.value] = Number(point.value.toFixed(2));
        byPeriod.set(point.period, row);
      });
    });
    return Array.from(byPeriod.values()).sort((a, b) =>
      comparePeriods(String(a.period), String(b.period)),
    );
  }, [series]);

  const total = current.reduce((sum, entry) => sum + entry.value, 0);
  const hasData = view === "line" ? overTime.length > 0 : current.length > 0;

  return (
    <section className="pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[16px] font-medium text-foreground">
          {(metric.surface || metric.name)} per {label.toLowerCase()}
        </p>

        <p className="text-[12px] text-muted-foreground">
          {period === ALL ? "Latest period" : period}
        </p>
      </div>
      <DesignSpacer size="small" />

      {unavailable ? (
        <DesignEmptyState icon={<ChartBar size={40} />} title={unavailable.title} body={unavailable.body} />
      ) : !hasData ? (
        <DesignEmptyState
          icon={<ChartBar size={40} />}
          title="No breakdown yet"
          body={`This metric has no values split by ${label.toLowerCase()} for the selected period.`}
        />
      ) : view === "table" ? (
        <div className={`${ts.containerNested} overflow-x-auto`}><table className={ts.table}>
          <thead>
            <tr className={ts.headRow}>
              <th className={ts.th}>{label}</th>
              <th className={`${ts.th} ${ts.thNumeric}`}>Value</th>
              <th className={`${ts.th} ${ts.thNumeric}`}>Share</th>
              <th className={`${ts.th} ${ts.thNumeric}`}>Rows</th>
            </tr>
          </thead>
          <tbody>
            {current.map((entry) => (
              <tr key={entry.segment} className={ts.row}>
                <td className={ts.td}>{entry.segment}</td>
                <td className={`${ts.td} ${ts.tdNumeric}`}>
                  {formatValue(entry.value, metric.unit)}
                </td>
                <td className={`${ts.td} ${ts.tdNumeric} ${ts.tdMuted}`}>
                  {total > 0 ? `${Math.round((entry.value / total) * 100)}%` : "—"}
                </td>
                <td className={`${ts.td} ${ts.tdNumeric} ${ts.tdMuted}`}>{entry.rows}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : view === "bar" ? (
        current.length > 10 ? (
          <div style={{ height: Math.max(280, current.length * 28 + 40) }} className="w-full rounded-[6px] border border-border p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={current}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="segment"
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted-foreground)"
                  width={140}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="value" name={metric.name} fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={current} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="segment" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={44} />
                <Tooltip
                  contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="value" name={metric.name} fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overTime} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={44} />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((segment, index) => (
                <Line
                  key={segment.value}
                  type="monotone"
                  dataKey={segment.value}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

/** Every breakdown configured for one metric, one card per filterable column. */
const MetricBreakdowns = ({
  metric,
  filters,
  periodicity,
}: {
  metric: ManualMetric;
  filters: BreakdownFilters;
  periodicity: Periodicity;
}) => {
  const isDataset = metric.source_type !== "dynamic";
  const datasetId = isDataset ? metric.dataset_id ?? undefined : undefined;
  const rows = useDatasetRows(datasetId);
  const columns = useDatasetColumns(datasetId);
  const units = useTeamBusinessUnits();
  const teamUnits = units.data ?? {};
  // Team columns are only ever shown grouped by business unit (GetDX level-3 groups).
  const unitsMissing = !units.isLoading && Object.keys(teamUnits).length === 0;

  const configured = React.useMemo(() => {
    const keys = Array.isArray(metric.filter_columns) ? metric.filter_columns : [];
    const views = (metric.breakdown_views ?? {}) as Record<string, BreakdownView>;
    return (columns.data ?? [])
      .filter((column) => keys.includes(column.key))
      .map((column) => ({
        key: column.key,
        label: column.label,
        view: (views[column.key] ?? "table") as BreakdownView,
      }))
      .filter((column) => column.view !== "none");
  }, [columns.data, metric.filter_columns, metric.breakdown_views]);

  const allColumns = columns.data ?? [];
  const segmentSignature = JSON.stringify(filters.segments);

  if (!isDataset || configured.length === 0) return null;
  if (units.isLoading && configured.some((c) => isTeamLabel(c.label))) {
    return (
      <div className="flex justify-center py-8">
        <DesignLoader />
      </div>
    );
  }

  return (
    <>
      {configured.map((column) => {
        // Other filter selections still apply; the column being broken down does not.
        const segments = JSON.parse(segmentSignature) as Record<string, string>;
        const filtered = (rows.data ?? []).filter((row) =>
          allColumns.every((other) => {
            if (other.key === column.key) return true;
            const selected = segments[other.label];
            if (!selected || selected === ALL) return true;
            return String(row.data?.[other.key] ?? "").trim() === selected;
          }),
        );
        const byUnit = isTeamLabel(column.label);
        return (
          <Breakdown
            key={column.key}
            metric={metric}
            label={byUnit ? "Business unit" : column.label}
            valueMap={byUnit ? teamUnits : undefined}
            unavailable={byUnit && unitsMissing ? BUSINESS_UNITS_UNAVAILABLE : undefined}
            columnKey={column.key}
            view={column.view}
            rows={filtered}
            periodicity={periodicity}
            period={filters.period}
          />
        );
      })}
    </>
  );
};

export default MetricBreakdowns;
