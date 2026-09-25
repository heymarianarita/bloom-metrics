import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { useQueries } from "@tanstack/react-query";
import { ChartBar } from "@phosphor-icons/react";
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
import { supabase } from "@/integrations/supabase/client";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignTooltip } from "@/components/ds/DesignTooltip";

/** Single-line cell text; truncates with a tooltip showing the full value. */
const Trunc = ({ text }: { text: string }) => (
  <DesignTooltip content={text}>
    <span className="block truncate">{text}</span>
  </DesignTooltip>
);
import {
  aggregateDataset,
  type ManualDatasetColumn,
  type ManualDatasetRow,
} from "@/hooks/useManualDatasets";
import type { BreakdownView, ManualMetric } from "@/hooks/useManualMetrics";
import { bucketSeries } from "@/lib/periodBuckets";
import type { Periodicity } from "@/hooks/useMetricGroups";
import {
  DEFAULT_ALIAS_CONFIG,
  normalizeComponentName,
  useComponentAliases,
} from "@/hooks/useComponentAliases";
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

const formatValue = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
};

interface Props {
  group: string;
  metrics: ManualMetric[];
  filters: { period: string; segments: Record<string, string> };
  periodicity: Periodicity;
}

/** One chart or table per breakdown aspect, combining every metric in the group. */
const MergedBreakdowns = ({ group, metrics, filters, periodicity }: Props) => {
  const { data: aliasConfig = DEFAULT_ALIAS_CONFIG } = useComponentAliases();
  const units = useTeamBusinessUnits();
  const teamUnits = units.data ?? {};
  // Team columns are only ever shown grouped by business unit (GetDX level-3 groups).
  const unitsMissing = !units.isLoading && Object.keys(teamUnits).length === 0;
  const datasetMetrics = metrics.filter((m) => m.source_type !== "dynamic" && m.dataset_id);
  const datasetIds = Array.from(new Set(datasetMetrics.map((m) => m.dataset_id!)));

  const rowQueries = useQueries({
    queries: datasetIds.map((id) => ({
      queryKey: ["manual-dataset-rows", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("manual_dataset_rows")
          .select("*")
          .eq("dataset_id", id)
          .order("sort_order", { ascending: true });
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as ManualDatasetRow[];
      },
    })),
  });
  const columnQueries = useQueries({
    queries: datasetIds.map((id) => ({
      queryKey: ["manual-dataset-columns", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("manual_dataset_columns")
          .select("*")
          .eq("dataset_id", id)
          .order("sort_order", { ascending: true });
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as ManualDatasetColumn[];
      },
    })),
  });

  const rowsById = new Map<string, ManualDatasetRow[]>();
  const colsById = new Map<string, ManualDatasetColumn[]>();
  datasetIds.forEach((id, i) => {
    rowsById.set(id, rowQueries[i]?.data ?? []);
    colsById.set(id, columnQueries[i]?.data ?? []);
  });

  // Group configured breakdown columns across metrics by their label.
  const aspects = new Map<
    string,
    { label: string; views: BreakdownView[]; entries: { metric: ManualMetric; column: ManualDatasetColumn }[] }
  >();
  datasetMetrics.forEach((metric) => {
    const keys = Array.isArray(metric.filter_columns) ? metric.filter_columns : [];
    const views = (metric.breakdown_views ?? {}) as Record<string, BreakdownView>;
    (colsById.get(metric.dataset_id!) ?? [])
      .filter((c) => keys.includes(c.key))
      .forEach((column) => {
        const view = (views[column.key] ?? "table") as BreakdownView;
        if (view === "none") return;
        const label = isTeamLabel(column.label) ? "Business unit" : column.label;
        const id = label.trim().toLowerCase();
        const aspect = aspects.get(id) ?? { label, views: [], entries: [] };
        aspect.views.push(view);
        aspect.entries.push({ metric, column });
        aspects.set(id, aspect);
      });
  });

  if (aspects.size === 0) return null;
  if (units.isLoading && Array.from(aspects.values()).some((a) => a.entries.some((e) => isTeamLabel(e.column.label)))) {
    return (
      <div className="flex justify-center py-8">
        <DesignLoader />
      </div>
    );
  }

  return (
    <>
      {Array.from(aspects.values()).map((aspect) => {
        const bySegment = new Map<string, Record<string, number>>();
        const metricNames: string[] = [];
        aspect.entries.forEach(({ metric, column }) => {
          metricNames.push(metric.name);
          const allCols = colsById.get(metric.dataset_id!) ?? [];
          const rows = (rowsById.get(metric.dataset_id!) ?? []).filter((row) =>
            allCols.every((other) => {
              if (other.key === column.key) return true;
              const selected = filters.segments[other.label];
              if (!selected || selected === ALL) return true;
              return String(row.data?.[other.key] ?? "").trim() === selected;
            }),
          );
          const isComponent = /component/i.test(aspect.label);
          const groups = new Map<string, ManualDatasetRow[]>();
          rows.forEach((row) => {
            const raw = String(row.data?.[column.key] ?? "").trim();
            const byUnit = isTeamLabel(column.label);
            const value = !raw
              ? raw
              : byUnit
                ? teamUnits[raw] ?? "Marketplace"
                : isComponent
                  ? normalizeComponentName(raw, aliasConfig, metric.dataset_id!)
                  : raw;
            if (value) groups.set(value, [...(groups.get(value) ?? []), row]);
          });
          groups.forEach((groupRows, segment) => {
            const points = bucketSeries(aggregateDataset(groupRows, metric), periodicity);
            const point =
              filters.period === ALL ? points[0] : points.find((p) => p.period === filters.period);
            if (!point) return;
            const entry = bySegment.get(segment) ?? {};
            entry[metric.name] = Number(point.value.toFixed(2));
            bySegment.set(segment, entry);
          });
        });

        const data = Array.from(bySegment.entries())
          .map(([segment, values]) => ({
            segment,
            ...values,
            __total: Object.values(values).reduce((s, v) => s + v, 0),
          }))
          .sort((a, b) => b.__total - a.__total);
        const asTable = aspect.views.every((v) => v === "table");
        const horizontal = data.length > 10;

        return (
          <section key={aspect.label} className="pt-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-medium text-foreground">
                {group} per {aspect.label.toLowerCase()}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {filters.period === ALL ? "Latest period" : filters.period}
              </p>
            </div>
            <DesignSpacer size="small" />

            {unitsMissing && aspect.entries.some((e) => isTeamLabel(e.column.label)) ? (
              <DesignEmptyState
                icon={<ChartBar size={40} />}
                title="Business units need GetDX"
                body="Teams are grouped into business units using GetDX. Connect GetDX in Settings → Dynamic sources to see this breakdown."
              />
            ) : data.length === 0 ? (
              <DesignEmptyState
                icon={<ChartBar size={40} />}
                title="No breakdown yet"
                body={`No values split by ${aspect.label.toLowerCase()} for the selected period.`}
              />
            ) : asTable ? (
              <div className={`${ts.containerNested} overflow-x-auto`}><table className={`${ts.table} table-fixed`}>
                <thead>
                  <tr className={ts.headRow}>
                    <th className={`${ts.th} w-[28%]`}><Trunc text={aspect.label} /></th>
                    {metricNames.map((name) => (
                      <th key={name} className={`${ts.th} ${ts.thNumeric}`}><Trunc text={name} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.segment} className={ts.row}>
                      <td className={ts.td}><Trunc text={String(row.segment)} /></td>
                      {metricNames.map((name) => (
                        <td key={name} className={`${ts.td} ${ts.tdNumeric}`}>
                          <Trunc text={String(formatValue((row as Record<string, unknown>)[name] as number | undefined))} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            ) : (
              <div
                style={{ height: horizontal ? Math.max(280, data.length * 28 + 60) : 300 }}
                className="w-full rounded-[6px] border border-border p-4"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    layout={horizontal ? "vertical" : "horizontal"}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      horizontal={!horizontal}
                      vertical={horizontal}
                    />
                    {horizontal ? (
                      <>
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                        <YAxis
                          type="category"
                          dataKey="segment"
                          tick={{ fontSize: 12 }}
                          stroke="var(--muted-foreground)"
                          width={140}
                        />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="segment" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                        <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={44} />
                      </>
                    )}
                    <Tooltip
                      contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
                      labelFormatter={(label, payload) => {
                        const total = (payload?.[0]?.payload as { __total?: number } | undefined)?.__total;
                        return total === undefined ? label : `${label} · Total ${formatValue(total)}`;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {metricNames.map((name, i) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="all"
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
};

export default MergedBreakdowns;
