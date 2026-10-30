import type { PoolConnection } from "mysql2/promise";
import { query } from "./db.ts";

/**
 * A copy of the production data for local development: an admin downloads it from
 * Settings → Users, and `npm run db:load -- <file>` puts it in the local database.
 * Secrets and sign-in data stay behind; local sign-in uses DEV_ADMIN_PASSWORD.
 */

export const SNAPSHOT_FORMAT = "bloom-metrics-snapshot";

/** Encrypted credentials, password hashes, one-time links, and caches the app refills itself. */
const LEFT_OUT = new Set(["service_credentials", "user_passwords", "password_links", "integration_cache"]);

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  exported_at: string;
  tables: Record<string, Record<string, unknown>[]>;
}

const tableNames = async (run: (sql: string) => Promise<unknown[]>) =>
  ((await run(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  )) as { name: string }[]).map((t) => t.name);

export async function exportSnapshot(): Promise<Snapshot> {
  const tables: Snapshot["tables"] = {};
  for (const name of await tableNames((sql) => query(sql))) {
    if (LEFT_OUT.has(name)) continue;
    tables[name] = await query(`SELECT * FROM \`${name}\``);
  }
  return { format: SNAPSHOT_FORMAT, exported_at: new Date().toISOString(), tables };
}

export const isSnapshot = (v: unknown): v is Snapshot =>
  Boolean(v && typeof v === "object" && (v as Snapshot).format === SNAPSHOT_FORMAT && (v as Snapshot).tables);

/**
 * Replaces the rows of every table in the snapshot. Columns the local schema doesn't
 * have are dropped; tables left out of the snapshot keep their local rows.
 */
export async function loadSnapshot(conn: PoolConnection, snapshot: Snapshot) {
  const run = async (sql: string, params: unknown[] = []) => (await conn.query(sql, params))[0] as unknown[];
  const local = new Set(await tableNames(run));
  const counts: Record<string, number> = {};

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.beginTransaction();
  try {
    for (const [table, rows] of Object.entries(snapshot.tables)) {
      if (!local.has(table) || LEFT_OUT.has(table)) continue;
      const columns = new Set(
        ((await run("SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [
          table,
        ])) as { name: string }[]).map((c) => c.name),
      );
      await conn.query(`DELETE FROM \`${table}\``);
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const keys = Object.keys(batch[0]).filter((k) => columns.has(k));
        // JSON columns come back parsed; they go in as text.
        const values = batch.map((r) => keys.map((k) => (r[k] !== null && typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k])));
        await conn.query(`INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES ?`, [values]);
      }
      counts[table] = rows.length;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
  return counts;
}
