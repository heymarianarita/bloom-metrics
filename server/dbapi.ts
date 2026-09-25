import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { transaction, toIso, toMysqlDatetime, type Row } from "./db.ts";
import { adminExists, canEdit, hasRole, type SessionUser } from "./auth.ts";
import { DATETIME_COLUMNS, TABLES, type TableDef } from "./tables.ts";

/**
 * Executes the PostgREST-style requests sent by the frontend's supabase-js
 * stand-in (src/integrations/supabase/client.ts) against MySQL, enforcing the
 * access rules that used to live in Postgres RLS policies.
 */

export type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in";

export interface DbRequest {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  filters?: { column: string; op: Op; value: unknown; negate?: boolean }[];
  order?: { column: string; ascending?: boolean; nullsFirst?: boolean }[];
  limit?: number;
  offset?: number;
  single?: "one" | "maybe";
  count?: "exact";
  head?: boolean;
  values?: Row | Row[];
  onConflict?: string;
  ignoreDuplicates?: boolean;
  returning?: boolean;
}

export interface DbError {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
}

export interface DbResponse {
  status: number;
  data: unknown;
  error: DbError | null;
  count?: number | null;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const denied = () => new ApiError(403, "42501", "permission denied: your role does not allow this change");

const ident = (name: string) => `\`${name.replace(/`/g, "")}\``;

/** Rows that disappear through ON DELETE CASCADE — logged like Postgres row triggers did. */
const CASCADES: Record<string, { table: string; fk: string }[]> = {
  manual_datasets: [
    { table: "manual_dataset_columns", fk: "dataset_id" },
    { table: "manual_dataset_rows", fk: "dataset_id" },
  ],
  manual_metrics: [{ table: "manual_metric_values", fk: "metric_id" }],
  ai_template_definitions: [{ table: "ai_template_metrics", fk: "template_id" }],
};

// ---- value conversion -------------------------------------------------------

function toDb(def: TableDef, column: string, value: unknown) {
  if (value === undefined) return null;
  if (def.json?.includes(column)) return value === null ? null : JSON.stringify(value);
  if (def.bool?.includes(column) && typeof value === "boolean") return value ? 1 : 0;
  if (DATETIME_COLUMNS.has(column)) return toMysqlDatetime(value);
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return value;
}

function fromDb(def: TableDef, row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (def.bool?.includes(k)) out[k] = v === null ? null : Boolean(v);
    else if (DATETIME_COLUMNS.has(k)) out[k] = toIso(v);
    else if (def.json?.includes(k) && typeof v === "string") {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = v;
      }
    } else out[k] = v;
  }
  return out;
}

function assertColumn(def: TableDef, table: string, column: string) {
  if (!def.columns.includes(column)) {
    throw new ApiError(400, "PGRST204", `Could not find the '${column}' column of '${table}' in the schema cache`);
  }
}

// ---- SQL building -----------------------------------------------------------

function whereClause(def: TableDef, req: DbRequest, extra: { sql: string; params: unknown[] }[] = []) {
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const f of req.filters ?? []) {
    assertColumn(def, req.table, f.column);
    const col = ident(f.column);
    const not = f.negate ? "NOT " : "";
    const v = toDb(def, f.column, f.value);
    switch (f.op) {
      case "eq":
        parts.push(`${not}${col} = ?`);
        params.push(v);
        break;
      case "neq":
        parts.push(`${not}${col} <> ?`);
        params.push(v);
        break;
      case "gt":
      case "gte":
      case "lt":
      case "lte":
        parts.push(`${not}${col} ${{ gt: ">", gte: ">=", lt: "<", lte: "<=" }[f.op]} ?`);
        params.push(v);
        break;
      case "like":
        parts.push(`${not}${col} LIKE BINARY ?`);
        params.push(v);
        break;
      case "ilike":
        parts.push(`${not}LOWER(${col}) LIKE LOWER(?)`);
        params.push(v);
        break;
      case "is":
        if (f.value === null) parts.push(`${col} IS ${f.negate ? "NOT " : ""}NULL`);
        else {
          parts.push(`${not}${col} = ?`);
          params.push(f.value ? 1 : 0);
        }
        break;
      case "in": {
        const list = Array.isArray(f.value) ? f.value : [];
        if (!list.length) parts.push(f.negate ? "1 = 1" : "1 = 0");
        else {
          parts.push(`${col} ${f.negate ? "NOT " : ""}IN (${list.map(() => "?").join(", ")})`);
          params.push(...list.map((x) => toDb(def, f.column, x)));
        }
        break;
      }
      default:
        throw new ApiError(400, "PGRST100", `Unsupported filter operator: ${String(f.op)}`);
    }
  }
  for (const e of extra) {
    parts.push(e.sql);
    params.push(...e.params);
  }
  return { sql: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", params };
}

function selectList(def: TableDef, table: string, columns?: string) {
  const raw = (columns ?? "*").trim();
  if (raw === "*" || raw === "") return "*";
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      assertColumn(def, table, c);
      return ident(c);
    })
    .join(", ");
}

function orderClause(def: TableDef, req: DbRequest) {
  if (!req.order?.length) return "";
  const parts = req.order.map((o) => {
    assertColumn(def, req.table, o.column);
    const asc = o.ascending !== false;
    // Postgres default: NULLS LAST for ASC, NULLS FIRST for DESC.
    const nullsFirst = o.nullsFirst ?? !asc;
    return `(${ident(o.column)} IS NULL) ${nullsFirst ? "DESC" : "ASC"}, ${ident(o.column)} ${asc ? "ASC" : "DESC"}`;
  });
  return ` ORDER BY ${parts.join(", ")}`;
}

// ---- access control ---------------------------------------------------------

/** Extra WHERE conditions that restrict which rows a user may read. */
async function readScope(req: DbRequest, user: SessionUser | null) {
  const def = TABLES[req.table];
  if (def.read === "public") return [];
  if (def.read === "none") throw new ApiError(403, "42501", `permission denied for table ${req.table}`);
  if (def.read === "editor" && !(await canEdit(user?.id))) throw denied();
  if (def.read === "admin" && !(await hasRole(user?.id, "admin"))) throw denied();
  if (def.read === "custom") {
    if (!user) return [{ sql: "1 = 0", params: [] }];
    if (await hasRole(user.id, "admin")) return [];
    const col = req.table === "profiles" ? "id" : "user_id";
    return [{ sql: `${ident(col)} = ?`, params: [user.id] }];
  }
  return [];
}

async function checkWrite(req: DbRequest, user: SessionUser | null, rows: Row[]) {
  const def = TABLES[req.table];
  if (!user) throw denied();

  if (req.table === "sync_runs") {
    if (req.action !== "insert") throw denied();
    return;
  }
  if (req.table === "profiles") {
    // Own profile only; updates are additionally scoped to the user's row in doUpdate.
    if (req.action === "delete" || rows.some((r) => r.id !== undefined && r.id !== user.id)) throw denied();
    return;
  }
  if (req.table === "user_roles") {
    if (await hasRole(user.id, "admin")) return;
    // Bootstrap: the first signed-in user may claim admin while none exists.
    const bootstrap =
      req.action === "insert" &&
      rows.length === 1 &&
      rows[0].user_id === user.id &&
      rows[0].role === "admin" &&
      !(await adminExists());
    if (!bootstrap) throw denied();
    return;
  }
  if (def.write === "editor") {
    if (!(await canEdit(user.id))) throw denied();
    return;
  }
  if (def.write === "admin") {
    if (!(await hasRole(user.id, "admin"))) throw denied();
    return;
  }
  throw denied();
}

// ---- audit log --------------------------------------------------------------

type Change = { action: "added" | "edited" | "removed"; old?: Row | null; next?: Row | null };

async function logChanges(conn: PoolConnection, table: string, userId: string, changes: Change[]) {
  if (!changes.length) return;
  const def = TABLES[table];
  const snapshot = (r?: Row | null) => (r ? JSON.stringify(fromDb(def, r)) : null);
  const values = changes.map((c) => [
    randomUUID(),
    table,
    (c.next?.id ?? c.old?.id ?? null) as string | null,
    c.action,
    userId,
    c.action === "added" ? null : snapshot(c.old),
    c.action === "removed" ? null : snapshot(c.next),
  ]);
  for (let i = 0; i < values.length; i += 500) {
    const chunk = values.slice(i, i + 500);
    await conn.query(
      `INSERT INTO data_change_log (id, table_name, row_id, action, changed_by, old_data, new_data) VALUES ${chunk
        .map(() => "(?, ?, ?, ?, ?, ?, ?)")
        .join(", ")}`,
      chunk.flat(),
    );
  }
}

async function fetchByIds(conn: PoolConnection, table: string, ids: unknown[]) {
  if (!ids.length) return [] as Row[];
  const [rows] = await conn.query(`SELECT * FROM ${ident(table)} WHERE id IN (${ids.map(() => "?").join(", ")})`, ids);
  return rows as Row[];
}

// ---- actions ----------------------------------------------------------------

async function doSelect(req: DbRequest, user: SessionUser | null): Promise<DbResponse> {
  const def = TABLES[req.table];
  const where = whereClause(def, req, await readScope(req, user));
  return transaction(async (conn) => {
    let count: number | null = null;
    if (req.count === "exact") {
      const [c] = await conn.query(`SELECT COUNT(*) AS n FROM ${ident(req.table)}${where.sql}`, where.params);
      count = Number((c as Row[])[0].n);
    }
    if (req.head) return { status: 200, data: null, error: null, count };

    let sql = `SELECT ${selectList(def, req.table, req.columns)} FROM ${ident(req.table)}${where.sql}${orderClause(def, req)}`;
    const params = [...where.params];
    if (req.limit !== undefined || req.offset !== undefined) {
      sql += " LIMIT ? OFFSET ?";
      params.push(Math.max(0, Number(req.limit ?? 1e9)), Math.max(0, Number(req.offset ?? 0)));
    }
    const [rows] = await conn.query(sql, params);
    return { status: 200, data: (rows as Row[]).map((r) => fromDb(def, r)), error: null, count };
  });
}

function normaliseRows(def: TableDef, table: string, values: Row | Row[] | undefined) {
  const rows = Array.isArray(values) ? values : values ? [values] : [];
  for (const r of rows) for (const k of Object.keys(r)) assertColumn(def, table, k);
  return rows;
}

async function insertRows(conn: PoolConnection, table: string, rows: Row[], mode: "insert" | "upsert" | "ignore", conflictCols: string[]) {
  const def = TABLES[table];
  // Group rows by their key set so missing columns fall back to column defaults.
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = Object.keys(r).sort().join(",");
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const [keyList, group] of groups) {
    const cols = keyList.split(",");
    for (let i = 0; i < group.length; i += 500) {
      const chunk = group.slice(i, i + 500);
      let sql = `INSERT ${mode === "ignore" ? "IGNORE " : ""}INTO ${ident(table)} (${cols.map(ident).join(", ")}) VALUES ${chunk
        .map(() => `(${cols.map(() => "?").join(", ")})`)
        .join(", ")}`;
      if (mode === "upsert") {
        const updatable = cols.filter((c) => c !== "id" && !conflictCols.includes(c) && c !== "created_at");
        const sets = updatable.map((c) => `${ident(c)} = VALUES(${ident(c)})`);
        if (def.updatedAt && !cols.includes("updated_at")) sets.push("`updated_at` = CURRENT_TIMESTAMP(6)");
        // Nothing to update: keep the row as is (a no-op assignment keeps MySQL happy).
        sql += ` ON DUPLICATE KEY UPDATE ${sets.length ? sets.join(", ") : `${ident(conflictCols[0] ?? "id")} = ${ident(conflictCols[0] ?? "id")}`}`;
      }
      await conn.query(
        sql,
        chunk.flatMap((r) => cols.map((c) => toDb(def, c, r[c]))),
      );
    }
  }
}

async function findByKeys(conn: PoolConnection, table: string, rows: Row[], keyCols: string[]) {
  const def = TABLES[table];
  const found: Row[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const cond = chunk.map(() => `(${keyCols.map((c) => `${ident(c)} = ?`).join(" AND ")})`).join(" OR ");
    const [r] = await conn.query(
      `SELECT * FROM ${ident(table)} WHERE ${cond}`,
      chunk.flatMap((row) => keyCols.map((c) => toDb(def, c, row[c]))),
    );
    found.push(...(r as Row[]));
  }
  return found;
}

const keyOf = (row: Row, cols: string[]) => cols.map((c) => String(row[c])).join("\u0000");

async function doInsert(req: DbRequest, user: SessionUser | null): Promise<DbResponse> {
  const def = TABLES[req.table];
  const input = normaliseRows(def, req.table, req.values);
  await checkWrite(req, user, input);

  const upsert = req.action === "upsert";
  const conflictCols = upsert ? (req.onConflict ?? "id").split(",").map((c) => c.trim()) : ["id"];
  conflictCols.forEach((c) => assertColumn(def, req.table, c));

  return transaction(async (conn) => {
    const before = upsert ? await findByKeys(conn, req.table, input, conflictCols) : [];
    const beforeMap = new Map(before.map((r) => [keyOf(r, conflictCols), r]));

    // New rows get an id here so they can be read back; rows an upsert will update keep theirs.
    const rows = input.map((r) =>
      r.id !== undefined || beforeMap.has(keyOf(r, conflictCols)) ? r : { ...r, id: randomUUID() },
    );

    await insertRows(conn, req.table, rows, upsert ? (req.ignoreDuplicates ? "ignore" : "upsert") : "insert", conflictCols);
    const after = upsert
      ? await findByKeys(conn, req.table, rows, conflictCols)
      : await fetchByIds(conn, req.table, rows.map((r) => r.id));

    if (def.audited && user) {
      const changes = after.flatMap((next): Change[] => {
        const old = beforeMap.get(keyOf(next, conflictCols));
        if (!old) return [{ action: "added", next }];
        return req.ignoreDuplicates ? [] : [{ action: "edited", old, next }];
      });
      await logChanges(conn, req.table, user.id, changes);
    }
    return { status: 201, data: req.returning ? after.map((r) => fromDb(def, r)) : null, error: null };
  });
}

async function doUpdate(req: DbRequest, user: SessionUser | null): Promise<DbResponse> {
  const def = TABLES[req.table];
  const values = normaliseRows(def, req.table, req.values)[0] ?? {};
  if (!req.filters?.length) throw new ApiError(400, "21000", "UPDATE requires a WHERE clause");
  await checkWrite(req, user, [values]);

  const extra = req.table === "profiles" && !(await hasRole(user!.id, "admin")) ? [{ sql: "`id` = ?", params: [user!.id] }] : [];
  const where = whereClause(def, req, extra);
  const cols = Object.keys(values).filter((c) => c !== "id");
  if (def.updatedAt && !cols.includes("updated_at")) cols.push("updated_at");
  const set = cols.map((c) => (c === "updated_at" && values.updated_at === undefined ? "`updated_at` = CURRENT_TIMESTAMP(6)" : `${ident(c)} = ?`));
  const params = cols.filter((c) => !(c === "updated_at" && values.updated_at === undefined)).map((c) => toDb(def, c, values[c]));

  return transaction(async (conn) => {
    const [oldRows] = await conn.query(`SELECT * FROM ${ident(req.table)}${where.sql} FOR UPDATE`, where.params);
    const old = oldRows as Row[];
    if (!old.length || !set.length) return { status: 200, data: req.returning ? [] : null, error: null };
    const ids = old.map((r) => r.id);
    await conn.query(`UPDATE ${ident(req.table)} SET ${set.join(", ")} WHERE id IN (${ids.map(() => "?").join(", ")})`, [
      ...params,
      ...ids,
    ]);
    const after = await fetchByIds(conn, req.table, ids);
    if (def.audited) {
      const oldMap = new Map(old.map((r) => [r.id, r]));
      await logChanges(conn, req.table, user!.id, after.map((next) => ({ action: "edited" as const, old: oldMap.get(next.id), next })));
    }
    return { status: 200, data: req.returning ? after.map((r) => fromDb(def, r)) : null, error: null };
  });
}

async function doDelete(req: DbRequest, user: SessionUser | null): Promise<DbResponse> {
  const def = TABLES[req.table];
  if (!req.filters?.length) throw new ApiError(400, "21000", "DELETE requires a WHERE clause");
  await checkWrite(req, user, []);
  const where = whereClause(def, req);

  return transaction(async (conn) => {
    const [oldRows] = await conn.query(`SELECT * FROM ${ident(req.table)}${where.sql} FOR UPDATE`, where.params);
    const old = oldRows as Row[];
    if (!old.length) return { status: 200, data: req.returning ? [] : null, error: null };
    const ids = old.map((r) => r.id);

    // Log rows that go with it through ON DELETE CASCADE, as the Postgres triggers did.
    for (const child of CASCADES[req.table] ?? []) {
      if (!TABLES[child.table].audited) continue;
      const [kids] = await conn.query(
        `SELECT * FROM ${ident(child.table)} WHERE ${ident(child.fk)} IN (${ids.map(() => "?").join(", ")})`,
        ids,
      );
      await logChanges(conn, child.table, user!.id, (kids as Row[]).map((k) => ({ action: "removed" as const, old: k })));
    }

    await conn.query(`DELETE FROM ${ident(req.table)} WHERE id IN (${ids.map(() => "?").join(", ")})`, ids);
    if (def.audited) await logChanges(conn, req.table, user!.id, old.map((o) => ({ action: "removed" as const, old: o })));
    return { status: 200, data: req.returning ? old.map((r) => fromDb(def, r)) : null, error: null };
  });
}

function applySingle(req: DbRequest, res: DbResponse): DbResponse {
  if (!req.single || res.error || !Array.isArray(res.data)) return res;
  const rows = res.data as Row[];
  if (rows.length === 1) return { ...res, data: rows[0] };
  if (rows.length === 0 && req.single === "maybe") return { ...res, data: null };
  return {
    status: 406,
    data: null,
    error: {
      code: "PGRST116",
      message: "JSON object requested, multiple (or no) rows returned",
      details: `The result contains ${rows.length} rows`,
      hint: null,
    },
  };
}

export async function handleDbRequest(req: DbRequest, user: SessionUser | null): Promise<DbResponse> {
  try {
    const def = TABLES[req.table];
    if (!def) throw new ApiError(404, "42P01", `relation "public.${req.table}" does not exist`);
    let res: DbResponse;
    switch (req.action) {
      case "select":
        res = await doSelect(req, user);
        break;
      case "insert":
      case "upsert":
        res = await doInsert(req, user);
        break;
      case "update":
        res = await doUpdate(req, user);
        break;
      case "delete":
        res = await doDelete(req, user);
        break;
      default:
        throw new ApiError(400, "PGRST100", "Unknown action");
    }
    return applySingle(req, res);
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, data: null, error: { message: e.message, code: e.code, details: null, hint: null } };
    const err = e as { code?: string; sqlMessage?: string; message?: string };
    console.error("db api error", req.table, req.action, err);
    const duplicate = err.code === "ER_DUP_ENTRY";
    return {
      status: duplicate ? 409 : 500,
      data: null,
      error: {
        message: duplicate ? `duplicate key value violates unique constraint: ${err.sqlMessage}` : (err.sqlMessage ?? err.message ?? "Database error"),
        code: duplicate ? "23505" : (err.code ?? "XX000"),
        details: null,
        hint: null,
      },
    };
  }
}
