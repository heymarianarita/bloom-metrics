import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { transaction } from "../db.ts";

/**
 * Figma adoption as an ordinary dataset, so metrics and Views treat it like any other data:
 * one row per component, library and quarter, rebuilt from `figma_adoption_snapshots` after
 * every capture. The dataset is synced (entry_method "figma"): nobody edits its rows by hand.
 */

export const FIGMA_DATASET_SLUG = "figma-components";
export const FIGMA_WEEKLY_SLUG = "figma-weekly";

/** Library totals per week: small enough to load whole, and dated, so a running quarter can be compared fairly. */
export const FIGMA_WEEKLY_COLUMNS = [
  { key: "week", label: "Week", kind: "date" },
  { key: "library", label: "Library", kind: "text" },
  { key: "inserts", label: "Inserts", kind: "number" },
  { key: "detaches", label: "Detaches", kind: "number" },
] as const;

/** Stable keys: metrics and views refer to them. */
export const FIGMA_COLUMNS = [
  { key: "quarter", label: "Quarter", kind: "period" },
  { key: "library", label: "Library", kind: "text" },
  { key: "component", label: "Component", kind: "text" },
  { key: "page", label: "Page", kind: "text" },
  { key: "inserts", label: "Inserts", kind: "number" },
  { key: "detaches", label: "Detaches", kind: "number" },
  { key: "usages", label: "Usages", kind: "number" },
] as const;

interface Library {
  fileKey: string;
  name?: string;
  excludedPages?: string[];
}

interface SnapshotComponent {
  name?: string;
  page?: string;
  inserts?: number;
  detaches?: number;
  usages?: number;
}

type Run = (sql: string, params?: unknown[]) => Promise<unknown[]>;

/** Creates the dataset and its columns if missing; returns its id. */
async function ensureDataset(
  run: Run,
  slug = FIGMA_DATASET_SLUG,
  name = "Figma component analytics",
  description = "One row per component, library and quarter: how often it was inserted and detached.",
  columns: readonly { key: string; label: string; kind: string }[] = FIGMA_COLUMNS,
): Promise<string> {
  const found = (await run("SELECT id FROM manual_datasets WHERE slug = ?", [slug])) as { id: string }[];
  const id = found[0]?.id ?? randomUUID();
  if (!found.length) {
    await run(
      `INSERT INTO manual_datasets (id, slug, name, description, entry_method, entry_notes, sort_order)
       VALUES (?, ?, ?, ?, 'figma', ?, 999)`,
      [
        id,
        slug,
        name,
        description,
        "Synced from Figma's library analytics after every capture (twice a month). Libraries and excluded pages are set in Settings → Dynamic sources.",
      ],
    );
  }
  for (const [i, c] of columns.entries()) {
    await run(
      `INSERT INTO manual_dataset_columns (id, dataset_id, \`key\`, label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), kind = VALUES(kind), sort_order = VALUES(sort_order)`,
      [randomUUID(), id, c.key, c.label, c.kind, i],
    );
  }
  return id;
}

/** Rebuilds the dataset's rows from the stored snapshots. Safe to run any time. */
export async function syncFigmaDatasetWith(conn: PoolConnection): Promise<{ rows: number; weeks: number }> {
  const run: Run = async (sql, params = []) => (await conn.query(sql, params))[0] as unknown[];
  const id = await ensureDataset(run);

  const [config] = (await run("SELECT config FROM data_source_configs WHERE source_key = 'figma'")) as {
    config: { libraries?: Library[] } | string;
  }[];
  const parsed = typeof config?.config === "string" ? JSON.parse(config.config) : config?.config;
  const libraries = new Map<string, Library>(((parsed?.libraries ?? []) as Library[]).map((l) => [l.fileKey, l]));

  // Sorted here, not in SQL: sorting rows that carry the large components JSON overruns MySQL's sort buffer.
  const snapshots = (
    (await run("SELECT file_key, file_name, quarter, components FROM figma_adoption_snapshots")) as {
      file_key: string;
      file_name: string | null;
      quarter: string;
      components: SnapshotComponent[] | string;
    }[]
  ).sort((a, b) => a.quarter.localeCompare(b.quarter) || a.file_key.localeCompare(b.file_key));

  const rows: unknown[][] = [];
  for (const s of snapshots) {
    const library = libraries.get(s.file_key);
    const excluded = new Set(library?.excludedPages ?? []);
    const components = (typeof s.components === "string" ? JSON.parse(s.components) : s.components) ?? [];
    for (const c of components as SnapshotComponent[]) {
      if (!c.name || (c.page && excluded.has(c.page))) continue;
      const data = {
        quarter: s.quarter,
        library: library?.name || s.file_name || s.file_key,
        component: c.name,
        page: c.page ?? "",
        inserts: c.inserts ?? 0,
        detaches: c.detaches ?? 0,
        usages: c.usages ?? 0,
      };
      rows.push([randomUUID(), id, JSON.stringify(data), rows.length]);
    }
  }

  await run("DELETE FROM manual_dataset_rows WHERE dataset_id = ?", [id]);
  for (let i = 0; i < rows.length; i += 500) {
    await run("INSERT INTO manual_dataset_rows (id, dataset_id, data, sort_order) VALUES ?", [rows.slice(i, i + 500)]);
  }
  await run("UPDATE manual_datasets SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [id]);

  // Weekly library totals, leaving out the excluded pages like the quarterly rows do.
  const weeklyId = await ensureDataset(
    run,
    FIGMA_WEEKLY_SLUG,
    "Figma activity by week",
    "Insertions and detachments per library and week.",
    FIGMA_WEEKLY_COLUMNS,
  );
  const activity = (await run("SELECT file_key, week, page, inserts, detaches FROM figma_weekly_activity")) as {
    file_key: string;
    week: string | Date;
    page: string;
    inserts: number;
    detaches: number;
  }[];
  const names = new Map(snapshots.map((s) => [s.file_key, s.file_name]));
  const totals = new Map<string, { week: string; library: string; inserts: number; detaches: number }>();
  for (const a of activity) {
    const library = libraries.get(a.file_key);
    if (library?.excludedPages?.includes(a.page)) continue;
    const week = a.week instanceof Date ? a.week.toISOString().slice(0, 10) : String(a.week).slice(0, 10);
    const name = library?.name || names.get(a.file_key) || a.file_key;
    const entry = totals.get(`${week}|${a.file_key}`) ?? { week, library: name, inserts: 0, detaches: 0 };
    entry.inserts += a.inserts;
    entry.detaches += a.detaches;
    totals.set(`${week}|${a.file_key}`, entry);
  }
  const weeklyRows = [...totals.values()]
    .sort((a, b) => a.week.localeCompare(b.week) || a.library.localeCompare(b.library))
    .map((data, i) => [randomUUID(), weeklyId, JSON.stringify(data), i]);
  await run("DELETE FROM manual_dataset_rows WHERE dataset_id = ?", [weeklyId]);
  for (let i = 0; i < weeklyRows.length; i += 500) {
    await run("INSERT INTO manual_dataset_rows (id, dataset_id, data, sort_order) VALUES ?", [weeklyRows.slice(i, i + 500)]);
  }
  await run("UPDATE manual_datasets SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [weeklyId]);
  if (weeklyRows.length) await adoptWeekly(run, id, weeklyId);
  return { rows: rows.length, weeks: weeklyRows.length };
}

const ADOPT_WEEKLY_NAME = "2026-10-30-figma-weekly";

/**
 * Once weekly data exists (not before, so the numbers never go blank): insertions, detachments
 * and detach rate read the weekly dataset, adding up a period's weeks. The per-component
 * breakdown keeps quarterly rows (weekly ones per component would be too many to load), through
 * two "by component" metrics.
 */
async function adoptWeekly(run: Run, quarterlyId: string, weeklyId: string) {
  if (((await run("SELECT 1 FROM app_migrations WHERE name = ?", [ADOPT_WEEKLY_NAME])) as unknown[]).length) return;
  const metrics = (await run(
    "SELECT * FROM manual_metrics WHERE slug IN ('figma-insertions', 'figma-detachments', 'figma-detach-rate')",
  )) as Record<string, unknown>[];
  const bySlug = new Map(metrics.map((m) => [String(m.slug), m]));
  const replacements: Record<string, string> = {};
  for (const slug of ["figma-insertions", "figma-detachments"]) {
    const m = bySlug.get(slug);
    if (!m) continue;
    const copy = `${slug}-by-component`;
    const existing = (await run("SELECT id FROM manual_metrics WHERE slug = ?", [copy])) as { id: string }[];
    const id = existing[0]?.id ?? randomUUID();
    if (!existing.length) {
      await run(
        `INSERT INTO manual_metrics (id, slug, name, unit, surface, subgroup_id, description, sort_order, dataset_id,
           value_column, period_column, aggregation, aggregation_options, source_type, filter_columns, breakdown_views, direction)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quarter', 'sum', '{}', 'dataset', ?, ?, ?)`,
        [id, copy, `${m.name} by component`, m.unit, m.surface, m.subgroup_id, `${m.description} Per component, by quarter.`,
         Number(m.sort_order) + 1, quarterlyId, m.value_column, JSON.stringify(["library", "component"]),
         JSON.stringify({ library: "none", component: "none" }), m.direction ?? "up"],
      );
    }
    replacements[String(m.id)] = id;
  }
  for (const m of metrics) {
    const options = m.slug === "figma-detach-rate" ? { over_time: "total", denominator_column: "inserts" } : { over_time: "total" };
    await run(
      "UPDATE manual_metrics SET dataset_id = ?, period_column = 'week', aggregation_options = ?, filter_columns = ?, breakdown_views = ? WHERE id = ?",
      [weeklyId, JSON.stringify(options), JSON.stringify(["library"]), JSON.stringify({ library: "none" }), m.id],
    );
  }
  // Sections breaking those numbers down by component now use the "by component" copies.
  const items = (await run("SELECT id, ref, options FROM view_items WHERE kind = 'breakdown'")) as { id: string; ref: string; options: unknown }[];
  for (const item of items) {
    const options = (typeof item.options === "string" ? JSON.parse(item.options) : item.options ?? {}) as { column?: string; metrics?: string[] };
    if (options.column !== "component" || !options.metrics?.some((id) => replacements[id])) continue;
    const next = options.metrics.map((id) => replacements[id] ?? id);
    await run("UPDATE view_items SET ref = ?, options = ? WHERE id = ?", [next[0], JSON.stringify({ ...options, metrics: next }), item.id]);
  }
  await run("INSERT INTO app_migrations (name) VALUES (?)", [ADOPT_WEEKLY_NAME]);
  console.log("figma insertions, detachments and detach rate now read weekly data");
}

export const syncFigmaDataset = () => transaction(syncFigmaDatasetWith);
