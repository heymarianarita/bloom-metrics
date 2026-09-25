import { getCredential } from "../credentials.ts";
import { execute, query, toIso } from "../db.ts";
import { canEdit } from "../auth.ts";
import type { FnHandler } from "./types.ts";

/**
 * Lists GetDX teams (with parent chain) plus historic team names from past
 * DX snapshots, so renamed/merged teams can still be placed in the tree.
 *
 * Served from a copy in integration_cache, refreshed monthly (see index.ts) or
 * on demand by an editor with ?refresh=1, so pages don't wait on GetDX.
 */
const json = (body: unknown) => ({ status: 200, body });

type Historic = { name: string; path: string[]; seen: string };
let historicCache: { at: number; data: Historic[] } | null = null;

const dx = async (token: string, method: string) => {
  const r = await fetch(`https://api.getdx.com/${method}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body: any = await r.json().catch(() => ({}));
  return { ok: r.ok && body.ok !== false, body, status: r.status };
};

/** Team name → names of its ancestors (top → itself) as they were in each snapshot; newest wins. */
const loadHistoric = async (token: string): Promise<Historic[]> => {
  if (historicCache && Date.now() - historicCache.at < 6 * 3600 * 1000) return historicCache.data;
  const list = await dx(token, "snapshots.list");
  if (!list.ok) return [];
  const snaps = ((list.body.snapshots ?? []) as Record<string, unknown>[])
    .filter((s) => !s.deleted_at)
    .sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)));
  const out = new Map<string, Historic>();
  const results = await Promise.all(
    snaps.map((s) => dx(token, `snapshots.info?snapshot_id=${s.id}`).then((r) => ({ s, r }))),
  );
  for (const { s, r } of results) {
    if (!r.ok) continue;
    const scores = (r.body.snapshot?.team_scores ?? []) as { snapshot_team: Record<string, unknown> }[];
    const names = new Map<string, string>();
    const teams = new Map<string, Record<string, unknown>>();
    scores.forEach(({ snapshot_team: t }) => {
      if (!t) return;
      names.set(String(t.id), String(t.name));
      teams.set(String(t.id), t);
    });
    teams.forEach((t) => {
      // Snapshot ancestors come as [root, self, parent, grandparent…]; return top → self.
      const raw = ((t.ancestors ?? []) as string[]).map((id) => names.get(id)).filter(Boolean) as string[];
      const path = raw.slice(1).reverse();
      if (!path.length) return;
      out.set(String(t.name).toLowerCase(), { name: String(t.name), path, seen: String(s.scheduled_for) });
    });
  }
  const data = Array.from(out.values());
  historicCache = { at: Date.now(), data };
  return data;
};

type Team = {
  id: string;
  name: string;
  parentId: string | null;
  isParent: boolean;
  contributors: number;
  lead: string | null;
};
type Cached = { teams: Team[]; historic: Historic[]; fetchedAt: string };

const CACHE_KEY = "getdx_teams";

async function readCache(): Promise<Cached | null> {
  const rows = await query<{ payload: { teams: Team[]; historic: Historic[] }; fetched_at: string }>(
    "SELECT payload, fetched_at FROM integration_cache WHERE cache_key = ?",
    [CACHE_KEY],
  );
  if (!rows[0]) return null;
  return { teams: rows[0].payload.teams ?? [], historic: rows[0].payload.historic ?? [], fetchedAt: String(toIso(rows[0].fetched_at)) };
}

/** Fetches the team tree and snapshot history from GetDX and stores the copy. */
export async function refreshGetdxTeams(): Promise<Cached> {
  const token = await getCredential("GETDX_API_TOKEN");
  if (!token) throw new Error("No GetDX token saved.");
  const res = await dx(token, "teams.list");
  if (!res.ok) throw new Error(res.body.error ?? `GetDX returned ${res.status}`);
  const teams: Team[] = (res.body.teams ?? []).map((t: Record<string, unknown>) => ({
    id: String(t.id ?? ""),
    name: String(t.name ?? ""),
    parentId: t.parent_id ? String(t.parent_id) : null,
    isParent: Boolean(t.parent),
    contributors: Number(t.contributors ?? 0),
    lead: (t.manager_name as string) ?? ((t.lead as Record<string, unknown>)?.name as string) ?? null,
  }));
  historicCache = null;
  const historic = await loadHistoric(token).catch(() => []);
  await execute(
    `INSERT INTO integration_cache (cache_key, payload, fetched_at) VALUES (?, CAST(? AS JSON), CURRENT_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = VALUES(fetched_at)`,
    [CACHE_KEY, JSON.stringify({ teams, historic })],
  );
  return (await readCache())!;
}

/** Days since the stored copy was fetched (Infinity when there is none). */
export async function getdxTeamsAgeDays() {
  const cached = await readCache();
  return cached ? (Date.now() - new Date(cached.fetchedAt).getTime()) / 86_400_000 : Infinity;
}

const handler: FnHandler = async (req) => {
  const wantHistoric = req.query.get("historic") === "1";
  const forceRefresh = req.query.get("refresh") === "1" && (await canEdit(req.user?.id));
  let cached = await readCache();
  let refreshError: string | undefined;

  if (!cached || forceRefresh) {
    try {
      cached = await refreshGetdxTeams();
    } catch (e) {
      refreshError = e instanceof Error ? e.message : "Request failed";
    }
  }
  if (!cached) return json({ ok: false, error: refreshError, teams: [], historic: [] });
  return json({
    ok: true,
    teams: cached.teams,
    historic: wantHistoric ? cached.historic : [],
    fetchedAt: cached.fetchedAt,
    ...(refreshError ? { refreshError } : {}),
  });
};

export default handler;
