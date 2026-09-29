import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { canEdit } from "../auth.ts";
import { getCredential } from "../credentials.ts";
import { execute, nowMysql, query, toIso, toMysqlDatetime } from "../db.ts";
import { localDevFlag } from "../devmode.ts";
import { authenticateCronRequest } from "./cron-auth.ts";
import type { FnHandler, FnResponse } from "./types.ts";

/**
 * Code adoption: Bloom usage in product repos, from the ds-analyzer reports that
 * a design-system repo commits weekly, one JSON file per scanned product repo.
 *
 * Each report commit is stored as one row in `code_adoption_snapshots`, keyed by
 * (repo, generated_at). The first sync also walks the file's commit history, so the
 * trend starts with every past scan rather than only the latest one.
 *
 * GET                                              -> stored history + latest breakdown
 * POST (editor, or Bearer <CRON_SECRET>)           -> sync from GitHub now
 *
 * Settings → Dynamic sources → "Code adoption":
 *   GITHUB_TOKEN (credential) — fine-grained token, Contents: read-only on every repository used
 *   config.reports            — [{repository, branch, path, metricGroupId}], one per product repo;
 *                               metricGroupId is the metric (sub)group whose page shows it
 *
 * Local development only: CODE_ADOPTION_LOCAL_FILE=/path/to/report.json syncs from disk.
 */

const SOURCE_KEY = "code_adoption";
/** Report versions fetched per sync; the rest of the history follows on later runs. */
const MAX_FETCHES_PER_RUN = 60;

const json = (body: unknown, status = 200): FnResponse => ({ status, body });

/** One report file, the repository it lives in, and the metric (sub)group it's shown in. */
export interface ReportSource { repository: string; branch: string; path: string; metricGroupId: string | null }

const DEFAULT_BRANCH = "master";

const cleanRepository = (v: string) => v.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");

async function readReports(): Promise<ReportSource[]> {
  const rows = await query<{ config: Record<string, unknown> | null }>(
    "SELECT config FROM data_source_configs WHERE source_key = ?",
    [SOURCE_KEY],
  ).catch(() => []);
  const saved = rows[0]?.config ?? {};
  if (!Array.isArray(saved.reports)) return [];
  return (saved.reports as Record<string, unknown>[])
    .map((r) => ({
      repository: cleanRepository(String(r?.repository ?? "")),
      branch: String(r?.branch ?? "").trim() || DEFAULT_BRANCH,
      path: String(r?.path ?? "").trim().replace(/^\//, ""),
      metricGroupId: r?.metricGroupId ? String(r.metricGroupId) : null,
    }))
    .filter((r) => r.repository && r.path);
}

/** The product repo a report is about, from its file name: "path/to/checkout-web-report.json" → "checkout-web". */
const repoOf = (path: string) => (path.split("/").pop() ?? path).replace(/(-report)?\.json$/, "");

const pct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the report is external JSON, checked field by field
type Json = any;

type Usage = { dsElementUsage?: number; greenhouseTaggedUsage?: number; nativeElementUsage?: number; untaggedCustomUsage?: number };

/** Keeps what the pages use; drops file-level listings (paths inside the scanner's temp dir). */
function parseReport(report: Json) {
  const s = report?.summary;
  if (!s || typeof s !== "object" || pct(s.dsPercent) === null) {
    throw new Error("Not a ds-analyzer report (summary.dsPercent missing)");
  }
  const generatedAt = report.metadata?.generatedAt ?? s.generatedAt;
  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) throw new Error("Report has no generatedAt date");

  const usage = (u: Usage | undefined) => ({
    ds: num(u?.dsElementUsage),
    greenhouse: num(u?.greenhouseTaggedUsage),
    native: num(u?.nativeElementUsage),
    untagged: num(u?.untaggedCustomUsage),
  });

  const domains = ((report.domains ?? []) as Json[]).map((d) => ({
    domain: String(d.domain ?? "unknown"),
    fileCount: num(d.fileCount),
    elements: usage(d.compositionAware ?? d.direct),
    dsPercent: pct(d.dsPercent),
    nativePercent: pct(d.nativePercent),
    taggedPercent: pct(d.taggedPercent),
    untaggedCustomPercent: pct(d.untaggedCustomPercent),
  }));

  // Every registered Greenhouse component, including the ones nobody uses yet.
  const counts = new Map<string, number>();
  for (const r of (report.greenhouseRegistry ?? []) as Json[]) if (r?.name) counts.set(String(r.name), 0);
  for (const u of (report.greenhouseComponentUsage ?? []) as Json[]) {
    if (u?.componentName) counts.set(String(u.componentName), num(u.count));
  }
  const greenhouse = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return {
    generatedAt: String(generatedAt),
    totalFiles: num(s.totalFiles),
    dsPercent: pct(s.dsPercent),
    nativePercent: pct(s.nativePercent),
    taggedPercent: pct(s.taggedPercent),
    untaggedPercent: pct(s.untaggedCustomPercent),
    summary: {
      totalFiles: num(s.totalFiles),
      filesWithJsx: num(s.filesWithJsx),
      filesScanned: num(report.metadata?.filesScanned),
      filesFailed: num(report.metadata?.filesFailed),
      dsCompositionsDetected: num(s.dsCompositionsDetected),
      greenhouseRegistrySize: num(s.greenhouseRegistrySize),
      elements: usage(s.compositionAware ?? s.direct),
      files: {
        ds: num((s.compositionAware ?? s.direct)?.dsFiles),
        greenhouse: num((s.compositionAware ?? s.direct)?.greenhouseTaggedFiles),
        untagged: num((s.compositionAware ?? s.direct)?.untaggedCustomFiles),
      },
    },
    domains,
    greenhouse,
  };
}

async function storeReport(repo: string, sourcePath: string, commitSha: string | null, report: unknown) {
  const r = parseReport(report);
  await execute(
    `INSERT INTO code_adoption_snapshots
       (id, repo, source_path, commit_sha, generated_at, total_files, ds_percent, native_percent, tagged_percent,
        untagged_percent, summary, domains, greenhouse_usage, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE
       source_path = VALUES(source_path), commit_sha = COALESCE(VALUES(commit_sha), commit_sha),
       total_files = VALUES(total_files), ds_percent = VALUES(ds_percent), native_percent = VALUES(native_percent),
       tagged_percent = VALUES(tagged_percent), untagged_percent = VALUES(untagged_percent),
       summary = VALUES(summary), domains = VALUES(domains), greenhouse_usage = VALUES(greenhouse_usage),
       captured_at = VALUES(captured_at)`,
    [
      randomUUID(), repo, sourcePath, commitSha, toMysqlDatetime(r.generatedAt), r.totalFiles, r.dsPercent,
      r.nativePercent, r.taggedPercent, r.untaggedPercent, JSON.stringify(r.summary), JSON.stringify(r.domains),
      JSON.stringify(r.greenhouse), nowMysql(),
    ],
  );
  return r.generatedAt;
}

async function github(token: string, path: string, raw = false) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "bloom-metrics",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 200);
    try {
      message = JSON.parse(text).message ?? message;
    } catch { /* not JSON */ }
    const hint =
      res.status === 401 ? " — the GitHub token is invalid or expired"
      : res.status === 403 || res.status === 404 ? " — check the token has Contents: read access to this repository (and that the org approved it)"
      : "";
    throw new Error(`GitHub ${res.status}: ${message}${hint}`);
  }
  return raw ? text : JSON.parse(text);
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/** Stores every version of one report that isn't stored yet, newest first. */
async function syncReport(token: string, cfg: ReportSource, budget: { left: number }) {
  const { path } = cfg;
  const repo = repoOf(path);
  const commits = (await github(
    token,
    `/repos/${cfg.repository}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(cfg.branch)}&per_page=100`,
  )) as { sha: string }[];
  if (commits.length === 0) throw new Error(`${path} not found on ${cfg.branch} in ${cfg.repository}`);

  const stored = await query<{ commit_sha: string }>(
    "SELECT commit_sha FROM code_adoption_snapshots WHERE repo = ? AND commit_sha IS NOT NULL",
    [repo],
  );
  const unreadable = await readUnreadable();
  const have = new Set([...stored.map((r) => r.commit_sha), ...unreadable]);
  const todo = commits.filter((c) => !have.has(c.sha));
  let added = 0;
  let skipped = 0;
  for (const { sha } of todo) {
    if (budget.left <= 0) break;
    budget.left--;
    let report: unknown;
    try {
      report = JSON.parse(await github(token, `/repos/${cfg.repository}/contents/${encodePath(path)}?ref=${sha}`, true));
    } catch (e) {
      // Network or GitHub trouble: stop here and retry on the next run.
      if (added === 0) throw e;
      break;
    }
    try {
      await storeReport(repo, path, sha, report);
      added++;
    } catch (e) {
      // Old versions may predate the current report format: remember them so they aren't fetched again.
      skipped++;
      unreadable.add(sha);
      console.warn(`code adoption: skipped ${path}@${sha.slice(0, 7)}:`, e instanceof Error ? e.message : e);
    }
  }
  if (skipped) await saveUnreadable(unreadable);
  return { repo, added, skipped, versions: commits.length, remaining: todo.length - added - skipped };
}

const UNREADABLE_KEY = "code_adoption_unreadable";

async function readUnreadable() {
  const rows = await query<{ payload: string[] }>("SELECT payload FROM integration_cache WHERE cache_key = ?", [UNREADABLE_KEY]);
  return new Set(Array.isArray(rows[0]?.payload) ? rows[0].payload : []);
}

const saveUnreadable = (shas: Set<string>) =>
  execute(
    `INSERT INTO integration_cache (cache_key, payload, fetched_at) VALUES (?, CAST(? AS JSON), CURRENT_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = VALUES(fetched_at)`,
    [UNREADABLE_KEY, JSON.stringify([...shas])],
  );

const logRun = (status: string, message: string, rowCount: number, triggeredBy: string) =>
  execute(
    "INSERT INTO sync_runs (id, source_key, status, message, row_count, triggered_by, ran_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [randomUUID(), SOURCE_KEY, status, message, rowCount, triggeredBy, nowMysql()],
  ).catch((e) => console.error("could not log code adoption sync", e));

/** Pulls new report versions from GitHub. Used by the scheduler and the "Sync now" button. */
export async function syncCodeAdoption(triggeredBy = "automatic"): Promise<FnResponse> {
  const localFile = localDevFlag("CODE_ADOPTION_LOCAL_FILE") ? process.env.CODE_ADOPTION_LOCAL_FILE!.trim() : "";
  if (localFile) {
    const generatedAt = await storeReport(repoOf(localFile), localFile, null, JSON.parse(readFileSync(localFile, "utf8")));
    return json({ ok: true, local: true, results: [{ repo: repoOf(localFile), added: 1, generatedAt }] });
  }

  const token = await getCredential("GITHUB_TOKEN");
  if (!token) {
    return json({ ok: false, configured: false, error: "No GitHub token saved. Add one in Settings → Dynamic sources → Code adoption." }, 503);
  }
  const budget = { left: MAX_FETCHES_PER_RUN };
  const results: Record<string, unknown>[] = [];
  for (const report of await readReports()) {
    try {
      results.push({ ok: true, ...(await syncReport(token, report, budget)) });
    } catch (e) {
      results.push({ ok: false, repo: repoOf(report.path), error: e instanceof Error ? e.message : String(e) });
    }
  }
  const added = results.reduce((n, r) => n + Number(r.added ?? 0), 0);
  const errors = results.filter((r) => !r.ok).map((r) => `${r.repo}: ${r.error}`);
  const ok = errors.length === 0;
  const message = ok
    ? added ? `${added} new report${added === 1 ? "" : "s"} stored` : "Already up to date"
    : errors.join("; ");
  await logRun(ok ? "success" : "error", message, added, triggeredBy);
  return json({ ok, added, results, ...(ok ? {} : { error: message }) }, ok ? 200 : 502);
}

type SnapshotRow = {
  repo: string;
  commit_sha: string | null;
  generated_at: string;
  total_files: number | null;
  ds_percent: number | null;
  native_percent: number | null;
  tagged_percent: number | null;
  untagged_percent: number | null;
  summary: unknown;
  domains?: unknown;
  greenhouse_usage?: unknown;
};

async function readHistory() {
  const rows = await query<SnapshotRow>(
    "SELECT repo, commit_sha, generated_at, total_files, ds_percent, native_percent, tagged_percent, untagged_percent, summary " +
      "FROM code_adoption_snapshots ORDER BY repo, generated_at",
  );
  const repos = [...new Set(rows.map((r) => r.repo))];
  const detail = async (repo: string, offset: number) =>
    (await query<SnapshotRow>(
      "SELECT repo, generated_at, domains, greenhouse_usage FROM code_adoption_snapshots WHERE repo = ? ORDER BY generated_at DESC LIMIT 1 OFFSET ?",
      [repo, offset],
    ))[0] ?? null;
  const out = [];
  for (const repo of repos) {
    const [latest, previous] = await Promise.all([detail(repo, 0), detail(repo, 1)]);
    out.push({
      repo,
      snapshots: rows.filter((r) => r.repo === repo).map((r) => ({ ...r, generated_at: toIso(r.generated_at) })),
      latest: latest && { generated_at: toIso(latest.generated_at), domains: latest.domains, greenhouse: latest.greenhouse_usage },
      previous: previous && { generated_at: toIso(previous.generated_at), domains: previous.domains, greenhouse: previous.greenhouse_usage },
    });
  }
  return out;
}

const handler: FnHandler = async (req) => {
  if (req.method === "GET") {
    try {
      const [repos, lastRun, token, reports] = await Promise.all([
        readHistory(),
        query<{ status: string; message: string; ran_at: string }>(
          "SELECT status, message, ran_at FROM sync_runs WHERE source_key = ? ORDER BY ran_at DESC LIMIT 1",
          [SOURCE_KEY],
        ),
        getCredential("GITHUB_TOKEN"),
        readReports(),
      ]);
      // Each stored repo is shown in the (sub)group its report file is pointed at.
      const groupOf = new Map(reports.map((r) => [repoOf(r.path), r]));
      return json({
        configured: Boolean(token) || localDevFlag("CODE_ADOPTION_LOCAL_FILE"),
        reports,
        lastRun: lastRun[0] ? { ...lastRun[0], ran_at: toIso(lastRun[0].ran_at) } : null,
        repos: repos.map((r) => ({
          ...r,
          repository: groupOf.get(r.repo)?.repository ?? null,
          metricGroupId: groupOf.get(r.repo)?.metricGroupId ?? null,
        })),
      });
    } catch (e) {
      return json({ error: "Could not read code adoption", details: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  if (req.user) {
    if (!(await canEdit(req.user.id))) return json({ error: "Only editors can sync" }, 403);
    return syncCodeAdoption(req.user.email ?? "manual");
  }
  const unauthorized = authenticateCronRequest(req);
  if (unauthorized) return unauthorized;
  return syncCodeAdoption();
};

export default handler;
