/**
 * Read-only SQL against GetDX's Data Cloud, through the Web API's Data Studio query runs
 * (`studio.queryRuns.*`, token scope `datacloud:query`). Runs are asynchronous: start one,
 * wait for it to finish, then read its rows.
 */

const API = "https://api.getdx.com";
/** JSON results are cut off at this many rows; `queryAll` pages past it. */
const PAGE = 1000;

type Body = { ok?: boolean; error?: string; query_run?: { id?: string; status?: string; error?: string }; results?: { columns?: string[]; rows?: unknown[][] } };

const call = async (token: string, method: string, init?: RequestInit): Promise<Body> => {
  const r = await fetch(`${API}/${method}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
  });
  const body = (await r.json().catch(() => ({}))) as Body;
  if (!r.ok || body.ok === false) throw new Error(body.error ?? `GetDX returned ${r.status}`);
  return body;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Rows of one query as objects keyed by column name (at most 1000). */
export async function query(token: string, sql: string, timeoutMs = 60_000): Promise<Record<string, unknown>[]> {
  const started = await call(token, "studio.queryRuns.execute", { method: "POST", body: JSON.stringify({ sql }) });
  const id = started.query_run?.id;
  if (!id) throw new Error("GetDX did not start the query");
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await call(token, `studio.queryRuns.info?id=${encodeURIComponent(id)}`);
    const status = info.query_run?.status ?? "";
    if (status === "succeeded") break;
    if (status !== "queued" && status !== "running") throw new Error(info.query_run?.error || `GetDX query ${status || "failed"}`);
    if (Date.now() > deadline) throw new Error("GetDX took too long to answer");
    await sleep(1000);
  }
  const { results } = await call(token, `studio.queryRuns.results?id=${encodeURIComponent(id)}`);
  const columns = results?.columns ?? [];
  return (results?.rows ?? []).map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

/** Every row of a query that has a stable ORDER BY and no LIMIT of its own. */
export async function queryAll(token: string, sql: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await query(token, `${sql} LIMIT ${PAGE} OFFSET ${offset}`);
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}
