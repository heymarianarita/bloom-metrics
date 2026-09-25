import * as React from "react";
import { ChartBar } from "@phosphor-icons/react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { useFigmaHistory } from "@/hooks/useFigmaHistory";
import { FIGMA_LIBRARIES } from "@/hooks/useFigmaAnalytics";
import { LINE_COLORS } from "@/lib/chartColors";

/** Figma keeps library analytics for about a year, so the chart shows the last four quarters. */
const QUARTERS_SHOWN = 4;

/** Labels ("2026-Q3") of the current quarter and the ones before it, oldest first. */
const recentQuarters = (count: number, now = new Date()) => {
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3) + 1;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.unshift(`${y}-Q${q}`);
    q -= 1;
    if (q === 0) { q = 4; y -= 1; }
  }
  return out;
};

/**
 * Quarterly insertions for every Figma library, from the stored snapshots. The
 * server backfills missing past quarters from Figma (backfillFigmaSnapshots), so
 * history is there without waiting for the scheduled captures.
 * Same look as the Adoption → Overview "Evolution over time" chart.
 */
export const FigmaLibrariesTrend = () => {
  const history = useFigmaHistory();

  const { data, libraries } = React.useMemo(() => {
    const names = new Map(FIGMA_LIBRARIES.map((l) => [l.key, l.name]));
    const shown = new Set(recentQuarters(QUARTERS_SHOWN));
    const byQuarter = new Map<string, Record<string, string | number>>();
    const seen: string[] = [];
    for (const snap of history.data ?? []) {
      if (!shown.has(snap.quarter)) continue;
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
        <p className="text-[12px] text-muted-foreground">Quarterly insertions, last 12 months</p>
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
          body="Past quarters are fetched from Figma when the app starts and daily after that. Refresh in a few minutes."
        />
      ) : (
        <div className="h-[256px] w-full rounded-[6px] border border-border p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" interval={0} />
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
