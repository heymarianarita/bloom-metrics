import type { ReportMetric } from "./metrics.ts";

/**
 * The Slack message for one quarterly report, in Block Kit: title, optional intro, the AI
 * summary, one line per metric with its change from the previous quarter, and a link button. No imports
 * beyond types, so the app's preview and the server build the same text.
 */

export interface SlackMessage {
  /** Shown in notifications and wherever blocks can't be drawn. */
  text: string;
  blocks: Record<string, unknown>[];
}

/** Slack reads &, < and > as markup in mrkdwn text. */
export const escapeSlack = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const formatNumber = (value: number) =>
  value.toLocaleString("en-GB", { maximumFractionDigits: Number.isInteger(value) ? 0 : Math.abs(value) < 10 ? 2 : 1 });

/** 45.25 with "%" → "45.25%"; 1200 with "users" → "1,200 users". */
export const formatValue = (value: number, unit: string) =>
  unit === "%" ? `${formatNumber(value)}%` : unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);

/** "Up 0.3 from 3.9 in 2026-Q2 (better)", or why there's nothing to compare. */
export const describeChange = (metric: ReportMetric, previousQuarter: string) => {
  if (metric.value === null) return "";
  if (metric.previous === null) return `No data for ${previousQuarter} to compare`;
  const delta = Number((metric.value - metric.previous).toFixed(2));
  const from = `from ${formatValue(metric.previous, metric.unit)} in ${previousQuarter}`;
  if (delta === 0) return `Same as ${previousQuarter}`;
  const better = metric.direction === "none" ? "" : (metric.direction === "down" ? delta < 0 : delta > 0) ? " (better)" : " (worse)";
  return `${delta > 0 ? "Up" : "Down"} ${formatNumber(Math.abs(delta))} ${from}${better}`;
};

export const TONE = { better: "🟢", worse: "🔴", neutral: "⚪" } as const;

/** Whether the change from the previous quarter went the metric's good way. */
export const changeTone = (metric: ReportMetric): keyof typeof TONE => {
  if (metric.value === null || metric.previous === null || metric.direction === "none") return "neutral";
  const delta = Number((metric.value - metric.previous).toFixed(2));
  if (delta === 0) return "neutral";
  return (metric.direction === "down" ? delta < 0 : delta > 0) ? "better" : "worse";
};

/** One line per metric: "🟢 *CSAT*: 4.2 (↑ 0.3 from 3.9)". The dot says better or worse, the arrow which way. */
export const metricLine = (metric: ReportMetric, quarter: string, previousQuarter: string) => {
  const start = `${TONE[changeTone(metric)]} *${escapeSlack(metric.name)}*`;
  if (metric.unavailable) return `${start}: ${escapeSlack(metric.unavailable)}`;
  if (metric.value === null) return `${start}: no data for ${quarter}`;
  const value = formatValue(metric.value, metric.unit);
  if (metric.previous === null) return `${start}: ${value} (no ${previousQuarter} data to compare)`;
  const delta = Number((metric.value - metric.previous).toFixed(2));
  if (delta === 0) return `${start}: ${value} (same as ${previousQuarter})`;
  return `${start}: ${value} (${delta > 0 ? "↑" : "↓"} ${formatNumber(Math.abs(delta))} from ${formatValue(metric.previous, metric.unit)})`;
};

/** Metric lines grouped into sections that stay under Slack's 3000 characters each. */
export const metricSections = (lines: string[], limit = 3000) =>
  lines.reduce<string[]>((sections, line) => {
    const last = sections.at(-1);
    if (last !== undefined && last.length + 1 + line.length <= limit) sections[sections.length - 1] = `${last}\n${line}`;
    else sections.push(line.slice(0, limit));
    return sections;
  }, []);

export const metricsLegend = (previousQuarter: string) =>
  `Compared with ${previousQuarter} · ${TONE.better} better · ${TONE.worse} worse · ${TONE.neutral} no change or no target direction`;

export const IMPACT_HEADING = "Impact";
export const OTHER_METRICS_HEADING = "Other metrics";

export const OPEN_APP_LABEL = "Open Bloom Metrics";
export const appLink = (appUrl: string) => `${appUrl}/metrics/impact`;

/** Model output → Slack mrkdwn: **bold** → *bold*, "- " bullets → "• ", no headings. */
export const toSlackMrkdwn = (markdown: string) =>
  markdown
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();

export const defaultTitle = (name: string, quarter: string) => `${name}: ${quarter}`;

export const AI_SUMMARY_NOTE = "Summary written by AI from Bloom Metrics data. The numbers below are exact.";

export function buildMessage(input: {
  name: string;
  quarter: string;
  previousQuarter: string;
  intro: string;
  /** The Impact page's metrics, shown in their own section before the others. */
  impact?: ReportMetric[];
  metrics: ReportMetric[];
  /** Slack mrkdwn, or null when the report has no summary (or it couldn't be written). */
  summary: string | null;
  /** Whether the summary came from AI. Defaults to true. */
  summaryByAi?: boolean;
  appUrl: string;
}): SlackMessage {
  const title = defaultTitle(input.name, input.quarter);
  const blocks: Record<string, unknown>[] = [{ type: "header", text: { type: "plain_text", text: title.slice(0, 150), emoji: true } }];

  if (input.intro.trim()) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: escapeSlack(input.intro.trim()).slice(0, 3000) } });
  }
  if (input.summary?.trim()) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: escapeSlack(input.summary.trim()).slice(0, 3000) } });
    if (input.summaryByAi ?? true) blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: AI_SUMMARY_NOTE }] });
  }
  const impact = input.impact ?? [];
  const groups = [
    { heading: IMPACT_HEADING, metrics: impact },
    { heading: impact.length ? OTHER_METRICS_HEADING : null, metrics: input.metrics },
  ].filter((g) => g.metrics.length);
  if (groups.length) {
    blocks.push({ type: "divider" });
    for (const group of groups) {
      const lines = group.metrics.map((m) => metricLine(m, input.quarter, input.previousQuarter));
      if (group.heading) lines.unshift(`*${group.heading}*`);
      for (const text of metricSections(lines)) blocks.push({ type: "section", text: { type: "mrkdwn", text } });
    }
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: metricsLegend(input.previousQuarter) }] });
  }
  blocks.push({
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: OPEN_APP_LABEL }, url: appLink(input.appUrl), action_id: "open_bloom_metrics" },
    ],
  });

  return { text: title, blocks };
}
