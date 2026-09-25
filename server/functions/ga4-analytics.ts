import { randomUUID } from "node:crypto";
import { execute, nowMysql, query, toIso } from "../db.ts";
import { canEdit } from "../auth.ts";
import type { FnHandler } from "./types.ts";

/**
 * GA4 analytics backend.
 *
 * Supports two modes:
 * 1) Pull: calls a publicly callable Apps Script web app.
 * 2) Push: accepts snapshots posted by Apps Script when the web app is restricted
 *    to a company workspace.
 * 3) Browser sync: playground is only reachable inside Vinted's network, so Apps Script
 *    can't push to it and the server can't get past the web app's Vinted-only sign-in.
 *    An editor's browser carries the report instead ("Sync Google Analytics" button):
 *    mode "sync-info" tells the page where the web app is; mode "browser_sync" stores
 *    the report the web app handed to the page (signed-in editors only).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SNAPSHOT_TABLE = "ga4_report_snapshots";

interface PropertyInput {
  id: string;
  label?: string;
}

interface Ga4PropertyReport {
  id: string;
  label: string;
  totals?: Record<string, number>;
  periods?: Record<string, unknown>;
  daily?: Array<Record<string, unknown>>;
  topPages?: Array<Record<string, unknown>>;
  error?: string;
}

interface Ga4Payload {
  secret?: string;
  ingest?: boolean;
  mode?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  range?: { startDate?: string; endDate?: string; label?: string };
  pageLimit?: number;
  properties?: Array<PropertyInput | Ga4PropertyReport>;
}

function jsonResponse(body: unknown, status = 200) {
  return { status, body };
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function normalizeRange(payload: Ga4Payload) {
  const requestedStart = payload.startDate ?? payload.range?.startDate;
  const requestedEnd = payload.endDate ?? payload.range?.endDate;
  const startDate = DATE_RE.test(requestedStart ?? "") ? String(requestedStart) : toISODate(daysAgo(90));
  const endDate = DATE_RE.test(requestedEnd ?? "") ? String(requestedEnd) : toISODate(new Date());
  return { startDate, endDate, label: payload.range?.label };
}

function safeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizePropertyInputs(properties: unknown): PropertyInput[] {
  if (!Array.isArray(properties)) return [];
  return properties
    .map((property) => {
      const p = property as Partial<PropertyInput>;
      return { id: String(p?.id ?? "").replace(/[^0-9]/g, ""), label: p?.label };
    })
    .filter((property) => property.id.length > 0);
}

function normalizeReportProperties(properties: unknown): Ga4PropertyReport[] {
  if (!Array.isArray(properties)) return [];
  return properties
    .map((property) => {
      const p = property as Partial<Ga4PropertyReport>;
      return {
        id: String(p?.id ?? "").replace(/[^0-9]/g, ""),
        label: String(p?.label ?? p?.id ?? ""),
        totals: p?.totals,
        periods: (p?.periods && typeof p.periods === "object" ? p.periods : undefined) as
          | Record<string, unknown>
          | undefined,
        daily: Array.isArray(p?.daily) ? p.daily : [],
        topPages: Array.isArray(p?.topPages) ? p.topPages : [],
        error: p?.error,
      };
    })
    .filter((property) => property.id.length > 0 || property.error);
}

function isIngestPayload(payload: Ga4Payload) {
  return payload.ingest === true || payload.mode === "ingest" || payload.source === "apps_script_push";
}

async function saveSnapshot(payload: {
  source: string;
  range: { startDate: string; endDate: string; label?: string };
  properties: Ga4PropertyReport[];
  rawPayload: Record<string, unknown>;
}) {
  try {
    await execute(
      `INSERT INTO ${SNAPSHOT_TABLE} (id, source, range_start, range_end, properties, raw_payload, created_at)
       VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?)`,
      [
        randomUUID(),
        payload.source,
        payload.range.startDate,
        payload.range.endDate,
        JSON.stringify(payload.properties),
        JSON.stringify(payload.rawPayload),
        nowMysql(),
      ],
    );
  } catch (e) {
    return { saved: false, error: e instanceof Error ? e.message : String(e) };
  }
  return { saved: true };
}

function withoutSecret(payload: Record<string, unknown>) {
  const { secret: _secret, ...rest } = payload;
  return rest;
}

async function readSnapshot(range: { startDate: string; endDate: string }) {
  type SnapshotRow = {
    source: string;
    range_start: string | null;
    range_end: string | null;
    properties: unknown;
    created_at: string;
  };
  const latestWhere = async (where: string, params: unknown[]) => {
    try {
      const rows = await query<SnapshotRow>(
        `SELECT source, range_start, range_end, properties, created_at FROM ${SNAPSHOT_TABLE}
         ${where} ORDER BY created_at DESC LIMIT 1`,
        params,
      );
      return rows[0] ?? null;
    } catch {
      return null;
    }
  };

  // 1) exact range, 2) any snapshot overlapping the range, 3) the most recent one.
  let data = await latestWhere("WHERE range_start = ? AND range_end = ?", [range.startDate, range.endDate]);

  if (!data) {
    data = await latestWhere("WHERE range_start <= ? AND range_end >= ?", [range.endDate, range.startDate]);
  }

  if (!data) {
    data = await latestWhere("", []);
  }

  if (!data) return null;
  const properties = normalizeReportProperties(data.properties);
  return {
    ok: true,
    configured: true,
    mode: "snapshot",
    source: data.source,
    refreshedAt: toIso(data.created_at),
    range: { startDate: data.range_start, endDate: data.range_end },
    properties,
  };
}

function readConfiguredProperties() {
  try {
    return normalizePropertyInputs(JSON.parse(process.env.GA4_PROPERTIES ?? "[]"));
  } catch {
    return [];
  }
}

const handler: FnHandler = async (req) => {
  let payload: Ga4Payload = {};
  if (req.method === "POST") {
    if (req.body === null || typeof req.body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    payload = req.body;
  }

  const secret = process.env.GA4_APPS_SCRIPT_SECRET;
  const range = normalizeRange(payload);

  const mode = (payload as { mode?: string }).mode;
  if (mode === "sync-info") {
    const latest = await query<{ created_at: string | null }>(`SELECT MAX(created_at) AS created_at FROM ${SNAPSHOT_TABLE}`);
    return jsonResponse({ syncUrl: process.env.GA4_APPS_SCRIPT_URL?.trim() || null, refreshedAt: toIso(latest[0]?.created_at ?? null) });
  }
  if (mode === "browser_sync") {
    if (!(await canEdit(req.user?.id))) return jsonResponse({ error: "Only editors can sync Google Analytics" }, 403);
    const report = (req.body as { report?: Ga4Payload })?.report ?? {};
    const properties = normalizeReportProperties(report.properties);
    if (!properties.length) return jsonResponse({ error: "The report has no GA4 properties" }, 400);
    const saveResult = await saveSnapshot({
      source: "browser_sync",
      range: normalizeRange(report),
      properties,
      rawPayload: withoutSecret(report as Record<string, unknown>),
    });
    if (!saveResult.saved) return jsonResponse({ error: "Could not save GA4 snapshot", details: saveResult.error }, 500);
    return jsonResponse({ ok: true, saved: true, propertyCount: properties.length });
  }

  if (isIngestPayload(payload)) {
    if (!secret) return jsonResponse({ error: "GA4 ingest secret is not configured" }, 503);
    if (!safeEquals(String(payload.secret ?? ""), secret)) {
      return jsonResponse({ error: "Unauthorized GA4 ingest request" }, 401);
    }

    const properties = normalizeReportProperties(payload.properties);
    if (!properties.length) return jsonResponse({ error: "No GA4 report properties provided" }, 400);

    const saveResult = await saveSnapshot({
      source: payload.source ?? "apps_script_push",
      range,
      properties,
      rawPayload: withoutSecret(payload as Record<string, unknown>),
    });

    if (!saveResult.saved) {
      return jsonResponse({ error: "Could not save GA4 snapshot", details: saveResult.error }, 500);
    }

    return jsonResponse({ ok: true, saved: true, range, propertyCount: properties.length });
  }

  const snapshot = await readSnapshot(range);
  if (snapshot) return jsonResponse(snapshot);

  if (payload.mode !== "live") {
    return jsonResponse(
      {
        ok: false,
        status: "snapshot_needed",
        mode: "snapshot",
        error: "No Google Analytics data has been received yet",
        details: "Google Analytics numbers arrive from a scheduled export. Once the first export runs, this page fills in automatically.",
        configured: true,
        range,
        properties: [],
      },
    );
  }

  const scriptUrl = process.env.GA4_APPS_SCRIPT_URL;
  const properties = normalizePropertyInputs(payload.properties).length
    ? normalizePropertyInputs(payload.properties)
    : readConfiguredProperties();

  if (!properties.length) {
    return jsonResponse(
      {
        error: "No GA4 properties configured",
        details: "Set GA4_PROPERTIES or push a GA4 snapshot from Apps Script.",
        configured: true,
      },
      400,
    );
  }

  if (!scriptUrl || !secret) {
    return jsonResponse(
      {
        error: "GA4 data is not available yet",
        details: "Run pushGa4Reports from Apps Script to send the first GA4 snapshot.",
        configured: false,
      },
      503,
    );
  }

  let res: Response;
  try {
    res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        secret,
        startDate: range.startDate,
        endDate: range.endDate,
        pageLimit: payload.pageLimit ?? 50,
        properties,
      }),
    });
  } catch (err) {
    console.error("Apps Script request failed:", err);
    return jsonResponse({ error: "Could not reach the Apps Script web app", details: String(err) }, 502);
  }

  const text = await res.text();
  if (!res.ok) {
    console.error(`Apps Script request failed [${res.status}]: ${text}`);
    return jsonResponse({ error: "Apps Script request failed", status: res.status, details: text }, res.status);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("Apps Script returned non-JSON:", text.slice(0, 500));
    return jsonResponse(
      {
        error: "Apps Script is restricted to your company workspace",
        details: "Use push mode: run pushGa4Reports from Apps Script so the script sends GA4 snapshots to this backend.",
      },
      502,
    );
  }

  if (body.ok !== true) {
    const status = typeof body.status === "number" ? body.status : 502;
    console.error(`Apps Script error [${status}]:`, body.error);
    return jsonResponse({ error: String(body.error ?? "Apps Script error"), status }, status);
  }

  const reportProperties = normalizeReportProperties(body.properties);
  if (reportProperties.length) {
    await saveSnapshot({
      source: "apps_script_pull",
      range,
      properties: reportProperties,
      rawPayload: body,
    });
  }

  return jsonResponse({ ...body, configured: true, mode: "live" });
};

export default handler;
