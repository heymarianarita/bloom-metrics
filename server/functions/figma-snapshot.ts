import { randomUUID } from "node:crypto";
import { execute, nowMysql, query, toIso } from "../db.ts";
import { authenticateCronRequest } from "./cron-auth.ts";
import figmaAnalytics from "./figma-analytics.ts";
import type { FnHandler, FnResponse } from "./types.ts";

/**
 * Figma adoption history.
 *
 * The Library Analytics API is range-based — it never accumulates. This function
 * captures the CURRENT quarter's numbers into `figma_adoption_snapshots`, keyed by
 * (file_key, quarter), so history builds up on its own.
 *
 * POST with `Authorization: Bearer <CRON_SECRET>`  -> capture (the server scheduler calls
 *                                                     captureFigmaSnapshots() directly)
 * GET                                              -> read the stored history
 *
 * Each run re-captures the current quarter, so its row is never more than two weeks
 * stale. Runs in the first three weeks of a quarter ALSO re-capture the previous
 * quarter over its full date range, which is what finalises it — otherwise a quarter
 * would freeze on the 15th of its last month and lose its final fortnight.
 *
 * Required env vars:
 *   FIGMA_FILE_KEYS — JSON array or comma-separated list of library file keys to track,
 *                     e.g. ["abc123..."] or [{"key":"abc123...","label":"Web"}].
 *                     Bloom today: AxgxbkHNzhVbyMBdB1wMuM, aqKiVM9OcIQEDDaOliQLar,
 *                     16F5fJBPOVvV3cKsoFgCXb
 *   CRON_SECRET     — required for the HTTP POST capture path
 *   FIGMA_ACCESS_TOKEN (credential, via figma-analytics)
 */

function json(body: unknown, status = 200): FnResponse {
  return { status, body };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

interface Period { quarter: string; periodStart: string; periodEnd: string; final: boolean }

/** The quarter containing `now`, with its end clamped to today. */
function quarterOf(now: Date): Period {
  const y = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const start = new Date(Date.UTC(y, (q - 1) * 3, 1));
  const end = new Date(Date.UTC(y, q * 3, 0));
  const final = now >= end;
  return {
    quarter: `${y}-Q${q}`,
    periodStart: iso(start),
    periodEnd: iso(final ? end : now),
    final,
  };
}

/**
 * What to capture on this run: always the current quarter, plus the previous one
 * while we're still early in a new quarter, so the closed quarter gets a final,
 * complete capture rather than freezing mid-month.
 */
function periodsToCapture(now = new Date()): Period[] {
  const current = quarterOf(now);
  const periods = [current];
  const daysIntoQuarter =
    (now.getTime() - Date.parse(current.periodStart + "T00:00:00Z")) / 86400000;
  if (daysIntoQuarter <= 21) {
    const beforeStart = new Date(Date.parse(current.periodStart + "T00:00:00Z") - 86400000);
    const prev = quarterOf(beforeStart);
    periods.push({ ...prev, final: true });
  }
  return periods;
}

/** The `count` quarters before the current one, oldest first, each over its full range. */
function closedQuarters(count: number, now = new Date()): Period[] {
  const out: Period[] = [];
  let cursor = Date.parse(quarterOf(now).periodStart + "T00:00:00Z");
  for (let i = 0; i < count; i++) {
    const prev = quarterOf(new Date(cursor - 86400000));
    out.unshift({ ...prev, final: true });
    cursor = Date.parse(prev.periodStart + "T00:00:00Z");
  }
  return out;
}

function readFileKeys(): { key: string; label?: string }[] {
  const raw = process.env.FIGMA_FILE_KEYS?.trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      return JSON.parse(raw).map((e: unknown) =>
        typeof e === "string" ? { key: e } : (e as { key: string; label?: string })
      );
    } catch {
      return [];
    }
  }
  return raw.split(",").map((k) => ({ key: k.trim() })).filter((e) => e.key);
}

type CaptureResult = Record<string, unknown> & { ok: boolean };

/** Captures one library for one period into figma_adoption_snapshots. */
async function captureOne(
  key: string,
  { quarter, periodStart, periodEnd, final }: Period,
  opts: { skipEmpty?: boolean } = {},
): Promise<CaptureResult> {
  // Reuse figma-analytics so the Figma parsing lives in exactly one place.
  let status = 500;
  let payload: any = null;
  try {
    const res = await figmaAnalytics({
      method: "POST",
      query: new URLSearchParams(),
      body: { fileKey: key, startDate: periodStart, endDate: periodEnd },
      headers: {},
      user: null,
    });
    status = res.status ?? 200;
    payload = res.body ?? null;
  } catch (e) {
    console.error(`figma-analytics threw for ${key}:`, e);
  }
  const ok = status >= 200 && status < 300;
  if (!ok || !payload) {
    console.error(`figma-analytics failed for ${key} [${status}]`);
    return { fileKey: key, quarter, ok: false, status, error: payload?.error };
  }
  if (payload.analyticsAvailable === false) {
    return { fileKey: key, quarter, ok: false, error: payload.analyticsNote };
  }

  const components = (payload.components ?? []) as any[];
  const s = payload.summary ?? {};
  // Figma keeps analytics for a limited time: an old quarter with no activity at all
  // is "no data", not a real zero, so don't store it.
  if (opts.skipEmpty && !s.totalInserts && !s.totalUsages && !s.totalDetaches) {
    return { fileKey: key, quarter, ok: false, skipped: "no analytics for this period" };
  }
  const componentsUsed = components.filter((c) => (c.inserts ?? 0) > 0).length;

  const row = {
    file_key: key,
    file_name: payload.file?.name ?? null,
    quarter,
    period_start: periodStart,
    period_end: periodEnd,
    inserts: s.totalInserts ?? null,
    detaches: s.totalDetaches ?? null,
    usages: s.totalUsages ?? null,
    component_count: s.componentCount ?? components.length,
    components_used: componentsUsed,
    documented_count: s.documentedCount ?? null,
    documentation_coverage: s.documentationCoverage ?? null,
    detach_rate: s.detachRate ?? null,
    components: components.map((c) => ({
      key: c.key,
      name: c.name,
      page: c.page,
      inserts: c.inserts,
      detaches: c.detaches,
      usages: c.usages,
      documented: c.documented,
    })),
    captured_at: nowMysql(),
  };

  try {
    await execute(
      `INSERT INTO figma_adoption_snapshots
         (id, file_key, file_name, quarter, period_start, period_end, inserts, detaches, usages,
          component_count, components_used, documented_count, documentation_coverage, detach_rate,
          components, captured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
       ON DUPLICATE KEY UPDATE
         file_name = VALUES(file_name), period_start = VALUES(period_start), period_end = VALUES(period_end),
         inserts = VALUES(inserts), detaches = VALUES(detaches), usages = VALUES(usages),
         component_count = VALUES(component_count), components_used = VALUES(components_used),
         documented_count = VALUES(documented_count), documentation_coverage = VALUES(documentation_coverage),
         detach_rate = VALUES(detach_rate), components = VALUES(components), captured_at = VALUES(captured_at)`,
      [
        randomUUID(), row.file_key, row.file_name, row.quarter, row.period_start, row.period_end,
        row.inserts, row.detaches, row.usages, row.component_count, row.components_used,
        row.documented_count, row.documentation_coverage, row.detach_rate,
        JSON.stringify(row.components), row.captured_at,
      ],
    );
    return { fileKey: key, quarter, final, ok: true, inserts: row.inserts, detaches: row.detaches };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`Snapshot upsert failed for ${key}: ${message}`);
    return { fileKey: key, quarter, ok: false, error: message };
  }
}

/** Write path without the HTTP auth check; used by the POST handler and the scheduler. */
export async function captureFigmaSnapshots(): Promise<FnResponse> {
  const fileKeys = readFileKeys();
  if (fileKeys.length === 0) {
    return json(
      {
        error: "No libraries configured",
        details: "Set FIGMA_FILE_KEYS to the Figma library file key(s) to snapshot.",
      },
      503,
    );
  }

  const periods = periodsToCapture();
  const results: CaptureResult[] = [];
  for (const period of periods) {
    for (const { key } of fileKeys) results.push(await captureOne(key, period));
  }

  const anyOk = results.some((r) => r.ok);
  return json({ ok: anyOk, periods, results }, anyOk ? 200 : 502);
}

/**
 * Fills in closed quarters that were never captured (e.g. before the snapshot job
 * existed), straight from Figma. Closed quarters don't change, so each is fetched
 * once; quarters Figma no longer has data for are skipped, not stored as zero.
 */
export async function backfillFigmaSnapshots(quarters = 6): Promise<{ captured: number; skipped: number; failed: number }> {
  const fileKeys = readFileKeys();
  const tally = { captured: 0, skipped: 0, failed: 0 };
  if (fileKeys.length === 0) return tally;
  const stored = await query<{ file_key: string; quarter: string }>(
    "SELECT file_key, quarter FROM figma_adoption_snapshots",
  );
  const have = new Set(stored.map((r) => `${r.file_key}|${r.quarter}`));
  for (const period of closedQuarters(quarters)) {
    for (const { key } of fileKeys) {
      if (have.has(`${key}|${period.quarter}`)) continue;
      const r = await captureOne(key, period, { skipEmpty: true });
      if (r.ok) tally.captured++;
      else if (r.skipped) tally.skipped++;
      else tally.failed++;
    }
  }
  return tally;
}

const handler: FnHandler = async (req) => {
  // ---- Read path: history for the Adoption page -----------------------------
  if (req.method === "GET") {
    const fileKey = req.query.get("fileKey")?.trim();
    try {
      const rows = await query<Record<string, unknown>>(
        "SELECT file_key,file_name,quarter,period_start,period_end,inserts,detaches,usages," +
          "component_count,components_used,documented_count,documentation_coverage,detach_rate,captured_at " +
          `FROM figma_adoption_snapshots${fileKey ? " WHERE file_key = ?" : ""} ORDER BY quarter ASC`,
        fileKey ? [fileKey] : [],
      );
      return json({ snapshots: rows.map((r) => ({ ...r, captured_at: toIso(r.captured_at) })) });
    } catch (e) {
      return json({ error: "Could not read snapshots", details: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  // ---- Write path: cron-only ------------------------------------------------
  const unauthorized = authenticateCronRequest(req);
  if (unauthorized) return unauthorized;

  return captureFigmaSnapshots();
};

export default handler;
