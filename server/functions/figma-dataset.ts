import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { transaction } from "../db.ts";

/**
 * Figma adoption as an ordinary dataset, so metrics and Views treat it like any other data:
 * one row per component, library and quarter, rebuilt from `figma_adoption_snapshots` after
 * every capture. The dataset is synced (entry_method "figma"): nobody edits its rows by hand.
 */

export const FIGMA_DATASET_SLUG = "figma-components";

/** Stable keys: metrics and views refer to them. */
export const FIGMA_COLUMNS = [
  { key: "quarter", label: "Quarter", kind: "period" },
  { key: "library", label: "Library", kind: "text" },
  { key: "component", label: "Component", kind: "text" },
  { key: "page", label: "Page", kind: "text" },
  { key: "inserts", label: "Inserts", kind: "number" },
  { key: "detaches", label: "Detaches", kind: "number" },
  { key: "usages", label: "Usages", kind: "number" },
] as const;

interface Library {
  fileKey: string;
  name?: string;
  excludedPages?: string[];
}

interface SnapshotComponent {
  name?: string;
  page?: string;
  inserts?: number;
  detaches?: number;
  usages?: number;
}

type Run = (sql: string, params?: unknown[]) => Promise<unknown[]>;

/** Creates the dataset and its columns if missing; returns its id. */
async function ensureDataset(run: Run): Promise<string> {
  const found = (await run("SELECT id FROM manual_datasets WHERE slug = ?", [FIGMA_DATASET_SLUG])) as { id: string }[];
  const id = found[0]?.id ?? randomUUID();
  if (!found.length) {
    await run(
      `INSERT INTO manual_datasets (id, slug, name, description, entry_method, entry_notes, sort_order)
       VALUES (?, ?, ?, ?, 'figma', ?, 999)`,
      [
        id,
        FIGMA_DATASET_SLUG,
        "Figma component analytics",
        "One row per component, library and quarter: how often it was inserted and detached.",
        "Synced from Figma's library analytics after every capture (twice a month). Libraries and excluded pages are set in Settings → Dynamic sources.",
      ],
    );
  }
  for (const [i, c] of FIGMA_COLUMNS.entries()) {
    await run(
      `INSERT INTO manual_dataset_columns (id, dataset_id, \`key\`, label, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE label = VALUES(label), kind = VALUES(kind), sort_order = VALUES(sort_order)`,
      [randomUUID(), id, c.key, c.label, c.kind, i],
    );
  }
  return id;
}

/** Rebuilds the dataset's rows from the stored snapshots. Safe to run any time. */
export async function syncFigmaDatasetWith(conn: PoolConnection): Promise<{ rows: number }> {
  const run: Run = async (sql, params = []) => (await conn.query(sql, params))[0] as unknown[];
  const id = await ensureDataset(run);

  const [config] = (await run("SELECT config FROM data_source_configs WHERE source_key = 'figma'")) as {
    config: { libraries?: Library[] } | string;
  }[];
  const parsed = typeof config?.config === "string" ? JSON.parse(config.config) : config?.config;
  const libraries = new Map<string, Library>(((parsed?.libraries ?? []) as Library[]).map((l) => [l.fileKey, l]));

  // Sorted here, not in SQL: sorting rows that carry the large components JSON overruns MySQL's sort buffer.
  const snapshots = (
    (await run("SELECT file_key, file_name, quarter, components FROM figma_adoption_snapshots")) as {
      file_key: string;
      file_name: string | null;
      quarter: string;
      components: SnapshotComponent[] | string;
    }[]
  ).sort((a, b) => a.quarter.localeCompare(b.quarter) || a.file_key.localeCompare(b.file_key));

  const rows: unknown[][] = [];
  for (const s of snapshots) {
    const library = libraries.get(s.file_key);
    const excluded = new Set(library?.excludedPages ?? []);
    const components = (typeof s.components === "string" ? JSON.parse(s.components) : s.components) ?? [];
    for (const c of components as SnapshotComponent[]) {
      if (!c.name || (c.page && excluded.has(c.page))) continue;
      const data = {
        quarter: s.quarter,
        library: library?.name || s.file_name || s.file_key,
        component: c.name,
        page: c.page ?? "",
        inserts: c.inserts ?? 0,
        detaches: c.detaches ?? 0,
        usages: c.usages ?? 0,
      };
      rows.push([randomUUID(), id, JSON.stringify(data), rows.length]);
    }
  }

  await run("DELETE FROM manual_dataset_rows WHERE dataset_id = ?", [id]);
  for (let i = 0; i < rows.length; i += 500) {
    await run("INSERT INTO manual_dataset_rows (id, dataset_id, data, sort_order) VALUES ?", [rows.slice(i, i + 500)]);
  }
  await run("UPDATE manual_datasets SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [id]);
  return { rows: rows.length };
}

export const syncFigmaDataset = () => transaction(syncFigmaDatasetWith);
