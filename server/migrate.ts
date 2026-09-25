import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.ts";

/**
 * Runs on every start: creates missing tables, then imports the Lovable data
 * export once (tracked in app_migrations). Safe to run repeatedly.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_NAME = "2026-09-24-lovable-import";
const EXPORT_FILE = path.join(here, "seed", "lovable-export.sql");

const statements = (sql: string) =>
  sql
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);

async function main() {
  const conn = await pool.getConnection();
  try {
    for (const stmt of statements(readFileSync(path.join(here, "schema.sql"), "utf8"))) {
      await conn.query(stmt);
    }
    console.log("schema ready");

    const [done] = await conn.query("SELECT 1 FROM app_migrations WHERE name = ?", [IMPORT_NAME]);
    if ((done as unknown[]).length) {
      console.log("lovable import already applied");
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
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("migration failed", e);
  process.exit(1);
});
