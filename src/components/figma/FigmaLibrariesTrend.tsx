import * as React from "react";
import { ChartBar } from "@phosphor-icons/react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { useFigmaHistory } from "@/hooks/useFigmaHistory";
import { FIGMA_LIBRARIES } from "@/hooks/useFigmaAnalytics";
import { LINE_COLORS } from "@/lib/chartColors";

/**
 * Quarterly insertions for every Figma library, from the stored snapshots
 * (Figma's API only answers per date range, so history comes from figma-snapshot).
 * Same look as the Adoption → Overview "Evolution over time" chart.
 */
export const FigmaLibrariesTrend = () => {
  const history = useFigmaHistory();

  const { data, libraries } = React.useMemo(() => {
    const names = new Map(FIGMA_LIBRARIES.map((l) => [l.key, l.name]));
    const byQuarter = new Map<string, Record<string, string | number>>();
    const seen: string[] = [];
    for (const snap of history.data ?? []) {
      if (snap.inserts === null || snap.inserts === undefined) continue;
      const name = snap.file_name || names.get(snap.file_key) || snap.file_key;
      if (!seen.includes(name)) seen.push(name);
      const row = byQuarter.get(snap.quarter) ?? { period: snap.quarter };
      row[name] = snap.inserts;
      byQuarter.set(snap.quarter, row);
    }
    const rows = [...byQuarter.values()].sort((a, b) => String(a.period).localeCompare(String(b.period)));
    return { data: rows, libraries: seen.sort((a, b) => a.localeCompare(b)) };
  }, [history.data]);

  return (
    <section className="pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[16px] font-medium text-foreground">Evolution over time</p>
        <p className="text-[12px] text-muted-foreground">Quarterly insertions, all libraries</p>
      </div>
      <DesignSpacer size="small" />
      {history.isLoading ? (
        <div className="h-[256px] flex items-center justify-center rounded-[6px] border border-border">
          <DesignLoader />
        </div>
      ) : data.length === 0 ? (
        <DesignEmptyState
          icon={<ChartBar size={40} />}
          title="No history yet"
          body="Quarterly Figma snapshots are captured on the 1st and 15th of each month; the trend appears once they arrive."
        />
      ) : (
        <div className="h-[256px] w-full rounded-[6px] border border-border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
                width={56}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                formatter={(v: number) => v.toLocaleString()}
                contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {libraries.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
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
