import * as React from "react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignBadge } from "@/components/ds/DesignBadge";
import type { ManualMetric } from "@/hooks/useManualMetrics";
import type { SeriesPoint } from "@/lib/periodBuckets";

export interface Insight {
  kind: "Risk" | "Trend" | "Watch";
  theme: "error" | "success" | "highlight";
  title: string;
  body: string;
}

export type MetricSeries = { metric: ManualMetric; points: SeriesPoint[] }[];

const fmt = (value: number, unit: string) => {
  const v = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit === "%" ? `${v}%` : unit ? `${v} ${unit}` : v;
};

/** Insights from configured metric series (latest period first). */
export const metricInsights = (series: MetricSeries): Insight[] => {
  const out: Insight[] = [];
  const withData = series.filter((s) => s.points.length > 0);
  withData.forEach(({ metric, points }) => {
    const [latest, prev] = points;
    if (!prev) {
      out.push({
        kind: "Watch",
        theme: "highlight",
        title: `${metric.name} has only one period of data`,
        body: `${fmt(latest.value, metric.unit)} in ${latest.period}. Trends appear once another period is added.`,
      });
      return;
    }
    const delta = latest.value - prev.value;
    const pct = prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : null;
    const big = pct !== null && Math.abs(pct) >= 10;
    const flat = Math.abs(delta) < 0.05;
    out.push(
      flat
        ? {
            kind: "Trend",
            theme: "highlight",
            title: `${metric.name} held steady in ${latest.period}`,
            body: `${fmt(latest.value, metric.unit)}, the same as in ${prev.period}.`,
          }
        : {
            kind: delta < 0 && big ? "Risk" : "Trend",
            theme: delta < 0 && big ? "error" : delta >= 0 ? "success" : "highlight",
            title: `${metric.name} ${delta >= 0 ? "up" : "down"} ${fmt(Math.abs(delta), metric.unit)} in ${latest.period}`,
            body: `${fmt(latest.value, metric.unit)} against ${fmt(prev.value, metric.unit)} in ${prev.period}${
              pct !== null ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)` : ""
            }.`,
          },
    );
    const peak = points.reduce((a, b) => (b.value > a.value ? b : a));
    if (points.length >= 3 && peak.period === latest.period) {
      out.push({
        kind: "Trend",
        theme: "success",
        title: `${metric.name} is at its highest level`,
        body: `${latest.period} is the best of ${points.length} periods tracked.`,
      });
    }
    if (latest.rows !== undefined && latest.rows < 10) {
      out.push({
        kind: "Watch",
        theme: "highlight",
        title: `Small sample for ${metric.name}`,
        body: `Only ${latest.rows} response${latest.rows === 1 ? "" : "s"} in ${latest.period} — read the figure with care.`,
      });
    }
  });
  if (withData.length > 1) {
    const moves = withData
      .filter((s) => s.points[1])
      .map((s) => ({ name: s.metric.name, d: s.points[0].value - s.points[1].value }))
      .sort((a, b) => b.d - a.d);
    if (moves.length > 1) {
      out.unshift({
        kind: "Trend",
        theme: "success",
        title: `${moves[0].name} grew the most`,
        body: `${moves[moves.length - 1].name} moved the least this period.`,
      });
    }
  }
  return out;
};

interface InsightsPanelProps {
  subject: string;
  insights: Insight[];
  emptyText?: string;
  footer?: React.ReactNode;
  className?: string;
}

/** Side panel listing data-derived insights for the current view. */
export const InsightsPanel = ({ subject, insights, emptyText, footer, className }: InsightsPanelProps) => (
  <DesignCard variant="default" className={`flex flex-col overflow-hidden ${className ?? ""}`}>
    <div className="px-5 pt-5 pb-3">
      <DesignPageHeader
        title="Insights"
        subtitle={`What the data says about ${subject}`}
        showBackChevron={false}
      />
    </div>
    <div className="px-5 pb-5 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
      {insights.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {emptyText ?? "Insights appear once there is data to analyse."}
        </p>
      )}
      {insights.map((item, i) => (
        <div key={i} className="py-2 border-b border-border last:border-0">
          <DesignBadge theme={item.theme} styling="light">
            {item.kind}
          </DesignBadge>
          <p className="text-sm font-medium text-foreground mt-2">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
        </div>
      ))}
      {footer}
    </div>
  </DesignCard>
);

export default InsightsPanel;
