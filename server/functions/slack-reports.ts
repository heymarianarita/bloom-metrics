import { randomUUID } from "node:crypto";
import { z } from "zod";
import { canEdit } from "../auth.ts";
import { execute, toIso, toMysqlDatetime } from "../db.ts";
import { slackEnabled } from "../slack.ts";
import {
  contentOf,
  loadReport,
  loadReports,
  metricIdsOf,
  reportSummary,
  reportValues,
  sendReport,
  utcMs,
  type SlackReportRow,
} from "../slackReports/job.ts";
import { MAX_SEND_DAY, nextSend, reportQuarters } from "../slackReports/schedule.ts";
import type { FnHandler } from "./types.ts";

/**
 * Settings → Slack reports. Editors only.
 *   GET                                   → reports, Slack status, quarters a report can be about
 *   POST {action: "values", content, quarter}  → the metrics' values, for the live preview
 *   POST {action: "summary", content, quarter} → an AI summary to review and edit
 *   POST {action: "revise", content, quarter, summary, instruction} → that summary changed as asked
 *   POST {action: "save", report}         → creates or updates a report (draft, scheduled or quarterly)
 *   POST {action: "send", id, quarter?}   → posts the saved report now
 *   POST {action: "delete", id}
 */

const json = (body: unknown, status = 200) => ({ status, body });

/** A channel ID (C0123ABCD, G…) or a channel name, with or without "#". */
const CHANNEL = /^([CG][A-Z0-9]{8,}|#?[a-z0-9][a-z0-9._-]{0,79})$/;
const QUARTER = /^\d{4}-Q[1-4]$/;
/** Two of Slack's 3000-character sections. */
const SUMMARY_MAX = 6000;
const quarter = z.string().regex(QUARTER, "Choose a quarter, like 2026-Q3.");

const content = z.object({
  name: z.string().trim().max(120),
  metric_ids: z.array(z.string().min(1)).max(40, "Choose up to 40 metrics."),
  include_impact: z.boolean(),
});

const reportInput = content
  .extend({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Give the report a title.").max(120),
    channel: z
      .string()
      .trim()
      .regex(CHANNEL, "Use the channel ID (it starts with C) or its name, like #design-system."),
    include_summary: z.boolean(),
    intro: z.string().max(3000).default(""),
    mode: z.enum(["once", "quarterly"]),
    quarter: quarter.nullable(),
    scheduled_at: z.string().datetime({ offset: true }).nullable(),
    summary: z.string().max(SUMMARY_MAX, `Keep the summary to ${SUMMARY_MAX} characters.`).nullable(),
    summary_quarter: quarter.nullable(),
    summary_by_ai: z.boolean(),
    enabled: z.boolean(),
    send_day: z.number().int().min(1).max(MAX_SEND_DAY),
    send_hour: z.number().int().min(0).max(23),
  })
  .superRefine((r, ctx) => {
    if (r.mode === "once" && !r.quarter) ctx.addIssue({ code: "custom", message: "Choose the quarter the report is about." });
    if (r.mode === "once" && r.enabled && !r.scheduled_at) ctx.addIssue({ code: "custom", message: "Pick a date and time to send it." });
  });

const toClient = (r: SlackReportRow, now: number) => {
  const next =
    r.mode === "once"
      ? r.enabled && r.scheduled_at && !r.sent_at
        ? { quarter: r.quarter, at: new Date(utcMs(r.scheduled_at)).toISOString() }
        : null
      : (() => {
          const n = nextSend(
            {
              enabled: Boolean(r.enabled),
              send_day: r.send_day,
              send_hour: r.send_hour,
              last_sent_quarter: r.last_sent_quarter,
              createdAt: utcMs(r.created_at),
            },
            now,
          );
          return n ? { quarter: n.quarter, at: new Date(n.at).toISOString() } : null;
        })();
  return {
    id: r.id,
    name: r.name,
    channel: r.channel,
    metric_ids: metricIdsOf(r),
    include_summary: Boolean(r.include_summary),
    include_impact: Boolean(r.include_impact),
    intro: r.intro ?? "",
    mode: r.mode === "once" ? ("once" as const) : ("quarterly" as const),
    quarter: r.quarter,
    scheduled_at: r.scheduled_at ? toIso(r.scheduled_at) : null,
    sent_at: r.sent_at ? toIso(r.sent_at) : null,
    summary: r.summary,
    summary_quarter: r.summary_quarter,
    summary_by_ai: Boolean(r.summary_by_ai),
    enabled: Boolean(r.enabled),
    send_day: r.send_day,
    send_hour: r.send_hour,
    last_sent_quarter: r.last_sent_quarter,
    last_run: r.last_run_at
      ? { at: toIso(r.last_run_at), quarter: r.last_run_quarter, status: r.last_run_status, message: r.last_run_message ?? "" }
      : null,
    next_send: next,
  };
};

const firstIssue = (error: z.ZodError, fallback: string) => error.issues[0]?.message ?? fallback;

const handler: FnHandler = async (req) => {
  if (!(await canEdit(req.user?.id))) return json({ ok: false, error: "Only editors can manage Slack reports." }, 403);
  const now = Date.now();

  if (req.method === "GET") {
    return json({
      ok: true,
      slackConnected: await slackEnabled(),
      quarters: reportQuarters(4, now),
      reports: (await loadReports()).map((r) => toClient(r, now)),
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "Use GET or POST." }, 405);

  const action = String(req.body?.action ?? "");

  if (action === "values" || action === "summary" || action === "revise") {
    const parsed = z
      .object({
        content,
        quarter,
        summary: z.string().max(SUMMARY_MAX).optional(),
        instruction: z.string().trim().max(1000, "Keep the request to 1000 characters.").optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return json({ ok: false, error: firstIssue(parsed.error, "Check the report.") }, 400);
    const { summary, instruction } = parsed.data;
    if (action === "revise" && (!summary?.trim() || !instruction)) {
      return json({ ok: false, error: "Write a summary first, then say what to change." }, 400);
    }
    const values = await reportValues(parsed.data.content, parsed.data.quarter);
    if (action === "values") return json({ ok: true, ...values });
    const written = await reportSummary(
      parsed.data.content,
      values,
      action === "revise" ? { current: summary!, instruction: instruction! } : undefined,
    );
    return json({ ok: true, summary: written.summary, note: written.summary === null ? written.note : null });
  }

  if (action === "save") {
    const parsed = reportInput.safeParse(req.body?.report);
    if (!parsed.success) return json({ ok: false, error: firstIssue(parsed.error, "Check the report's fields.") }, 400);
    const r = parsed.data;
    const scheduledAt = r.mode === "once" && r.scheduled_at ? Date.parse(r.scheduled_at) : null;
    // A minute's grace for the time it takes to press Schedule.
    if (r.mode === "once" && r.enabled && scheduledAt !== null && scheduledAt < now - 60_000) {
      return json({ ok: false, error: "Pick a time in the future." }, 400);
    }
    const fields = {
      name: r.name,
      channel: r.channel,
      metric_ids: JSON.stringify(r.metric_ids),
      include_summary: r.include_summary ? 1 : 0,
      include_impact: r.include_impact ? 1 : 0,
      intro: r.intro.trim(),
      mode: r.mode,
      quarter: r.mode === "once" ? r.quarter : null,
      scheduled_at: scheduledAt === null ? null : toMysqlDatetime(new Date(scheduledAt)),
      summary: r.summary,
      summary_quarter: r.summary === null ? null : r.summary_quarter,
      summary_by_ai: r.summary_by_ai ? 1 : 0,
      enabled: r.enabled ? 1 : 0,
      send_day: r.send_day,
      send_hour: r.send_hour,
    };
    const columns = Object.keys(fields);
    const values = Object.values(fields);
    const cast = (c: string) => (c === "metric_ids" ? "CAST(? AS JSON)" : "?");
    let id = r.id;
    if (id) {
      const result = await execute(
        `UPDATE slack_reports SET ${columns.map((c) => `\`${c}\` = ${cast(c)}`).join(", ")},
                ${r.mode === "once" && r.enabled ? "sent_at = NULL," : ""} updated_at = CURRENT_TIMESTAMP(6)
          WHERE id = ?`,
        [...values, id],
      );
      if (result.affectedRows === 0) return json({ ok: false, error: "That report no longer exists." }, 404);
    } else {
      id = randomUUID();
      await execute(
        `INSERT INTO slack_reports (id, ${columns.map((c) => `\`${c}\``).join(", ")}, created_by)
         VALUES (?, ${columns.map(cast).join(", ")}, ?)`,
        [id, ...values, req.user!.id],
      );
    }
    return json({ ok: true, report: toClient((await loadReport(id))!, now) });
  }

  const report = await loadReport(String(req.body?.id ?? ""));
  if (!report) return json({ ok: false, error: "That report no longer exists." }, 404);

  if (action === "delete") {
    await execute("DELETE FROM slack_reports WHERE id = ?", [report.id]);
    return json({ ok: true });
  }

  if (action === "send") {
    if (!(await slackEnabled())) return json({ ok: false, error: "Slack isn't connected. An admin can add the bot token on the Slack reports page." }, 400);
    const target = report.mode === "once" ? report.quarter : String(req.body?.quarter ?? "");
    if (!target || !QUARTER.test(target)) return json({ ok: false, error: "Choose a quarter, like 2026-Q3." }, 400);
    const result = await sendReport(report, target);
    return json({ ok: result.ok, message: result.message, ...(result.ok ? {} : { error: result.message }) }, result.ok ? 200 : 502);
  }

  return json({ ok: false, error: `Unknown action "${action}".` }, 400);
};

export default handler;
