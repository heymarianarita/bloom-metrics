import mysql from "mysql2/promise";

/**
 * MySQL connection pool. Settings come from the environment so the same code
 * runs on playground (bloom-metrics-db) and against a local MySQL.
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "bloom-metrics-db.plg-bloom.svc",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "bloom",
  connectionLimit: 10,
  timezone: "Z",
  dateStrings: true,
  decimalNumbers: true,
  charset: "utf8mb4",
  multipleStatements: false,
});

export type Row = Record<string, unknown>;

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await pool.query(sql, params);
  return result as mysql.ResultSetHeader;
}

/** Runs `fn` inside a transaction on a dedicated connection. */
export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** MySQL DATETIME(6) string ('2026-09-01 13:37:18.110807') → ISO with UTC offset, like PostgREST returns. */
export const toIso = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(v) ? `${v.replace(" ", "T")}+00:00` : v;

/** ISO / Date input → MySQL DATETIME(6) string in UTC. */
export const toMysqlDatetime = (v: unknown) => {
  if (v === null || v === undefined || v === "") return v;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().replace("T", " ").replace("Z", "");
};

export const nowMysql = () => toMysqlDatetime(new Date()) as string;
