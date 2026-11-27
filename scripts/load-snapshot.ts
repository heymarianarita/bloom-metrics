// npm run db:load -- ~/Downloads/bloom-metrics-2026-10-30.json.gz
// Puts a production snapshot (Settings → Data history → Download database copy) in the local database, and
// keeps it as server/seed/snapshot.json.gz so the local database starts from it after a restart.
// Older plain .json downloads load too.
import { rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../server/db.ts";
import { isSnapshot, loadSnapshot, readSnapshotFile } from "../server/snapshot.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2];
const host = process.env.DB_HOST ?? "";

if (!file) {
  console.error("Usage: npm run db:load -- <downloaded snapshot .json.gz>");
  process.exit(1);
}
// Never overwrite a shared database by mistake.
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error(`DB_HOST is "${host}": db:load only writes to a local database.`);
  process.exit(1);
}
const snapshot = readSnapshotFile(file);
if (!isSnapshot(snapshot)) {
  console.error(`${file} isn't a Bloom Metrics snapshot.`);
  process.exit(1);
}

const seed = path.join(root, "server", "seed");
writeFileSync(path.join(seed, "snapshot.json.gz"), gzipSync(JSON.stringify(snapshot)));
rmSync(path.join(seed, "snapshot.json"), { force: true });
const migrate = () => execFileSync("npx", ["tsx", "--env-file-if-exists=.env", "server/migrate.ts"], { cwd: root, stdio: "inherit" });

migrate(); // tables first (an empty database also loads the snapshot here)
const conn = await pool.getConnection();
try {
  const counts = await loadSnapshot(conn, snapshot);
  const rows = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`loaded ${rows} rows in ${Object.keys(counts).length} tables, exported ${snapshot.exported_at}`);
} finally {
  conn.release();
  await pool.end();
}
migrate(); // changes made here since that export
console.log("Done. Restart the API so DEV_ADMIN_PASSWORD applies to any new admins.");
