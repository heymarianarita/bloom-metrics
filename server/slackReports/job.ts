import { publicUrl } from "../auth.ts";
import { execute, nowMysql, query } from "../db.ts";
import { isLocalDev } from "../devmode.ts";
import { postToChannel } from "../slack.ts";
import { buildMessage } from "./message.ts";
import { impactMetricIds, reportMetrics, type ReportMetric } from "./metrics.ts";
import { dueQuarter, onceStatus, previousQuarter } from "./schedule.ts";
import { openQuestionsFor } from "./qualitative.ts";
import { writeSummary } from "./summary.ts";

/**
 * Builds and sends Slack reports. A one-off report is about one quarter and goes out when
 * someone chooses Send now, or at its scheduled time; a quarterly one goes out after each
 * quarter ends. Scheduled sends claim the row first, so overlapping runs can't post twice.
 */

export interface SlackReportRow {
  id: string;
  name: string;
  channel: string;
  metric_ids: unknown;
  include_summary: number;
  include_impact: number;
  intro: string;
  mode: string;
  quarter: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  summary: string | null;
  summary_quarter: string | null;
  summary_by_ai: number;
  enabled: number;
  send_day: number;
  send_hour: number;
  last_sent_quarter: string | null;
  last_run_at: string | null;
  last_run_quarter: string | null;
  last_run_status: string | null;
  last_run_message: string | null;
  created_at: string;
  updated_at: string;
}

/** The metrics a report shows, and what's needed to write its summary. */
export interface ReportContent {
  name: string;
  metric_ids: string[];
  include_impact: boolean;
}

export interface ReportValues {
  quarter: string;
  previousQuarter: string;
  /** Every metric on the Impact page, when the report has the Impact section. */
  impact: ReportMetric[];
  /** The report's chosen metrics, less any already in the Impact section. */
  metrics: ReportMetric[];
}

/** MySQL DATETIME strings are UTC. */
export const utcMs = (datetime: string) => Date.parse(`${datetime.replace(" ", "T")}Z`);

export const metricIdsOf = (report: Pick<SlackReportRow, "metric_ids">): string[] => {
  const raw = typeof report.metric_ids === "string" ? JSON.parse(report.metric_ids) : report.metric_ids;
  return Array.isArray(raw) ? raw.map(String) : [];
};

export const contentOf = (report: SlackReportRow): ReportContent => ({
  name: report.name,
  metric_ids: metricIdsOf(report),
  include_impact: Boolean(report.include_impact),
});

export const loadReports = () => query<SlackReportRow>("SELECT * FROM slack_reports ORDER BY created_at DESC");

export const loadReport = async (id: string) =>
  (await query<SlackReportRow>("SELECT * FROM slack_reports WHERE id = ?", [id]))[0] ?? null;

export async function reportValues(content: ReportContent, quarter: string): Promise<ReportValues> {
  const previous = previousQuarter(quarter);
  const impactIds = content.include_impact ? await impactMetricIds() : [];
  const [impact, metrics] = await Promise.all([
    reportMetrics(impactIds, quarter, previous),
    reportMetrics(content.metric_ids.filter((id) => !impactIds.includes(id)), quarter, previous),
  ]);
  return { quarter, previousQuarter: previous, impact, metrics };
}

export async function reportSummary(content: ReportContent, values: ReportValues, revise?: { current: string; instruction: string }) {
  return writeSummary({
    reportName: content.name,
    quarter: values.quarter,
    previousQuarter: values.previousQuarter,
    metrics: [...values.impact, ...values.metrics],
    openQuestions: await openQuestionsFor(values.quarter),
    revise,
  });
}

const recordRun = (id: string, quarter: string, status: "sent" | "failed", message: string) =>
  execute(
    "UPDATE slack_reports SET last_run_at = ?, last_run_quarter = ?, last_run_status = ?, last_run_message = ? WHERE id = ?",
    [nowMysql(), quarter, status, message.slice(0, 2000), id],
  );

/**
 * Posts the report on `quarter` as saved. The reviewed summary is used when it was written for
 * that quarter; otherwise (a quarterly report's later quarters) a new one is written.
 */
export async function sendReport(report: SlackReportRow, quarter: string): Promise<{ ok: boolean; message: string }> {
  const content = contentOf(report);
  const values = await reportValues(content, quarter);
  let summary: string | null = null;
  let summaryByAi = true;
  let note = "";
  if (report.include_summary) {
    if (report.summary !== null && report.summary_quarter === quarter) {
      summary = report.summary;
      summaryByAi = Boolean(report.summary_by_ai);
    } else {
      const written = await reportSummary(content, values);
      summary = written.summary;
      if (written.summary === null) note = ` ${written.note}`;
    }
  }
  const message = buildMessage({
    name: report.name,
    quarter,
    previousQuarter: values.previousQuarter,
    intro: report.intro ?? "",
    impact: values.impact,
    metrics: values.metrics,
    summary,
    summaryByAi,
    appUrl: publicUrl(),
  });

  const result = await postToChannel(report.channel, message);
  const outcome = result.sent ? `Sent ${quarter} to ${report.channel}.${note}` : result.error;
  await recordRun(report.id, quarter, result.sent ? "sent" : "failed", outcome);
  if (result.sent) {
    // A resend of an older quarter mustn't make the scheduler send a newer one again.
    await execute(
      "UPDATE slack_reports SET last_sent_quarter = ? WHERE id = ? AND (last_sent_quarter IS NULL OR last_sent_quarter < ?)",
      [quarter, report.id, quarter],
    );
    if (report.mode === "once") await execute("UPDATE slack_reports SET sent_at = ?, enabled = 0 WHERE id = ?", [nowMysql(), report.id]);
  }
  return { ok: result.sent, message: outcome };
}

async function runOnce(report: SlackReportRow, now: number) {
  const status = onceStatus(
    {
      enabled: Boolean(report.enabled),
      scheduledAt: report.scheduled_at ? utcMs(report.scheduled_at) : null,
      sentAt: report.sent_at ? utcMs(report.sent_at) : null,
    },
    now,
  );
  if (!status || !report.quarter) return;
  if (status === "missed") {
    await execute("UPDATE slack_reports SET enabled = 0 WHERE id = ?", [report.id]);
    await recordRun(report.id, report.quarter, "failed", "Not sent: the app wasn't running at the scheduled time. Send it now or pick a new time.");
    return;
  }
  const claim = await execute("UPDATE slack_reports SET sent_at = ? WHERE id = ? AND enabled = 1 AND sent_at IS NULL", [nowMysql(), report.id]);
  if (claim.affectedRows !== 1) return;
  const result = await sendReport(report, report.quarter);
  // Failed sends aren't retried on their own: it goes back to a draft with the error shown.
  if (!result.ok) await execute("UPDATE slack_reports SET sent_at = NULL, enabled = 0 WHERE id = ?", [report.id]);
  console.log(`slack report "${report.name}" ${report.quarter}: ${result.message}`);
}

async function runQuarterly(report: SlackReportRow, now: number) {
  const quarter = dueQuarter(
    {
      enabled: Boolean(report.enabled),
      send_day: report.send_day,
      send_hour: report.send_hour,
      last_sent_quarter: report.last_sent_quarter,
      createdAt: utcMs(report.created_at),
    },
    now,
  );
  if (!quarter) return;
  const claim = await execute(
    "UPDATE slack_reports SET last_sent_quarter = ? WHERE id = ? AND enabled = 1 AND (last_sent_quarter IS NULL OR last_sent_quarter < ?)",
    [quarter, report.id, quarter],
  );
  if (claim.affectedRows !== 1) return;
  const result = await sendReport(report, quarter);
  console.log(`slack report "${report.name}" ${quarter}: ${result.message}`);
}

let skippedLocally = false;

/** Every few minutes: sends scheduled one-off reports and quarterly ones that are due. */
export async function runDueReports(now = Date.now()) {
  if (isLocalDev()) {
    if (!skippedLocally) console.log("slack reports: scheduled sends are off in local development (use Send now)");
    skippedLocally = true;
    return;
  }
  for (const report of await loadReports()) {
    try {
      if (report.mode === "once") await runOnce(report, now);
      else await runQuarterly(report, now);
    } catch (e) {
      console.error(`slack report "${report.name}" failed`, e);
      await recordRun(report.id, report.quarter ?? "", "failed", "Something went wrong while building the report.").catch(() => {});
    }
  }
}
