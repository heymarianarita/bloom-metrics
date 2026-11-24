import * as React from "react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTabs } from "@/components/ds/DesignTabs";
import { Sparkle } from "@phosphor-icons/react";
import { InsightsChat } from "@/components/metrics/InsightsChat";
import { useInsightsChat } from "@/hooks/useInsightsChat";
import { changeTone, type ManualMetric } from "@/hooks/useManualMetrics";
import type { SeriesPoint } from "@/lib/periodBuckets";

/**
 * One vocabulary for every Insights panel. The badge label and its colour come
 * from the kind, so pages can't drift into their own labels (or all say "Trend").
 */
export const INSIGHT_KINDS = {
  Growth: "success",
  "Top mover": "success",
  "Record high": "success",
  Steady: "muted",
  Dip: "highlight",
  Decline: "error",
  Risk: "error",
  "Needs attention": "highlight",
  "Low data": "muted",
} as const;

export type InsightKind = keyof typeof INSIGHT_KINDS;

/** A figure's change between two periods, drawn as one row of the panel's change table. */
export interface InsightChange {
  /** What changed, as named on the page. */
  label: string;
  value: string;
  /** "+0.1", "−12%" or "No change". */
  delta: string;
  direction: "up" | "down" | "flat";
  tone: "good" | "bad" | "neutral";
  period: string;
  previousPeriod: string;
}

export interface Insight {
  kind: InsightKind;
  /** A full sentence, also what the AI chat is asked about. */
  title: string;
  body: string;
  /** Period-over-period changes go in the change table instead of the notes. */
  change?: InsightChange;
}

/** Notes most worth reading first. */
const KIND_ORDER: InsightKind[] = ["Risk", "Decline", "Needs attention", "Dip", "Top mover", "Record high", "Growth", "Steady", "Low data"];

const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** Drops of this size or more (as a fraction) count as a Decline rather than a Dip. */
export const DECLINE_THRESHOLD = 0.1;

/** Kind for a period-over-period change: pct is a fraction (0.12 = +12%), null when unknown. */
export const changeKind = (delta: number, pct: number | null, flat = Math.abs(delta) < 1e-9): InsightKind => {
  if (flat) return "Steady";
  if (delta > 0) return "Growth";
  return pct !== null && Math.abs(pct) >= DECLINE_THRESHOLD ? "Decline" : "Dip";
};

export type MetricSeries = { metric: ManualMetric; points: SeriesPoint[] }[];

const fmt = (value: number, unit: string) => {
  const v = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit === "%" ? `${v}%` : unit ? `${v} ${unit}` : v;
};

/** Insights from configured metric series (latest period first). */
export const metricInsights = (series: MetricSeries): Insight[] => {
  const out: Insight[] = [];
  const withData = series.filter((s) => s.points.length > 0);
  const singlePeriod: string[] = [];
  const records: { name: string; periods: number }[] = [];
  const smallSamples: { name: string; rows: number; period: string }[] = [];
  withData.forEach(({ metric, points }) => {
    const [latest, prev] = points;
    if (latest.rows !== undefined && latest.rows < 10) smallSamples.push({ name: metric.name, rows: latest.rows, period: latest.period });
    if (!prev) {
      singlePeriod.push(metric.name);
      return;
    }
    const delta = latest.value - prev.value;
    const pct = prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : null;
    const flat = Math.abs(delta) < 0.05;
    const tone = flat ? "neutral" : changeTone(metric.direction, delta);
    // Which way is good decides the kind: fewer detachments is growth, not a dip.
    const kind = flat ? "Steady" : tone === "bad" ? changeKind(-1, pct === null ? null : -Math.abs(pct) / 100) : "Growth";
    const pctText = pct !== null ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)` : "";
    out.push({
      kind,
      title: flat
        ? `${metric.name} held steady in ${latest.period}`
        : `${metric.name} ${delta >= 0 ? "up" : "down"} ${fmt(Math.abs(delta), metric.unit)} in ${latest.period}`,
      body: `${fmt(latest.value, metric.unit)} against ${fmt(prev.value, metric.unit)} in ${prev.period}${pctText}.`,
      change: {
        label: metric.name,
        value: fmt(latest.value, metric.unit),
        delta: flat ? "No change" : `${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta), metric.unit)}`,
        direction: flat ? "flat" : delta > 0 ? "up" : "down",
        tone,
        period: latest.period,
        previousPeriod: prev.period,
      },
    });
    const best = metric.direction === "down" ? Math.min(...points.map((p) => p.value)) : Math.max(...points.map((p) => p.value));
    if (points.length >= 3 && metric.direction !== "none" && latest.value === best) records.push({ name: metric.name, periods: points.length });
  });

  const moves = out
    .filter((i) => i.change && i.change.tone === "good")
    .map((i) => {
      const s = withData.find((x) => x.metric.name === i.change!.label)!;
      return { name: s.metric.name, size: Math.abs((s.points[0].value - s.points[1].value) / (s.points[1].value || 1)) };
    })
    .sort((a, b) => b.size - a.size);
  if (moves.length > 0 && out.filter((i) => i.change).length > 1) {
    out.push({ kind: "Top mover", title: `${moves[0].name} improved the most`, body: "The biggest change the good way, relative to its previous value." });
  }
  if (records.length > 0) {
    out.push(
      records.length === 1
        ? { kind: "Record high", title: `${records[0].name} is at its best level`, body: `The best of ${records[0].periods} periods tracked.` }
        : { kind: "Record high", title: `${records.length} metrics are at their best level`, body: `${list(records.map((r) => r.name))}.` },
    );
  }
  if (smallSamples.length > 0) {
    const period = smallSamples[0].period;
    out.push({
      kind: "Low data",
      title: `Small sample in ${period}`,
      body:
        new Set(smallSamples.map((s) => s.rows)).size === 1
          ? `Only ${smallSamples[0].rows} response${smallSamples[0].rows === 1 ? "" : "s"} for ${list(smallSamples.map((s) => s.name))}: read ${smallSamples.length === 1 ? "it" : "them"} with care.`
          : `Fewer than 10 responses for ${list(smallSamples.map((s) => s.name))}: read ${smallSamples.length === 1 ? "it" : "them"} with care.`,
    });
  }
  if (singlePeriod.length > 0) {
    out.push({
      kind: "Low data",
      title: singlePeriod.length === 1 ? `${singlePeriod[0]} has one period of data` : `${singlePeriod.length} metrics have one period of data`,
      body: `${singlePeriod.length === 1 ? "" : `${list(singlePeriod)}. `}Changes appear once another period is added.`,
    });
  }
  return out;
};

/** Compact form of the metric series on screen, for the chat's view of the page. */
export const seriesForChat = (series: MetricSeries) =>
  series.map(({ metric, points }) => ({
    metric: metric.name,
    slug: metric.slug,
    unit: metric.unit,
    // Latest first, as shown on the page.
    points: points.slice(0, 8).map((p) => ({ period: p.period, value: Number(p.value.toFixed(2)), responses: p.rows })),
  }));

interface InsightsPanelProps {
  subject: string;
  insights: Insight[];
  emptyText?: string;
  footer?: React.ReactNode;
  className?: string;
  /**
   * Enables the "Ask" tab. `page` names the page; `view` is a compact summary of what is on
   * screen (filters, figures). The insights listed here are always included.
   */
  chat?: { page: string; view?: Record<string, unknown>; suggestions?: string[] };
}

const DEFAULT_SUGGESTIONS = [
  "Summarise this page for a status update",
  "What changed most since last period, and why?",
  "Compare this with the same period last year",
];

const TONE_CLASS: Record<InsightChange["tone"], string> = {
  good: "text-btn-success",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
};
const ARROW: Record<InsightChange["direction"], string> = { up: "▲", down: "▼", flat: "" };

/** One figure: its name, value now and change; clicking it asks the AI about it. */
const ChangeRow = ({ item, comparison, onAsk }: { item: Insight; comparison: [string, string] | null; onAsk?: () => void }) => {
  const c = item.change!;
  const otherPeriods = comparison && (c.period !== comparison[0] || c.previousPeriod !== comparison[1]);
  const content = (
    <>
      <span className="min-w-0 text-sm text-foreground leading-5 line-clamp-2">
        {c.label}
        {otherPeriods && <span className="text-muted-foreground"> · {c.period} vs {c.previousPeriod}</span>}
      </span>
      <span className="text-sm font-medium text-foreground tabular-nums text-right">{c.value}</span>
      <span className={`text-xs tabular-nums text-right whitespace-nowrap ${TONE_CLASS[c.tone]}`}>
        {ARROW[c.direction] && <span aria-hidden="true">{ARROW[c.direction]} </span>}
        {c.delta}
      </span>
    </>
  );
  const grid = "grid w-full grid-cols-[minmax(0,1fr)_auto_64px] items-baseline gap-x-3 py-2";
  return onAsk ? (
    <button
      type="button"
      onClick={onAsk}
      title={`${item.body} Click to dig deeper.`}
      className={`${grid} text-left rounded-[4px] hover:bg-[rgba(0,119,130,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {content}
    </button>
  ) : (
    <div className={grid} title={item.body}>
      {content}
    </div>
  );
};

/** Side panel listing data-derived insights for the current view, plus an AI chat to dig deeper. */
export const InsightsPanel = ({ subject, insights, emptyText, footer, className, chat }: InsightsPanelProps) => {
  const [tab, setTab] = React.useState<"insights" | "ask">("insights");
  const conversation = useInsightsChat({
    page: chat?.page ?? "",
    subject,
    view: { ...chat?.view, insightsShown: insights.map(({ kind, title, body }) => `${kind}: ${title}. ${body}`) },
  });

  const askAbout = (item: Insight) => {
    setTab("ask");
    conversation.ask(`Tell me more about this: "${item.title}". What's behind it, and which segments or items drive it?`);
  };

  const changes = insights.filter((i) => i.change);
  const notes = insights
    .filter((i) => !i.change)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => KIND_ORDER.indexOf(a.item.kind) - KIND_ORDER.indexOf(b.item.kind) || a.index - b.index)
    .map(({ item }) => item);
  // The comparison most rows share, said once above the table.
  const comparison = (() => {
    const counts = new Map<string, number>();
    changes.forEach((i) => {
      const key = `${i.change!.period}\u0000${i.change!.previousPeriod}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    return top ? (top[0].split("\u0000") as [string, string]) : null;
  })();

  return (
    <DesignCard
      variant="default"
      className={`flex flex-col overflow-hidden ${tab === "ask" ? "min-h-[480px]" : ""} ${className ?? ""}`}
    >
      <div className="px-5 pt-5 pb-3">
        <DesignPageHeader
          title="Insights"
          subtitle={tab === "ask" ? `Ask the data about ${subject}` : `What the data says about ${subject}`}
          showBackChevron={false}
        />
      </div>
      {chat && (
        <DesignTabs
          className="mx-5 mb-3"
          tabs={[
            { id: "insights", label: "Highlights" },
            { id: "ask", label: "AI Analysis" },
          ]}
          activeTab={tab}
          onTabChange={(id) => setTab(id as "insights" | "ask")}
        />
      )}
      {tab === "ask" && chat ? (
        <InsightsChat chat={conversation} suggestions={chat.suggestions ?? DEFAULT_SUGGESTIONS} />
      ) : (
        <div className="px-5 pb-5 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
          {insights.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {emptyText ?? "Insights appear once there is data to analyse."}
            </p>
          )}
          {changes.length > 0 && (
            <section>
              <p className="text-xs text-muted-foreground">
                {comparison ? `${comparison[0]} vs ${comparison[1]}` : "Since the previous period"}
              </p>
              <ul className="mt-1 divide-y divide-border">
                {changes.map((item, i) => (
                  <li key={i}>
                    <ChangeRow item={item} comparison={comparison} onAsk={chat ? () => askAbout(item) : undefined} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {notes.length > 0 && (
            <section className={changes.length > 0 ? "mt-2" : ""}>
              {changes.length > 0 && <p className="text-xs text-muted-foreground">Worth noting</p>}
              <ul className="divide-y divide-border">
                {notes.map((item, i) => {
                  const content = (
                    <>
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-foreground leading-5">{item.title}</span>
                        <DesignBadge theme={INSIGHT_KINDS[item.kind]} styling="light" className="shrink-0">
                          {item.kind}
                        </DesignBadge>
                      </span>
                      <span className="block text-xs text-muted-foreground mt-1">{item.body}</span>
                    </>
                  );
                  return (
                    <li key={i}>
                      {chat ? (
                        <button
                          type="button"
                          onClick={() => askAbout(item)}
                          title="Click to dig deeper"
                          className="block w-full py-3 text-left rounded-[4px] hover:bg-[rgba(0,119,130,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {chat && insights.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkle size={12} weight="fill" className="text-primary" aria-hidden="true" />
              Click any line to dig deeper with AI Analysis.
            </p>
          )}
          {footer}
        </div>
      )}
    </DesignCard>
  );
};

export default InsightsPanel;
