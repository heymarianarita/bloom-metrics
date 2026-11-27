import { getCredential } from "../credentials.ts";
import { execute, query } from "../db.ts";

/**
 * Profile pictures from GetDX, by lowercase email. GetDX has no lookup by email and `users.list`
 * carries no picture, so the directory is built from every team's lead and contributors
 * (`teams.info`). Kept in integration_cache so pages don't wait on GetDX; rebuilt after a month,
 * or after a day when someone asked for isn't in it yet.
 */

const CACHE_KEY = "getdx_avatars";
const MAX_AGE_MS = 30 * 86_400_000;
const RETRY_MISSING_MS = 86_400_000;

type Directory = { at: number; byEmail: Record<string, string> };
type Person = { email?: unknown; avatar?: unknown };
type DxBody = {
  ok?: boolean;
  error?: string;
  teams?: { id?: unknown }[];
  team?: { lead?: Person; contributors?: Person[] };
};

const dx = async (token: string, method: string) => {
  const r = await fetch(`https://api.getdx.com/${method}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = (await r.json().catch(() => ({}))) as DxBody;
  if (!r.ok || body.ok === false) throw new Error(body.error ?? `GetDX returned ${r.status}`);
  return body;
};

async function buildDirectory(token: string): Promise<Directory> {
  const { teams = [] } = await dx(token, "teams.list");
  const byEmail: Record<string, string> = {};
  const add = (p: Person | undefined) => {
    const email = typeof p?.email === "string" ? p.email.trim().toLowerCase() : "";
    const url = typeof p?.avatar === "string" && /^https:\/\//.test(p.avatar) ? p.avatar : "";
    if (email && (url || !(email in byEmail))) byEmail[email] = url;
  };
  const ids = teams.map((t) => String(t.id ?? "")).filter(Boolean);
  for (let i = 0; i < ids.length; i += 8) {
    const infos = await Promise.all(
      ids.slice(i, i + 8).map((id) => dx(token, `teams.info?team_id=${encodeURIComponent(id)}`).catch(() => null)),
    );
    infos.forEach((info) => {
      add(info?.team?.lead);
      (info?.team?.contributors ?? []).forEach(add);
    });
  }
  return { at: Date.now(), byEmail };
}

export async function getdxAvatars(emails: string[]): Promise<Record<string, string>> {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!wanted.length) return {};
  const rows = await query<{ payload: unknown }>("SELECT payload FROM integration_cache WHERE cache_key = ?", [CACHE_KEY]);
  const raw = rows[0]?.payload;
  const parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<Directory> | null;
  let dir: Directory = { at: Number(parsed?.at) || 0, byEmail: parsed?.byEmail ?? {} };

  const age = Date.now() - dir.at;
  const missing = wanted.some((e) => !(e in dir.byEmail));
  if (age > MAX_AGE_MS || (missing && age > RETRY_MISSING_MS)) {
    const token = await getCredential("GETDX_API_TOKEN");
    if (token) {
      dir = await buildDirectory(token);
      await execute(
        `INSERT INTO integration_cache (cache_key, payload, fetched_at) VALUES (?, CAST(? AS JSON), CURRENT_TIMESTAMP(6))
         ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = VALUES(fetched_at)`,
        [CACHE_KEY, JSON.stringify(dir)],
      );
    }
  }
  return Object.fromEntries(wanted.map((e) => [e, dir.byEmail[e] ?? ""]));
}
