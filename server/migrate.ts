import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "./db.ts";
import { looksLikeDates, normalizeDateColumn, toIsoDate } from "./shared/dates.ts";
import { isSnapshot, loadSnapshot } from "./snapshot.ts";
import { FIGMA_DATASET_SLUG, syncFigmaDatasetWith } from "./functions/figma-dataset.ts";
import { codeDatasetSlug, domainDatasetSlug, greenhouseDatasetSlug, syncCodeAdoptionDatasetsWith } from "./functions/code-adoption-dataset.ts";
import { codeAdoptionChartsOf, reportRepo } from "./shared/codeAdoptionCharts.ts";

/**
 * Runs on every start: creates missing tables, then imports the Lovable data
 * export once (tracked in app_migrations). Safe to run repeatedly.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_NAME = "2026-09-24-lovable-import";
const EXPORT_FILE = path.join(here, "seed", "lovable-export.sql");
/** The last production snapshot loaded with `npm run db:load`; a fresh local database starts from it. */
const SNAPSHOT_FILE = path.join(here, "seed", "snapshot.json");

/**
 * Columns added to tables that already exist in production. CREATE TABLE IF NOT EXISTS
 * never alters an existing table, so each is added here when missing.
 */
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: "manual_metrics", column: "scale_labels", definition: "JSON NOT NULL DEFAULT (JSON_OBJECT()) AFTER `breakdown_views`" },
  // Subgroups: a group with a parent is a subgroup of it (one level deep).
  { table: "metric_groups", column: "parent_id", definition: "CHAR(36) NULL AFTER `id`" },
  // The subgroup a metric sits in; `surface` stays the name of its top-level group.
  { table: "manual_metrics", column: "subgroup_id", definition: "CHAR(36) NULL AFTER `surface`" },
  // How a dataset gets its data (typed in, CSV export, …) and the steps to update it.
  // Where view_items predates the row layout (local databases built before it).
  { table: "view_items", column: "options", definition: "JSON NOT NULL DEFAULT (JSON_OBJECT()) AFTER `sort_order`" },
  { table: "view_items", column: "row_id", definition: "CHAR(36) NULL AFTER `view_id`" },
  { table: "view_items", column: "slot", definition: "INT NOT NULL DEFAULT 0 AFTER `row_id`" },
  // Dataset columns (by label) the view's filter bar offers, e.g. ["Role", "Business unit"].
  { table: "metric_groups", column: "filters", definition: "JSON NOT NULL DEFAULT (JSON_ARRAY()) AFTER `periodicity`" },
  { table: "manual_datasets", column: "entry_method", definition: "VARCHAR(32) NOT NULL DEFAULT '' AFTER `description`" },
  { table: "manual_datasets", column: "entry_notes", definition: "TEXT NOT NULL DEFAULT ('') AFTER `entry_method`" },
  // ratio: {denominator_column}; count_if: {op, threshold}.
  { table: "manual_metrics", column: "aggregation_options", definition: "JSON NOT NULL DEFAULT (JSON_OBJECT()) AFTER `aggregation`" },
];

/**
 * One-off: Adoption is split into platform subgroups. The per-platform metrics move
 * into their subgroup (keeping their URLs, which now open the subgroup), Figma gets
 * its own subgroup, and the Figma source is pointed at it. (GitHub reports are added,
 * and pointed at a subgroup, in Settings → Dynamic sources.)
 */
const ADOPTION_SUBGROUPS_NAME = "2026-09-29-adoption-subgroups";
const ADOPTION_SUBGROUPS = [
  { slug: "figma", name: "Figma", metric: null },
  { slug: "web", name: "Web", metric: "web" },
  { slug: "ios", name: "iOS", metric: "ios" },
  { slug: "android-jetpack-compose", name: "Android (Jetpack Compose)", metric: "android-jetpack-compose" },
  { slug: "android-xml", name: "Android (XML)", metric: "android-xml" },
];

async function adoptionSubgroups(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [ADOPTION_SUBGROUPS_NAME]);
  if ((done as unknown[]).length) return;
  const [parents] = await conn.query("SELECT id FROM metric_groups WHERE slug = 'adoption' AND parent_id IS NULL");
  const parentId = (parents as { id: string }[])[0]?.id;
  if (parentId) {
    const ids: Record<string, string> = {};
    for (const [i, g] of ADOPTION_SUBGROUPS.entries()) {
      await conn.query(
        "INSERT INTO metric_groups (id, parent_id, slug, name, sort_order) VALUES (UUID(), ?, ?, ?, ?) ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id)",
        [parentId, g.slug, g.name, i],
      );
      const [rows] = await conn.query("SELECT id FROM metric_groups WHERE slug = ?", [g.slug]);
      ids[g.slug] = (rows as { id: string }[])[0].id;
      if (g.metric) {
        // "Web" inside the Web subgroup becomes "Web components in code" (names must stay unique).
        await conn.query(
          "UPDATE manual_metrics SET subgroup_id = ?, name = CONCAT(name, ' components in code'), slug = CONCAT(slug, '-components-in-code') WHERE slug = ? AND surface = 'Adoption'",
          [ids[g.slug], g.metric],
        );
      }
    }
    const pointAt = async (sourceKey: string, label: string, patch: (config: Record<string, unknown>) => Record<string, unknown>) => {
      const [rows] = await conn.query("SELECT config FROM data_source_configs WHERE source_key = ?", [sourceKey]);
      const raw = (rows as { config: unknown }[])[0]?.config;
      const config = (typeof raw === "string" ? JSON.parse(raw) : raw ?? {}) as Record<string, unknown>;
      await conn.query(
        "INSERT INTO data_source_configs (id, source_key, label, config) VALUES (UUID(), ?, ?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE config = VALUES(config)",
        [sourceKey, label, JSON.stringify(patch(config))],
      );
    };
    await pointAt("figma", "Figma component analytics", (c) => ({ ...c, metricGroupId: ids.figma }));
  }
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [ADOPTION_SUBGROUPS_NAME]);
  console.log(parentId ? "adoption subgroups created" : "no Adoption group, subgroups skipped");
}

/**
 * One-off: each Metrics view gets its layout of rows and widgets, built to look exactly like the
 * pages did until now (placement used to live on the metrics and sources themselves):
 *   code report parts, one row each · the Figma panel · the numbers: their cards (up to four per
 *   row), one trend of them all, the score distribution of rating metrics, one breakdown per
 *   filter column · qualitative insights. The numbers' filter columns become the view's filters.
 * Replaces the earlier flat list (2026-10-28-view-items), which only ever ran on local databases.
 */
const VIEW_LAYOUT_NAME = "2026-10-29-view-layout";
const CODE_SECTIONS = [
  { section: "shares", chart: null },
  { section: "trend", chart: "trend" },
  { section: "teams", chart: "teams" },
  { section: "greenhouse", chart: "greenhouse" },
] as const;

const parseJson = <T,>(raw: unknown, fallback: T): T => {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

async function viewLayout(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [VIEW_LAYOUT_NAME]);
  if ((done as unknown[]).length) return;
  type Group = { id: string; parent_id: string | null; slug: string; name: string };
  type Metric = {
    id: string;
    name: string;
    surface: string;
    subgroup_id: string | null;
    sort_order: number;
    dataset_id: string | null;
    value_column: string;
    filter_columns: unknown;
    breakdown_views: unknown;
  };
  const [groupRows] = await conn.query("SELECT id, parent_id, slug, name FROM metric_groups");
  const [metricRows] = await conn.query(
    "SELECT id, name, surface, subgroup_id, sort_order, dataset_id, value_column, filter_columns, breakdown_views FROM manual_metrics WHERE archived = 0",
  );
  const [columnRows] = await conn.query("SELECT dataset_id, `key`, label, kind FROM manual_dataset_columns");
  const [qualitativeRows] = await conn.query("SELECT id, name, group_name, sort_order FROM qualitative_sources");
  const [configRows] = await conn.query(
    "SELECT source_key, config FROM data_source_configs WHERE source_key IN ('figma', 'code_adoption')",
  );
  const groups = groupRows as Group[];
  const metrics = metricRows as Metric[];
  const columns = columnRows as { dataset_id: string; key: string; label: string; kind: string }[];
  const qualitative = qualitativeRows as { id: string; name: string; group_name: string; sort_order: number }[];
  const config = (key: string) =>
    parseJson<Record<string, unknown>>((configRows as { source_key: string; config: unknown }[]).find((r) => r.source_key === key)?.config, {});
  const reports = (Array.isArray(config("code_adoption").reports) ? config("code_adoption").reports : []) as {
    path?: string;
    metricGroupId?: string | null;
    charts?: Record<string, string>;
  }[];
  const byOrder = <T extends { sort_order: number; name: string }>(a: T, b: T) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  const subgroupIds = new Set(groups.filter((g) => g.parent_id).map((g) => g.id));
  const column = (datasetId: string | null, key: string) => columns.find((c) => c.dataset_id === datasetId && c.key === key);

  // Only the superseded flat list (local databases) can be here: start clean.
  await conn.query("DELETE FROM view_items");
  await conn.query("DELETE FROM view_rows");

  let rowCount = 0;
  for (const group of groups) {
    type Widget = { kind: string; ref?: string; section?: string; options?: Record<string, unknown> };
    const rows: { layout: string; widgets: Widget[] }[] = [];
    const filterLabels: string[] = [];

    for (const r of reports.filter((r) => r.path && r.metricGroupId === group.id)) {
      for (const { section, chart } of CODE_SECTIONS) {
        const choice = chart ? r.charts?.[chart] : undefined;
        if (choice === "hidden") continue;
        rows.push({ layout: "1", widgets: [{ kind: "code", ref: r.path!, section, options: choice ? { chart: choice } : {} }] });
      }
    }
    if (config("figma").metricGroupId === group.id) rows.push({ layout: "1", widgets: [{ kind: "figma" }] });

    // Impact and Adoption showed every metric of the group, subgroups included; other tabs left
    // subgroup metrics to their sub-tab.
    const shown = (
      group.parent_id
        ? metrics.filter((m) => m.subgroup_id === group.id)
        : metrics.filter(
            (m) =>
              m.surface === group.name &&
              (["impact", "adoption"].includes(group.slug) || !m.subgroup_id || !subgroupIds.has(m.subgroup_id)),
          )
    ).sort(byOrder);
    if (shown.length) {
      const ids = shown.map((m) => m.id);
      for (let i = 0; i < shown.length; i += 4) {
        const chunk = shown.slice(i, i + 4);
        rows.push({ layout: chunk.map(() => "1").join("-"), widgets: chunk.map((m) => ({ kind: "card", ref: m.id })) });
      }
      rows.push({ layout: "1", widgets: [{ kind: "trend", ref: ids[0], options: { metrics: ids, chart: "line" } }] });
      const rated = shown.filter((m) => column(m.dataset_id, m.value_column)?.kind === "rating").map((m) => m.id);
      if (rated.length) rows.push({ layout: "1", widgets: [{ kind: "distribution", ref: rated[0], options: { metrics: rated } }] });
      // One breakdown per filter column, across the metrics that offer it.
      const breakdowns = new Map<string, { view: string; metrics: string[] }>();
      for (const m of shown) {
        const keys = parseJson<string[]>(m.filter_columns, []);
        const views = parseJson<Record<string, string>>(m.breakdown_views, {});
        for (const key of keys) {
          const label = column(m.dataset_id, key)?.label;
          if (label && !filterLabels.includes(label)) filterLabels.push(label);
          const view = views[key] ?? "table";
          if (view === "none") continue;
          const entry = breakdowns.get(key) ?? { view, metrics: [] };
          entry.metrics.push(m.id);
          breakdowns.set(key, entry);
        }
      }
      for (const [key, { view, metrics: on }] of breakdowns) {
        rows.push({ layout: "1", widgets: [{ kind: "breakdown", ref: on[0], options: { metrics: on, column: key, view } }] });
      }
    }

    if (!group.parent_id) {
      for (const q of qualitative.filter((q) => q.group_name === group.name).sort(byOrder)) {
        rows.push({ layout: "1", widgets: [{ kind: "themes", ref: q.id }] });
      }
    }

    for (const [i, row] of rows.entries()) {
      const [created] = await conn.query("SELECT UUID() AS id");
      const rowId = (created as { id: string }[])[0].id;
      await conn.query("INSERT INTO view_rows (id, view_id, layout, sort_order) VALUES (?, ?, ?, ?)", [rowId, group.id, row.layout, i]);
      for (const [slot, w] of row.widgets.entries()) {
        await conn.query(
          "INSERT INTO view_items (id, view_id, row_id, slot, kind, ref, section, options) VALUES (UUID(), ?, ?, ?, ?, ?, ?, CAST(? AS JSON))",
          [group.id, rowId, slot, w.kind, w.ref ?? "", w.section ?? "", JSON.stringify(w.options ?? {})],
        );
      }
    }
    await conn.query("UPDATE metric_groups SET filters = CAST(? AS JSON) WHERE id = ?", [JSON.stringify(filterLabels), group.id]);
    rowCount += rows.length;
  }
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [VIEW_LAYOUT_NAME]);
  console.log(`view layouts created: ${rowCount} rows across ${groups.length} views`);
}

/**
 * One-off: views become a plain list of sections instead of rows split into columns. Rows of
 * cards merge into one "headline numbers" section; other widgets keep their order and take a
 * width from their column's share of the row.
 */
const VIEW_SECTIONS_NAME = "2026-10-29-view-sections";

async function viewSections(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [VIEW_SECTIONS_NAME]);
  if ((done as unknown[]).length) return;
  type Row = { id: string; view_id: string; layout: string; sort_order: number };
  type Item = { id: string; view_id: string; row_id: string | null; slot: number; kind: string; ref: string; options: unknown };
  const [rowRows] = await conn.query("SELECT id, view_id, layout, sort_order FROM view_rows ORDER BY sort_order");
  const [itemRows] = await conn.query("SELECT id, view_id, row_id, slot, kind, ref, options FROM view_items");
  const rows = rowRows as Row[];
  const items = itemRows as Item[];
  const widthOf = (share: number) => (share > 0.99 ? "full" : share >= 0.6 ? "wide" : share >= 0.45 ? "half" : "narrow");

  let count = 0;
  for (const viewId of [...new Set(items.map((i) => i.view_id))]) {
    const sections: { item: Item; options: Record<string, unknown> }[] = [];
    const merged: string[] = [];
    let lastWasCards = false;
    for (const row of rows.filter((r) => r.view_id === viewId)) {
      const widgets = items.filter((i) => i.row_id === row.id).sort((a, b) => a.slot - b.slot);
      if (!widgets.length) continue;
      if (widgets.every((w) => w.kind === "card")) {
        const refs = widgets.map((w) => w.ref).filter(Boolean);
        if (lastWasCards) {
          const target = sections[sections.length - 1];
          target.options.metrics = [...(target.options.metrics as string[]), ...refs];
          merged.push(...widgets.map((w) => w.id));
        } else {
          sections.push({ item: widgets[0], options: { metrics: refs, width: "full" } });
          merged.push(...widgets.slice(1).map((w) => w.id));
        }
        lastWasCards = true;
        continue;
      }
      lastWasCards = false;
      const parts = row.layout.split("-").map(Number).filter((n) => n > 0);
      const total = parts.reduce((a, b) => a + b, 0) || 1;
      for (const w of widgets) {
        sections.push({ item: w, options: { ...parseJson<Record<string, unknown>>(w.options, {}), width: widthOf((parts[w.slot] ?? 1) / total) } });
      }
    }
    // Widgets outside any row go last.
    for (const w of items.filter((i) => i.view_id === viewId && !i.row_id)) {
      sections.push({ item: w, options: { ...parseJson<Record<string, unknown>>(w.options, {}), width: "full" } });
    }
    for (const id of merged) await conn.query("DELETE FROM view_items WHERE id = ?", [id]);
    for (const [i, { item, options }] of sections.entries()) {
      await conn.query("UPDATE view_items SET row_id = NULL, slot = 0, sort_order = ?, options = CAST(? AS JSON) WHERE id = ?", [
        i,
        JSON.stringify(options),
        item.id,
      ]);
    }
    count += sections.length;
  }
  await conn.query("DELETE FROM view_rows");
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [VIEW_SECTIONS_NAME]);
  console.log(`view sections: ${count} sections`);
}

/** One-off: the Impact survey's answer labels, filled in only where no labels were set yet. */
const SCALE_LABELS_NAME = "2026-09-28-impact-scale-labels";
const IMPACT_SCALE_LABELS: Record<string, Record<string, string>> = {
  "perceived-efficiency-avg-score": {
    "1": "Greatly slows me down",
    "2": "Somewhat slows me down",
    "3": "Has no impact on my speed",
    "4": "Somewhat speeds me up",
    "5": "Greatly speeds me up",
  },
  "discoverability-avg-score": {
    "1": "Very difficult",
    "2": "Somewhat difficult",
    "3": "Neutral",
    "4": "Somewhat easy",
    "5": "Very easy",
  },
  "design-to-development-handoff-time-avg-score": {
    "1": "Greatly slows it down",
    "2": "Somewhat slows it down",
    "3": "No impact on handoff time",
    "4": "Somewhat speeds it up",
    "5": "Greatly speeds it up",
  },
  "user-confidence-avg-score": {
    "1": "Not at all confident",
    "2": "Slightly confident",
    "3": "Moderately confident",
    "4": "Very confident",
    "5": "Extremely confident",
  },
};

async function applyScaleLabels(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [SCALE_LABELS_NAME]);
  if ((done as unknown[]).length) return;
  for (const [slug, labels] of Object.entries(IMPACT_SCALE_LABELS)) {
    await conn.query(
      "UPDATE manual_metrics SET scale_labels = CAST(? AS JSON) WHERE slug = ? AND JSON_LENGTH(scale_labels) = 0",
      [JSON.stringify(labels), slug],
    );
  }
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [SCALE_LABELS_NAME]);
  console.log("impact scale labels applied");
}

/** One-off: dates in Date columns are rewritten as YYYY-MM-DD (e.g. "3/26/2025" → "2025-03-26"). */
const ISO_DATES_NAME = "2026-09-28-iso-dates";

async function isoDates(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [ISO_DATES_NAME]);
  if ((done as unknown[]).length) return;
  const [cols] = await conn.query(
    "SELECT c.dataset_id, c.`key`, d.slug FROM manual_dataset_columns c JOIN manual_datasets d ON d.id = c.dataset_id WHERE c.kind = 'date'",
  );
  for (const col of cols as { dataset_id: string; key: string; slug: string }[]) {
    const [rows] = await conn.query("SELECT id, data FROM manual_dataset_rows WHERE dataset_id = ?", [col.dataset_id]);
    const list = (rows as { id: string; data: unknown }[]).map((r) => {
      const data = (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as Record<string, unknown>;
      return { id: r.id, value: data?.[col.key] == null ? "" : String(data[col.key]) };
    });
    const result = normalizeDateColumn(list.map((r) => r.value));
    if (result.ambiguous) {
      // Month-first or day-first can't be told from this column: leave it for a person to decide.
      console.log(`dates in ${col.slug}.${col.key} could be either month-first or day-first; left as they are`);
      continue;
    }
    let changed = 0;
    for (const [i, row] of list.entries()) {
      if (result.values[i] === row.value) continue;
      await conn.query("UPDATE manual_dataset_rows SET data = JSON_SET(data, ?, ?) WHERE id = ?", [
        `$."${col.key}"`,
        result.values[i],
        row.id,
      ]);
      changed++;
    }
    console.log(`dates in ${col.slug}.${col.key}: ${changed} rewritten as YYYY-MM-DD${result.unreadable ? `, ${result.unreadable} not readable as dates` : ""}`);
  }
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [ISO_DATES_NAME]);
}

/**
 * One-off, after 2026-09-28-iso-dates: every date stored as text becomes YYYY-MM-DD.
 * Covers what that pass left out: dates with a time ("3/26/2025 10:15:23"), Text columns
 * that hold dates (retyped Date) and day periods in computed values. Columns whose order
 * can't be told stay as they are and are logged, for someone to fix on the dataset page.
 */
const ISO_DATES_ALL_NAME = "2026-09-29-iso-dates-all";

async function isoDatesAll(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [ISO_DATES_ALL_NAME]);
  if ((done as unknown[]).length) return;
  const [cols] = await conn.query(
    "SELECT c.id, c.dataset_id, c.`key`, c.kind, d.slug FROM manual_dataset_columns c JOIN manual_datasets d ON d.id = c.dataset_id WHERE c.kind IN ('date', 'text')",
  );
  let total = 0;
  for (const col of cols as { id: string; dataset_id: string; key: string; kind: string; slug: string }[]) {
    const [rows] = await conn.query("SELECT id, data FROM manual_dataset_rows WHERE dataset_id = ?", [col.dataset_id]);
    const list = (rows as { id: string; data: unknown }[]).map((r) => {
      const data = (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as Record<string, unknown>;
      return { id: r.id, value: data?.[col.key] == null ? "" : String(data[col.key]) };
    });
    const values = list.map((r) => r.value);
    if (col.kind === "text" && !looksLikeDates(values)) continue;
    const result = normalizeDateColumn(values);
    if (result.ambiguous) {
      console.log(`dates in ${col.slug}.${col.key} could be either month-first or day-first; left as they are`);
      continue;
    }
    let changed = 0;
    for (const [i, row] of list.entries()) {
      if (result.values[i] === row.value) continue;
      await conn.query("UPDATE manual_dataset_rows SET data = JSON_SET(data, ?, ?) WHERE id = ?", [
        `$."${col.key}"`,
        result.values[i],
        row.id,
      ]);
      changed++;
    }
    if (col.kind === "text") {
      await conn.query("UPDATE manual_dataset_columns SET kind = 'date' WHERE id = ?", [col.id]);
      console.log(`${col.slug}.${col.key} holds dates: now a Date column`);
    }
    if (changed || result.unreadable)
      console.log(`dates in ${col.slug}.${col.key}: ${changed} rewritten as YYYY-MM-DD${result.unreadable ? `, ${result.unreadable} not readable as dates` : ""}`);
    total += changed;
  }

  // Periods that are single days ("3/26/2025") in computed values and summaries.
  for (const table of ["manual_metric_values", "qualitative_summaries"]) {
    const [periods] = await conn.query(`SELECT DISTINCT period FROM \`${table}\``);
    let changed = 0;
    for (const { period } of periods as { period: string }[]) {
      const iso = toIsoDate(period);
      if (!iso || iso === period) continue;
      // IGNORE: if the ISO period already exists, the old duplicate is left rather than overwriting it.
      const [res] = await conn.query(`UPDATE IGNORE \`${table}\` SET period = ? WHERE period = ?`, [iso, period]);
      changed += (res as { affectedRows: number }).affectedRows;
    }
    if (changed) console.log(`${table}: ${changed} periods rewritten as YYYY-MM-DD`);
    total += changed;
  }

  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [ISO_DATES_ALL_NAME]);
  console.log(`iso dates check done: ${total} values rewritten`);
}

/** One-off: the Impact survey's 1–5 score columns are ratings, not plain numbers. */
const RATING_COLUMNS_NAME = "2026-09-28-impact-rating-columns";

async function markRatingColumns(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [RATING_COLUMNS_NAME]);
  if ((done as unknown[]).length) return;
  await conn.query(
    `UPDATE manual_dataset_columns c JOIN manual_datasets d ON d.id = c.dataset_id
        SET c.kind = 'rating'
      WHERE d.slug = 'impact_data' AND c.kind = 'number'
        AND c.\`key\` IN ('perceived_efficiency_score', 'discoverability_score', 'user_confidence_score', 'design_to_development_handoff_time_score')`,
  );
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [RATING_COLUMNS_NAME]);
  console.log("impact rating columns marked");
}

const statements = (sql: string) =>
  sql
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);

/**
 * One-off: Figma becomes ordinary data. Its snapshots are synced into the "Figma component
 * analytics" dataset, four metrics read it, and the Figma view's dedicated section is replaced
 * by generic ones (numbers grid, insertions per library over time, adoption per component).
 */
const FIGMA_GENERIC_NAME = "2026-10-30-figma-generic";

async function figmaGeneric(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [FIGMA_GENERIC_NAME]);
  if ((done as unknown[]).length) return;
  await syncFigmaDatasetWith(conn);
  const [datasets] = await conn.query("SELECT id FROM manual_datasets WHERE slug = ?", [FIGMA_DATASET_SLUG]);
  const datasetId = (datasets as { id: string }[])[0].id;
  const [groups] = await conn.query(
    "SELECT g.id, p.name AS parent FROM metric_groups g JOIN metric_groups p ON p.id = g.parent_id WHERE g.slug = 'figma'",
  );
  const figma = (groups as { id: string; parent: string }[])[0];

  const metrics = [
    { slug: "figma-insertions", name: "Figma insertions", unit: "", value: "inserts", aggregation: "sum", options: {},
      description: "Times a library component was inserted into a Figma file." },
    { slug: "figma-detachments", name: "Figma detachments", unit: "", value: "detaches", aggregation: "sum", options: {},
      description: "Times an inserted library component was detached." },
    { slug: "figma-detach-rate", name: "Figma detach rate", unit: "%", value: "detaches", aggregation: "ratio",
      options: { denominator_column: "inserts" }, description: "Detachments as a share of insertions." },
    { slug: "figma-never-inserted", name: "Figma components never inserted", unit: "", value: "inserts", aggregation: "count_if",
      options: { op: "eq", threshold: 0 }, description: "Library components nobody inserted in the period." },
  ];
  const ids: Record<string, string> = {};
  const [maxRow] = await conn.query("SELECT COALESCE(MAX(sort_order), 0) AS m FROM manual_metrics");
  let order = Number((maxRow as { m: number }[])[0].m) + 1;
  for (const m of metrics) {
    const [existing] = await conn.query("SELECT id FROM manual_metrics WHERE slug = ?", [m.slug]);
    const id = (existing as { id: string }[])[0]?.id ?? randomUUID();
    ids[m.slug] = id;
    if ((existing as unknown[]).length) continue;
    await conn.query(
      `INSERT INTO manual_metrics (id, slug, name, unit, surface, subgroup_id, description, sort_order, dataset_id,
         value_column, period_column, aggregation, aggregation_options, source_type, filter_columns, breakdown_views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quarter', ?, ?, 'dataset', ?, ?)`,
      [id, m.slug, m.name, m.unit, figma?.parent ?? "Adoption", figma?.id ?? null, m.description, order++, datasetId,
       m.value, m.aggregation, JSON.stringify(m.options), JSON.stringify(["library", "component"]),
       JSON.stringify({ library: "none", component: "none" })],
    );
  }

  if (figma) {
    await conn.query("DELETE FROM view_items WHERE view_id = ? AND kind = 'figma'", [figma.id]);
    const [last] = await conn.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM view_items WHERE view_id = ?", [figma.id]);
    let at = Number((last as { m: number }[])[0].m) + 1;
    const sections = [
      { kind: "card", ref: ids["figma-insertions"], options: { width: "full", columns: 4,
        metrics: ["figma-insertions", "figma-detachments", "figma-detach-rate", "figma-never-inserted"].map((s) => ids[s]) } },
      { kind: "breakdown", ref: ids["figma-insertions"], options: { width: "full", title: "Evolution over time",
        metrics: [ids["figma-insertions"]], column: "library", view: "line" } },
      { kind: "breakdown", ref: ids["figma-insertions"], options: { width: "full", title: "Adoption per component",
        metrics: [ids["figma-insertions"], ids["figma-detachments"]], column: "component", view: "bar", limit: 20 } },
    ];
    for (const s of sections) {
      await conn.query(
        "INSERT INTO view_items (id, view_id, kind, ref, section, hidden, sort_order, options) VALUES (?, ?, ?, ?, '', 0, ?, ?)",
        [randomUUID(), figma.id, s.kind, s.ref, at++, JSON.stringify(s.options)],
      );
    }
    await conn.query("UPDATE metric_groups SET filters = ? WHERE id = ?", [JSON.stringify(["Library"]), figma.id]);
  }
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [FIGMA_GENERIC_NAME]);
  console.log("figma is now a synced dataset with generic view sections");
}

/**
 * One-off: code adoption becomes ordinary data. Each GitHub report gets synced datasets, metrics
 * read them (four shares from the report's totals, the same four per domain, Greenhouse usages),
 * and every "Code adoption" section is replaced in place (same position, width and visibility)
 * by a generic one, drawn the way that section was.
 */
const CODE_GENERIC_NAME = "2026-10-30-code-generic";

async function codeGeneric(conn: PoolConnection) {
  const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [CODE_GENERIC_NAME]);
  if ((done as unknown[]).length) return;
  await syncCodeAdoptionDatasetsWith(conn);

  const [configRows] = await conn.query("SELECT config FROM data_source_configs WHERE source_key = 'code_adoption'");
  const rawConfig = (configRows as { config: unknown }[])[0]?.config;
  const config = (typeof rawConfig === "string" ? JSON.parse(rawConfig) : rawConfig) as
    | { reports?: { path?: string; metricGroupId?: string; charts?: unknown }[] }
    | undefined;
  const reports = (config?.reports ?? []).filter((r) => r.path);
  const [maxRow] = await conn.query("SELECT COALESCE(MAX(sort_order), 0) AS m FROM manual_metrics");
  let order = Number((maxRow as { m: number }[])[0].m) + 1;

  /** Per report path: the metric ids, and how its charts were drawn. */
  const byPath = new Map<
    string,
    { shares: string[]; domainShares: string[]; usages: string; charts: ReturnType<typeof codeAdoptionChartsOf> }
  >();
  for (const report of reports) {
    const repo = reportRepo(String(report.path));
    const [codeSet] = await conn.query("SELECT id FROM manual_datasets WHERE slug = ?", [codeDatasetSlug(repo)]);
    const [domainSet] = await conn.query("SELECT id FROM manual_datasets WHERE slug = ?", [domainDatasetSlug(repo)]);
    const [ghSet] = await conn.query("SELECT id FROM manual_datasets WHERE slug = ?", [greenhouseDatasetSlug(repo)]);
    const codeId = (codeSet as { id: string }[])[0]?.id;
    const domainId = (domainSet as { id: string }[])[0]?.id;
    const ghId = (ghSet as { id: string }[])[0]?.id;
    if (!codeId || !domainId || !ghId) continue;
    // The report's page: a subgroup (metric under its parent) or a top-level group.
    const [groupRows] = await conn.query(
      "SELECT g.id, g.name, p.name AS parent FROM metric_groups g LEFT JOIN metric_groups p ON p.id = g.parent_id WHERE g.id = ?",
      [report.metricGroupId ?? ""],
    );
    const group = (groupRows as { id: string; name: string; parent: string | null }[])[0];
    const surface = group ? (group.parent ?? group.name) : "Adoption";
    const subgroupId = group?.parent ? group.id : null;

    const specs = [
      { key: "bloom", name: "Bloom share", description: "Share of UI elements that are Bloom components." },
      { key: "greenhouse", name: "Greenhouse share", description: "Share of UI elements that are tagged Greenhouse components." },
      { key: "native", name: "Native HTML share", description: "Share of UI elements that are plain HTML elements." },
      { key: "untagged", name: "Untagged custom UI share", description: "Share of UI elements that are custom and untagged." },
    ];
    const ids: string[] = [];
    const save = async (slug: string, fields: unknown[]) => {
      const [existing] = await conn.query("SELECT id FROM manual_metrics WHERE slug = ?", [slug]);
      const found = (existing as { id: string }[])[0]?.id;
      if (found) return found;
      const id = randomUUID();
      await conn.query(
        `INSERT INTO manual_metrics (id, slug, name, unit, surface, subgroup_id, description, sort_order, dataset_id,
           value_column, period_column, aggregation, aggregation_options, source_type, filter_columns, breakdown_views)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scanned', ?, ?, 'dataset', ?, ?)`,
        [id, slug, ...fields],
      );
      return id;
    };
    for (const s of specs) {
      ids.push(
        await save(`${repo}-${s.key}-share`, [
          `${s.name} · ${repo}`, "%", surface, subgroupId, `${s.description} From the ${repo} code scans.`, order++, codeId,
          s.key, "ratio", JSON.stringify({ denominator_column: "elements" }), "[]", "{}",
        ]),
      );
    }
    const domainIds: string[] = [];
    for (const s of specs) {
      domainIds.push(
        await save(`${repo}-${s.key}-share-by-domain`, [
          `${s.name} by domain · ${repo}`, "%", surface, subgroupId,
          `${s.description} Per domain of ${repo}; domains overlap a little, so use the overall share for the whole repo.`,
          order++, domainId, s.key, "ratio", JSON.stringify({ denominator_column: "elements" }), JSON.stringify(["domain"]),
          JSON.stringify({ domain: "none" }),
        ]),
      );
    }
    const usages = await save(`${repo}-greenhouse-usages`, [
      `Greenhouse component usages · ${repo}`, "", surface, subgroupId,
      `How often registered Greenhouse components are used in ${repo}.`, order++, ghId, "usages", "sum", "{}",
      JSON.stringify(["component"]), JSON.stringify({ component: "none" }),
    ]);
    byPath.set(String(report.path), { shares: ids, domainShares: domainIds, usages, charts: codeAdoptionChartsOf(report.charts) });
  }

  const [items] = await conn.query("SELECT id, ref, section, hidden, options FROM view_items WHERE kind = 'code'");
  for (const item of items as { id: string; ref: string; section: string; hidden: number; options: unknown }[]) {
    const metrics = byPath.get(item.ref);
    if (!metrics) continue;
    const old = (typeof item.options === "string" ? JSON.parse(item.options) : item.options ?? {}) as Record<string, unknown>;
    const keep = { width: old.width, ...(old.title ? { title: old.title } : {}) };
    // The section's own chart choice, else the report's.
    const chart = String(old.chart ?? metrics.charts[item.section as keyof typeof metrics.charts] ?? "");
    const [trend, teams, greenhouse] = [chart, chart, chart];
    const next =
      item.section === "shares"
        ? { kind: "card", options: { ...keep, metrics: metrics.shares, columns: 4 }, hide: false }
        : item.section === "trend"
          ? {
              kind: "trend",
              options: { ...keep, title: old.title ?? "Evolution over time", metrics: metrics.shares, chart: trend === "line" ? "line" : trend === "stacked_bar" ? "bar" : "area" },
              hide: trend === "hidden",
            }
          : item.section === "teams"
            ? {
                kind: "breakdown",
                options: { ...keep, title: old.title ?? "Adoption by team", metrics: metrics.domainShares, column: "domain", view: teams === "table" ? "table" : "bar" },
                hide: teams === "hidden",
              }
            : {
                kind: "breakdown",
                options: { ...keep, title: old.title ?? "Greenhouse components", metrics: [metrics.usages], column: "component", view: greenhouse === "bar" ? "bar" : "table" },
                hide: greenhouse === "hidden",
              };
    await conn.query("UPDATE view_items SET kind = ?, ref = ?, section = '', hidden = ?, options = ? WHERE id = ?", [
      next.kind,
      (next.options.metrics as string[])[0],
      next.hide ? 1 : item.hidden,
      JSON.stringify(next.options),
      item.id,
    ]);
  }
  await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [CODE_GENERIC_NAME]);
  console.log(`code adoption is now synced datasets with generic view sections (${byPath.size} reports)`);
}

/** The database may still be starting (dev db, or a restarting MySQL pod): retry for up to a minute. */
async function connectWithRetry() {
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      return await pool.getConnection();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (!["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST"].includes(code) || Date.now() > deadline) throw e;
      console.log(`database not reachable yet (${code}), retrying…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const conn = await connectWithRetry();
  try {
    for (const stmt of statements(readFileSync(path.join(here, "schema.sql"), "utf8"))) {
      await conn.query(stmt);
    }
    for (const { table, column, definition } of ADDED_COLUMNS) {
      const [cols] = await conn.query(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [table, column],
      );
      if ((cols as unknown[]).length === 0) {
        await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`added ${table}.${column}`);
      }
    }
    // The column type list grew ("rating"); CREATE TABLE IF NOT EXISTS leaves the old CHECK in place.
    const [kindCheck] = await conn.query(
      "SELECT CHECK_CLAUSE AS clause FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'manual_dataset_columns_kind_check'",
    );
    const clause = String((kindCheck as { clause?: string }[])[0]?.clause ?? "");
    if (clause && !clause.includes("rating")) {
      await conn.query(
        "ALTER TABLE `manual_dataset_columns` DROP CHECK `manual_dataset_columns_kind_check`, ADD CONSTRAINT `manual_dataset_columns_kind_check` CHECK (`kind` IN ('text','number','rating','period','email','date'))",
      );
      console.log("manual_dataset_columns.kind now allows rating");
    }
    // Metrics gained "ratio" and "count_if"; an older CHECK still lists the first four.
    const [aggCheck] = await conn.query(
      "SELECT CHECK_CLAUSE AS clause FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'manual_metrics_aggregation_check'",
    );
    const aggClause = String((aggCheck as { clause?: string }[])[0]?.clause ?? "");
    if (aggClause && !aggClause.includes("count_if")) {
      await conn.query(
        "ALTER TABLE `manual_metrics` DROP CHECK `manual_metrics_aggregation_check`, ADD CONSTRAINT `manual_metrics_aggregation_check` CHECK (`aggregation` IN ('sum','avg','latest','count','ratio','count_if'))",
      );
      console.log("manual_metrics.aggregation now allows ratio and count_if");
    }
    console.log("schema ready");

    const [started] = await conn.query("SELECT 1 FROM app_migrations LIMIT 1");
    if ((started as unknown[]).length === 0 && existsSync(SNAPSHOT_FILE)) {
      const snapshot: unknown = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));
      if (isSnapshot(snapshot)) {
        await loadSnapshot(conn, snapshot);
        console.log(`loaded the production snapshot from ${snapshot.exported_at}`);
      }
    }

    const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [IMPORT_NAME]);
    if ((done as unknown[]).length) {
      console.log("lovable import already applied");
      await applyScaleLabels(conn);
      await markRatingColumns(conn);
      await isoDates(conn);
      await isoDatesAll(conn);
      await adoptionSubgroups(conn);
      await viewLayout(conn);
      await viewSections(conn);
      await figmaGeneric(conn);
      await codeGeneric(conn);
      return;
    }
    if (!existsSync(EXPORT_FILE)) {
      console.log(`no export at ${EXPORT_FILE}, skipping import`);
      return;
    }

    // The export's own CREATE TABLEs lack defaults and keys, so only its rows are used.
    const inserts = readFileSync(EXPORT_FILE, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("INSERT INTO "));
    console.log(`importing ${inserts.length} rows from the Lovable export`);

    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    await conn.beginTransaction();
    try {
      // Tables may hold rows created before the import (e.g. a test sign-in); the export wins.
      const tables = [...new Set(inserts.map((l) => /^INSERT INTO `([^`]+)`/.exec(l)?.[1]).filter(Boolean))] as string[];
      for (const t of tables) await conn.query(`DELETE FROM \`${t}\``);
      for (const [i, line] of inserts.entries()) {
        await conn.query(line.replace(/;$/, ""));
        if ((i + 1) % 2000 === 0) console.log(`  ${i + 1}/${inserts.length}`);
      }
      await conn.query("INSERT INTO app_migrations (name) VALUES (?)", [IMPORT_NAME]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    const [counts] = await conn.query(
      "SELECT (SELECT COUNT(*) FROM manual_dataset_rows) AS dataset_rows, (SELECT COUNT(*) FROM data_change_log) AS change_log, (SELECT COUNT(*) FROM profiles) AS profiles",
    );
    console.log("lovable import complete", JSON.stringify(counts));
    await applyScaleLabels(conn);
    await markRatingColumns(conn);
    await isoDates(conn);
    await isoDatesAll(conn);
    await adoptionSubgroups(conn);
    await viewLayout(conn);
    await viewSections(conn);
    await figmaGeneric(conn);
    await codeGeneric(conn);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("migration failed", e);
  process.exit(1);
});
