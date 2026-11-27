import { randomUUID } from "node:crypto";
import { canEdit } from "../auth.ts";
import { getCredential } from "../credentials.ts";
import { execute, nowMysql, query, toIso, transaction } from "../db.ts";
import {
  framesToTable,
  mergeRows,
  SYNCED_COLUMN,
  type Frame,
  type GrafanaColumn,
  type GrafanaQuery,
  type GrafanaRow,
} from "../shared/grafana.ts";
import { localDevFlag } from "../devmode.ts";
import { authenticateCronRequest } from "./cron-auth.ts";
import type { FnHandler, FnResponse } from "./types.ts";

/**
 * Grafana: each saved query is run against Grafana every Monday and its result saved as an
 * ordinary dataset ("grafana-<id>", entry_method "grafana"), which metrics and Views read like
 * any other. Rows stay here after Grafana drops them (log data is kept 90 days), so a dataset's
 * history grows with every sync; see mergeRows for how a fetch replaces stored days.
 *
 * GET                                     -> each query's dataset: rows, columns, days covered
 * POST {query?} (editor, or Bearer <CRON_SECRET>) -> sync every query, or just that one, now
 *
 * Settings → Dynamic sources → "Grafana":
 *   GRAFANA_TOKEN (credential) — service account token (Viewer role)
 *   GRAFANA_URL (credential)   — Grafana's address, e.g. https://grafana.example.com. A credential, not
 *                                config, so only admins choose where the token is sent.
 *   config.queries             — [{id, name, query, dateColumn, days}]; query is a /api/ds/query query,
 *                                dateColumn the column whose days a fetch replaces (null: snapshots)
 */

const SOURCE_KEY = "grafana";
const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_DAYS = 90;
const MAX_DAYS = 366;

const json = (body: unknown, status = 200): FnResponse => ({ status, body });

export interface SavedQuery {
  id: string;
  name: string;
  query: GrafanaQuery;
  /** Column whose days a fetch replaces; unset: the first date column; null: none (snapshots). */
  dateColumn?: string | null;
  days?: number;
}

export const grafanaDatasetSlug = (id: string) => `grafana-${id}`;

/** GRAFANA_URL as an origin, or null when it isn't an http(s) address. */
async function grafanaUrl(): Promise<string | null> {
  const raw = (await getCredential("GRAFANA_URL"))?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? `${url.origin}${url.pathname.replace(/\/$/, "")}` : null;
  } catch {
    return null;
  }
}

async function readConfig(): Promise<{ queries: SavedQuery[] }> {
  const rows = await query<{ config: Record<string, unknown> | string | null }>(
    "SELECT config FROM data_source_configs WHERE source_key = ?",
    [SOURCE_KEY],
  ).catch(() => []);
  const raw = rows[0]?.config;
  const saved = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  const queries = (Array.isArray(saved.queries) ? saved.queries : []) as Partial<SavedQuery>[];
  return {
    queries: queries
      .filter((q): q is SavedQuery => Boolean(q?.id && q.query?.datasource?.uid))
      .map((q) => ({ ...q, name: String(q.name ?? "").trim() || "Grafana query" })),
  };
}

/** At least a week: syncs run weekly, so a shorter window would leave gaps. */
export const MIN_DAYS = 7;

const daysOf = (q: SavedQuery) => Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(Number(q.days) || DEFAULT_DAYS)));

/** Local development only: made-up answers instead of Grafana (server/dev is not in production). */
const fakeData = () => localDevFlag("GRAFANA_FAKE_DATA");
export const FAKE_URL = "fake Grafana (GRAFANA_FAKE_DATA)";

/** Runs one query over the last `days` days and returns its response frames. */
async function runQuery(url: string, token: string, q: SavedQuery, now: number): Promise<Frame[]> {
  if (url === FAKE_URL) {
    const { fakeGrafanaFrames } = await import("../dev/fake-grafana.ts");
    return fakeGrafanaFrames(q.query, now - daysOf(q) * DAY_MS, now);
  }
  let res: Response;
  try {
    res = await fetch(`${url}/api/ds/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "bloom-metrics" },
      body: JSON.stringify({
        from: String(now - daysOf(q) * DAY_MS),
        to: String(now),
        queries: [{ ...q.query, refId: "A" }],
      }),
    });
  } catch (e) {
    throw new Error(`Grafana unreachable at ${url} (${e instanceof Error ? e.message : e})`);
  }
  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 401 ? " — the Grafana token is invalid or expired"
      : res.status === 403 ? " — the token's service account needs the Viewer role and access to this data source"
      : "";
    throw new Error(`Grafana ${res.status}: ${text.slice(0, 200)}${hint}`);
  }
  const result = (JSON.parse(text) as { results?: Record<string, { error?: string; frames?: Frame[] }> }).results?.A;
  if (result?.error) throw new Error(`Grafana: ${result.error}`);
  return result?.frames ?? [];
}

type Run = (sql: string, params?: unknown[]) => Promise<unknown[]>;

const parse = <T,>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;

/** Saves a fetched table into the query's dataset, keeping the days the fetch doesn't cover. */
async function store(q: SavedQuery, url: string, columns: GrafanaColumn[], fetched: GrafanaRow[], now: number) {
  return transaction(async (conn) => {
    const run: Run = async (sql, params = []) => (await conn.query(sql, params))[0] as unknown[];
    const slug = grafanaDatasetSlug(q.id);
    const found = (await run("SELECT id FROM manual_datasets WHERE slug = ?", [slug])) as { id: string }[];
    const id = found[0]?.id ?? randomUUID();
    const notes =
      url === FAKE_URL
        ? "Made-up rows from the local fake Grafana (GRAFANA_FAKE_DATA), for testing. Delete this dataset before syncing real data into it: older fake days would be kept."
        : `Synced from Grafana (${url}) every Monday, the last ${daysOf(q)} days each time. Older rows are kept. The query is set in Settings → Dynamic sources → Grafana.`;
    if (found.length) {
      await run("UPDATE manual_datasets SET name = ?, entry_method = 'grafana', entry_notes = ? WHERE id = ?", [q.name, notes, id]);
    } else {
      await run(
        `INSERT INTO manual_datasets (id, slug, name, description, entry_method, entry_notes, sort_order)
         VALUES (?, ?, ?, ?, 'grafana', ?, 999)`,
        [id, slug, q.name, "Results of a Grafana query, saved every week.", notes],
      );
    }

    const storedColumns = (await run("SELECT `key`, label, kind FROM manual_dataset_columns WHERE dataset_id = ?", [id])) as GrafanaColumn[];
    const dateColumns = [...storedColumns, ...columns].filter((c) => c.kind === "date" && c.key !== SYNCED_COLUMN.key);
    const dateColumn =
      q.dateColumn === null ? null
      : dateColumns.find((c) => c.key === q.dateColumn)?.key ?? dateColumns[0]?.key ?? null;
    const all = dateColumn ? columns : [...columns, SYNCED_COLUMN];
    const known = new Set(storedColumns.map((c) => c.key));
    for (const [i, c] of all.entries()) {
      // A column keeps the kind it was created with: rows already saved depend on it.
      await run(
        `INSERT INTO manual_dataset_columns (id, dataset_id, \`key\`, label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label)`,
        [randomUUID(), id, c.key, c.label, c.kind, known.has(c.key) ? storedColumns.findIndex((s) => s.key === c.key) : storedColumns.length + i],
      );
    }

    const stored = ((await run("SELECT data FROM manual_dataset_rows WHERE dataset_id = ? ORDER BY sort_order", [id])) as { data: unknown }[]).map(
      (r) => parse<GrafanaRow>(r.data),
    );
    const today = new Date(now).toISOString().slice(0, 10);
    const firstDay = new Date(now - daysOf(q) * DAY_MS).toISOString().slice(0, 10);
    const merged = mergeRows(stored, fetched, { dateColumn, firstDay, today });

    await run("DELETE FROM manual_dataset_rows WHERE dataset_id = ?", [id]);
    const values = merged.rows.map((data, i) => [randomUUID(), id, JSON.stringify(data), i]);
    for (let i = 0; i < values.length; i += 500) {
      await run("INSERT INTO manual_dataset_rows (id, dataset_id, data, sort_order) VALUES ?", [values.slice(i, i + 500)]);
    }
    await run("UPDATE manual_datasets SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [id]);
    return { added: merged.added, skipped: merged.skipped, rows: merged.rows.length, dateColumn };
  });
}

/** Datasets of removed queries keep their rows and become ordinary, editable datasets. */
const releaseRemoved = (queries: SavedQuery[]) =>
  execute(
    `UPDATE manual_datasets SET entry_method = '', entry_notes = 'Was synced from Grafana until its query was removed. Its rows are kept.'
      WHERE entry_method = 'grafana'${queries.length ? ` AND slug NOT IN (${queries.map(() => "?").join(", ")})` : ""}`,
    queries.map((q) => grafanaDatasetSlug(q.id)),
  );

const logRun = (status: string, message: string, rowCount: number, triggeredBy: string) =>
  execute(
    "INSERT INTO sync_runs (id, source_key, status, message, row_count, triggered_by, ran_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [randomUUID(), SOURCE_KEY, status, message, rowCount, triggeredBy, nowMysql()],
  ).catch((e) => console.error("could not log grafana sync", e));

/** Runs every saved query (or one) and saves the results. Used by the scheduler and "Sync now". */
export async function syncGrafana(triggeredBy = "automatic", only?: string): Promise<FnResponse> {
  const { queries } = await readConfig();
  if (!only) await releaseRemoved(queries);
  const todo = only ? queries.filter((q) => q.id === only) : queries;
  if (!todo.length) return json({ ok: true, added: 0, results: [] });

  const [token, url] = fakeData() ? ["fake", FAKE_URL] : await Promise.all([getCredential("GRAFANA_TOKEN"), grafanaUrl()]);
  if (!token || !url) {
    const error = !token ? "No Grafana token saved." : "No valid Grafana address saved.";
    await logRun("error", error, 0, triggeredBy);
    return json({ ok: false, configured: false, error: `${error} An admin can add it in Settings → Dynamic sources → Grafana.` }, 503);
  }

  const now = Date.now();
  const results: Record<string, unknown>[] = [];
  for (const q of todo) {
    try {
      const { columns, rows } = framesToTable(await runQuery(url, token, q, now));
      results.push({ ok: true, id: q.id, name: q.name, fetched: rows.length, ...(await store(q, url, columns, rows, now)) });
    } catch (e) {
      results.push({ ok: false, id: q.id, name: q.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const added = results.reduce((n, r) => n + Number(r.added ?? 0), 0);
  const errors = results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.error}`);
  const ok = errors.length === 0;
  const message = ok
    ? `${added} row${added === 1 ? "" : "s"} saved from ${results.length} quer${results.length === 1 ? "y" : "ies"}`
    : errors.join("; ");
  await logRun(ok ? "success" : "error", message, added, triggeredBy);
  return json({ ok, added, results, ...(ok ? {} : { error: message }) }, ok ? 200 : 502);
}

/** What each query's dataset holds, for the settings card. */
async function readStatus() {
  const { queries } = await readConfig();
  const out = [];
  for (const q of queries) {
    const [dataset] = await query<{ id: string }>("SELECT id FROM manual_datasets WHERE slug = ?", [grafanaDatasetSlug(q.id)]);
    if (!dataset) {
      out.push({ id: q.id, datasetId: null, rows: 0, columns: [], firstDay: null, lastDay: null });
      continue;
    }
    const columns = await query<GrafanaColumn>(
      "SELECT `key`, label, kind FROM manual_dataset_columns WHERE dataset_id = ? ORDER BY sort_order",
      [dataset.id],
    );
    const dates = columns.filter((c) => c.kind === "date" && c.key !== SYNCED_COLUMN.key);
    const dateColumn =
      q.dateColumn === null ? null : dates.find((c) => c.key === q.dateColumn)?.key ?? dates[0]?.key ?? null;
    const path = `$."${dateColumn ?? SYNCED_COLUMN.key}"`;
    const [stats] = await query<{ n: number; first: string | null; last: string | null }>(
      `SELECT COUNT(*) AS n, MIN(LEFT(JSON_UNQUOTE(JSON_EXTRACT(data, ?)), 10)) AS first, MAX(LEFT(JSON_UNQUOTE(JSON_EXTRACT(data, ?)), 10)) AS last
         FROM manual_dataset_rows WHERE dataset_id = ?`,
      [path, path, dataset.id],
    );
    out.push({
      id: q.id,
      datasetId: dataset.id,
      rows: Number(stats?.n ?? 0),
      columns,
      dateColumn,
      firstDay: stats?.first ?? null,
      lastDay: stats?.last ?? null,
    });
  }
  return out;
}

const handler: FnHandler = async (req) => {
  if (req.method === "GET") {
    try {
      const [queries, lastRun] = await Promise.all([
        readStatus(),
        query<{ status: string; message: string; ran_at: string }>(
          "SELECT status, message, ran_at FROM sync_runs WHERE source_key = ? ORDER BY ran_at DESC LIMIT 1",
          [SOURCE_KEY],
        ),
      ]);
      return json({
        queries,
        lastRun: lastRun[0] ? { ...lastRun[0], ran_at: toIso(lastRun[0].ran_at) } : null,
        fake: fakeData(),
      });
    } catch (e) {
      return json({ error: "Could not read the Grafana datasets", details: e instanceof Error ? e.message : String(e) }, 502);
    }
  }
  const only = typeof req.body?.query === "string" ? req.body.query : undefined;
  if (req.user) {
    if (!(await canEdit(req.user.id))) return json({ error: "Only editors can sync" }, 403);
    return syncGrafana(req.user.email ?? "manual", only);
  }
  const unauthorized = authenticateCronRequest(req);
  if (unauthorized) return unauthorized;
  return syncGrafana("automatic", only);
};

export default handler;
