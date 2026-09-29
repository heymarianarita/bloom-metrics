import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "./db.ts";
import { looksLikeDates, normalizeDateColumn, toIsoDate } from "./shared/dates.ts";

/**
 * Runs on every start: creates missing tables, then imports the Lovable data
 * export once (tracked in app_migrations). Safe to run repeatedly.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_NAME = "2026-09-24-lovable-import";
const EXPORT_FILE = path.join(here, "seed", "lovable-export.sql");

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
    console.log("schema ready");

    const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [IMPORT_NAME]);
    if ((done as unknown[]).length) {
      console.log("lovable import already applied");
      await applyScaleLabels(conn);
      await markRatingColumns(conn);
      await isoDates(conn);
      await isoDatesAll(conn);
    await adoptionSubgroups(conn);
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
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("migration failed", e);
  process.exit(1);
});
