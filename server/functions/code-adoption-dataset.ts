import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { transaction } from "../db.ts";
import { reportRepo } from "../shared/codeAdoptionCharts.ts";

/**
 * Code adoption as ordinary datasets, so metrics and Views treat it like any other data.
 * For each GitHub report (Settings → Dynamic sources), rebuilt from `code_adoption_snapshots`
 * after every sync:
 *   - "Code adoption · <repo>": one row per scan, with the report's own UI element totals
 *   - "Code adoption by domain · <repo>": one row per scan and domain (domains overlap a little,
 *     so their sums differ slightly from the totals; page-level shares read the totals)
 *   - "Greenhouse components · <repo>": one row per scan and registered Greenhouse component
 * Both are synced (entry_method "github"): nobody edits their rows by hand.
 */

export const codeDatasetSlug = (repo: string) => `code-adoption-${repo}`;
export const domainDatasetSlug = (repo: string) => `code-adoption-domains-${repo}`;
export const greenhouseDatasetSlug = (repo: string) => `greenhouse-${repo}`;

/** Stable keys: metrics and views refer to them. "Domain", not "Team": team columns are mapped to GetDX business units. */
export const CODE_COLUMNS = [
  { key: "scanned", label: "Scan date", kind: "date" },
  { key: "files", label: "Files", kind: "number" },
  { key: "bloom", label: "Bloom elements", kind: "number" },
  { key: "greenhouse", label: "Greenhouse-tagged elements", kind: "number" },
  { key: "native", label: "Native HTML elements", kind: "number" },
  { key: "untagged", label: "Untagged custom elements", kind: "number" },
  { key: "elements", label: "All UI elements", kind: "number" },
] as const;

export const DOMAIN_COLUMNS = [
  { key: "scanned", label: "Scan date", kind: "date" },
  { key: "domain", label: "Domain", kind: "text" },
  { key: "files", label: "Files", kind: "number" },
  { key: "bloom", label: "Bloom elements", kind: "number" },
  { key: "greenhouse", label: "Greenhouse-tagged elements", kind: "number" },
  { key: "native", label: "Native HTML elements", kind: "number" },
  { key: "untagged", label: "Untagged custom elements", kind: "number" },
  { key: "elements", label: "All UI elements", kind: "number" },
] as const;

export const GREENHOUSE_COLUMNS = [
  { key: "scanned", label: "Scan date", kind: "date" },
  { key: "component", label: "Component", kind: "text" },
  { key: "usages", label: "Usages", kind: "number" },
] as const;

type Run = (sql: string, params?: unknown[]) => Promise<unknown[]>;
type Column = { key: string; label: string; kind: string };

const parse = <T,>(v: unknown, fallback: T): T => (typeof v === "string" ? (JSON.parse(v) as T) : ((v as T) ?? fallback));

/** Creates the dataset and its columns if missing; returns its id. */
async function ensureDataset(
  run: Run,
  slug: string,
  name: string,
  description: string,
  columns: readonly Column[],
): Promise<string> {
  const found = (await run("SELECT id FROM manual_datasets WHERE slug = ?", [slug])) as { id: string }[];
  const id = found[0]?.id ?? randomUUID();
  if (!found.length) {
    await run(
      `INSERT INTO manual_datasets (id, slug, name, description, entry_method, entry_notes, sort_order)
       VALUES (?, ?, ?, ?, 'github', ?, 999)`,
      [
        id,
        slug,
        name,
        description,
        "Synced from the ds-analyzer report on GitHub after every code adoption sync (daily). Reports are set in Settings → Dynamic sources.",
      ],
    );
  }
  for (const [i, c] of columns.entries()) {
    await run(
      `INSERT INTO manual_dataset_columns (id, dataset_id, \`key\`, label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), kind = VALUES(kind), sort_order = VALUES(sort_order)`,
      [randomUUID(), id, c.key, c.label, c.kind, i],
    );
  }
  return id;
}

async function replaceRows(run: Run, datasetId: string, rows: Record<string, unknown>[]) {
  await run("DELETE FROM manual_dataset_rows WHERE dataset_id = ?", [datasetId]);
  const values = rows.map((data, i) => [randomUUID(), datasetId, JSON.stringify(data), i]);
  for (let i = 0; i < values.length; i += 500) {
    await run("INSERT INTO manual_dataset_rows (id, dataset_id, data, sort_order) VALUES ?", [values.slice(i, i + 500)]);
  }
  await run("UPDATE manual_datasets SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [datasetId]);
}

interface Snapshot {
  repo: string;
  generated_at: string | Date;
  summary: unknown;
  domains: unknown;
  greenhouse_usage: unknown;
}

/** DATETIME(6) in UTC, as a string ('2026-10-27 08:00:00.000000') or a Date. */
const asDate = (v: string | Date) => (v instanceof Date ? v : new Date(`${String(v).replace(" ", "T")}Z`));

type Elements = { ds?: number; greenhouse?: number; native?: number; untagged?: number };

/** Rebuilds every report's datasets from the stored snapshots. Safe to run any time. */
export async function syncCodeAdoptionDatasetsWith(conn: PoolConnection): Promise<Record<string, number>> {
  const run: Run = async (sql, params = []) => (await conn.query(sql, params))[0] as unknown[];
  const [config] = (await run("SELECT config FROM data_source_configs WHERE source_key = 'code_adoption'")) as { config: unknown }[];
  const reports = parse<{ reports?: { path?: string }[] }>(config?.config, {}).reports ?? [];
  const repos = [...new Set(reports.filter((r) => r.path).map((r) => reportRepo(String(r.path))))];
  const counts: Record<string, number> = {};

  for (const repo of repos) {
    // No ORDER BY: sorting rows that carry large JSON overruns MySQL's sort buffer.
    const snapshots = (
      (await run("SELECT repo, generated_at, summary, domains, greenhouse_usage FROM code_adoption_snapshots WHERE repo = ?", [repo])) as Snapshot[]
    )
      .map((s) => ({ ...s, scanned: asDate(s.generated_at) }))
      .sort((a, b) => a.scanned.getTime() - b.scanned.getTime());
    // One scan per day (the latest), so totals aren't counted twice.
    const byDay = new Map<string, Snapshot>();
    for (const s of snapshots) byDay.set(s.scanned.toISOString().slice(0, 10), s);

    const codeRows: Record<string, unknown>[] = [];
    const domainRows: Record<string, unknown>[] = [];
    const greenhouseRows: Record<string, unknown>[] = [];
    const kinds = (e: Elements) => {
      const [bloom, greenhouse, native, untagged] = [e.ds ?? 0, e.greenhouse ?? 0, e.native ?? 0, e.untagged ?? 0];
      return { bloom, greenhouse, native, untagged, elements: bloom + greenhouse + native + untagged };
    };
    for (const [scanned, s] of byDay) {
      const summary = parse<{ totalFiles?: number; elements?: Elements }>(s.summary, {});
      codeRows.push({ scanned, files: summary.totalFiles ?? 0, ...kinds(summary.elements ?? {}) });
      for (const d of parse<{ domain?: string; fileCount?: number; elements?: Elements }[]>(s.domains, [])) {
        domainRows.push({ scanned, domain: d.domain ?? "unknown", files: d.fileCount ?? 0, ...kinds(d.elements ?? {}) });
      }
      for (const g of parse<{ name?: string; count?: number }[]>(s.greenhouse_usage, [])) {
        if (g.name) greenhouseRows.push({ scanned, component: g.name, usages: g.count ?? 0 });
      }
    }

    const codeId = await ensureDataset(
      run,
      codeDatasetSlug(repo),
      `Code adoption · ${repo}`,
      `UI elements in ${repo} by kind, one row per scan (the report's totals).`,
      CODE_COLUMNS,
    );
    await replaceRows(run, codeId, codeRows);
    const domainId = await ensureDataset(
      run,
      domainDatasetSlug(repo),
      `Code adoption by domain · ${repo}`,
      `UI elements in ${repo} by kind, one row per scan and domain.`,
      DOMAIN_COLUMNS,
    );
    await replaceRows(run, domainId, domainRows);
    const greenhouseId = await ensureDataset(
      run,
      greenhouseDatasetSlug(repo),
      `Greenhouse components · ${repo}`,
      `How often each registered Greenhouse component is used in ${repo}, one row per scan and component.`,
      GREENHOUSE_COLUMNS,
    );
    await replaceRows(run, greenhouseId, greenhouseRows);
    counts[repo] = codeRows.length + domainRows.length + greenhouseRows.length;
  }
  return counts;
}

export const syncCodeAdoptionDatasets = () => transaction(syncCodeAdoptionDatasetsWith);
