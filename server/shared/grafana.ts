/**
 * Grafana queries as datasets: reading a pasted query, turning Grafana's response frames into
 * dataset rows, and merging a fetch into the rows already stored. Shared by the server sync and
 * the settings card. No imports.
 */

/** One query as Grafana's /api/ds/query takes it: its data source plus that data source's own fields. */
export interface GrafanaQuery {
  datasource: { type?: string; uid: string };
  [field: string]: unknown;
}

export type GrafanaColumnKind = "text" | "number" | "date";

export interface GrafanaColumn {
  key: string;
  label: string;
  kind: GrafanaColumnKind;
}

export type GrafanaRow = Record<string, string | number | null>;

type ParsedInput = { url: string | null; query: GrafanaQuery } | { error: string };

const asDatasource = (v: unknown): GrafanaQuery["datasource"] | null => {
  if (typeof v === "string" && v.trim()) return { uid: v.trim() };
  if (v && typeof v === "object" && typeof (v as { uid?: unknown }).uid === "string") {
    const { uid, type } = v as { uid: string; type?: unknown };
    return typeof type === "string" ? { type, uid } : { uid };
  }
  return null;
};

/** The first visible query of a list, with the pane's data source when the query has none. */
function pick(queries: unknown, fallback?: unknown): GrafanaQuery | null {
  if (!Array.isArray(queries)) return null;
  const found = queries.find((q) => q && typeof q === "object" && !(q as { hide?: boolean }).hide) as Record<string, unknown> | undefined;
  if (!found) return null;
  const datasource = asDatasource(found.datasource) ?? asDatasource(fallback);
  if (!datasource) return null;
  // refId and hide are set per request.
  const { refId, hide, ...rest } = found;
  return { ...rest, datasource };
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** A query from an Explore pane: `{ datasource, queries }` (current) or `[from, to, datasource, …queries]` (old). */
function fromPane(pane: unknown): GrafanaQuery | null {
  if (Array.isArray(pane)) return pick(pane.slice(3).filter((q) => q && typeof q === "object"), pane[2]);
  if (pane && typeof pane === "object") {
    const p = pane as { datasource?: unknown; queries?: unknown };
    return pick(p.queries, p.datasource);
  }
  return null;
}

/**
 * Reads what someone pastes to add a query: a Grafana Explore address, or the query's JSON (a
 * single query, or the request shown in Grafana's query inspector).
 */
export function parseGrafanaInput(input: string): ParsedInput {
  const value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { error: "That address can't be read." };
    }
    if (url.pathname.includes("/goto/")) {
      return { error: "Short links (/goto/…) can't be read. Open the link, then copy the full address from the browser's address bar." };
    }
    const panes = parseJson(url.searchParams.get("panes") ?? "");
    const left = parseJson(url.searchParams.get("left") ?? "");
    const query =
      panes && typeof panes === "object" && !Array.isArray(panes)
        ? fromPane(Object.values(panes as Record<string, unknown>)[0])
        : left !== undefined
          ? fromPane(left)
          : null;
    if (!query) return { error: "No query found in that address. Open the query in Grafana Explore and copy the address from there." };
    return { url: url.origin, query };
  }
  const json = parseJson(value);
  if (!json || typeof json !== "object") {
    return { error: "Paste a Grafana Explore address or a query's JSON." };
  }
  const query = Array.isArray((json as { queries?: unknown }).queries)
    ? pick((json as { queries: unknown }).queries)
    : pick([json]);
  if (!query) return { error: "That JSON has no query with a data source." };
  return { url: null, query };
}

/** A short default name for a new query, from what it searches for. */
export function describeQuery(query: GrafanaQuery): string {
  const text = [query.query, query.expr, query.rawSql, query.rawQuery].find((v) => typeof v === "string" && v.trim()) as string | undefined;
  const type = query.datasource.type ? `${query.datasource.type} query` : "Grafana query";
  if (!text) return type;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 59)}…` : flat;
}

interface Field {
  name: string;
  type?: string;
  labels?: Record<string, string> | null;
  config?: { displayNameFromDS?: string; displayName?: string } | null;
}

export interface Frame {
  schema?: { name?: string; meta?: { type?: string } | null; fields?: Field[] };
  data?: { values?: unknown[][] };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** The calendar day a cell is on (UTC), or null. */
export const dayOf = (v: unknown): string | null => {
  if (typeof v === "string" && ISO_DAY.test(v)) return v.slice(0, 10);
  return null;
};

const cell = (v: unknown, type?: string): string | number | null => {
  if (v === null || v === undefined) return null;
  if (type === "time") {
    const ms = typeof v === "number" ? v : Date.parse(String(v));
    return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  return JSON.stringify(v);
};

/** What Elasticsearch adds to each raw document; not part of the logged data. */
const DOCUMENT_META = new Set(["_id", "_index", "_type", "_source", "highlight", "sort"]);

const keyFor = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "value";

/**
 * Grafana's response frames as one table. A table frame (e.g. raw log documents) gives a row per
 * line. Time series frames (one per series) are joined on time and the series' name, so each row
 * has its time, its name and one column per value. A series is named by its labels (Prometheus)
 * or, without labels, by its frame's name in a "Series" column (Elasticsearch terms). Time
 * fields keep their calendar day (UTC).
 */
export function framesToTable(frames: Frame[]): { columns: GrafanaColumn[]; rows: GrafanaRow[] } {
  const labels = new Map<string, string>();
  const kinds = new Map<string, GrafanaColumnKind | "unknown">();
  const columnFor = (label: string, kind: GrafanaColumnKind | "unknown") => {
    let key = [...labels.entries()].find(([, l]) => l === label)?.[0];
    if (!key) {
      const base = keyFor(label);
      key = base;
      for (let n = 2; labels.has(key); n++) key = `${base}_${n}`;
      labels.set(key, label);
    }
    const seen = kinds.get(key);
    if (!seen || seen === "unknown") kinds.set(key, kind);
    else if (kind !== "unknown" && seen !== kind) kinds.set(key, "text");
    return key;
  };

  const rows = new Map<string, GrafanaRow>();
  const order: string[] = [];
  for (const [f, frame] of frames.entries()) {
    const all = frame.schema?.fields ?? [];
    const fields = all.filter((field) => !DOCUMENT_META.has(field.name));
    const values = (frame.data?.values ?? []).filter((_, k) => !DOCUMENT_META.has(all[k]?.name));
    const length = values[0]?.length ?? 0;
    const labelled = fields.some((field) => field.labels && Object.keys(field.labels).length);
    const series = labelled || Boolean(frame.schema?.meta?.type?.startsWith("timeseries"));
    const name = series && !labelled ? frame.schema?.name : undefined;
    for (let i = 0; i < length; i++) {
      const dims: GrafanaRow = {};
      const measures: GrafanaRow = {};
      if (name) dims[columnFor("Series", "text")] = name;
      fields.forEach((field, k) => {
        const v = cell(values[k]?.[i], field.type);
        const kind = field.type === "time" ? "date" : field.type === "number" ? "number" : field.type === "string" ? "text" : "unknown";
        for (const [name, label] of Object.entries(field.labels ?? {})) dims[columnFor(name, "text")] = label;
        if (series && field.type !== "time" && field.type !== "string") {
          measures[columnFor(field.config?.displayName || field.name, kind)] = v;
        } else {
          dims[columnFor(field.name, kind)] = v;
        }
      });
      // Time series join on their time and labels; table rows stay one per line.
      const id = series ? JSON.stringify(Object.entries(dims).sort()) : `${f}:${i}`;
      const row = rows.get(id);
      if (row) Object.assign(row, measures);
      else {
        rows.set(id, { ...dims, ...measures });
        order.push(id);
      }
    }
  }

  const table = order.map((id) => rows.get(id)!);
  const columns = [...labels.entries()].map(([key, label]): GrafanaColumn => {
    const kind = kinds.get(key);
    if (kind === "date" || kind === "number") return { key, label, kind };
    const filled = table.map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== "");
    return { key, label, kind: filled.length && filled.every((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? "date" : "text" };
  });
  return { columns, rows: table };
}

/** Column added to queries without a date: the day each sync's result was saved. */
export const SYNCED_COLUMN: GrafanaColumn = { key: "synced", label: "Synced on", kind: "date" };

/**
 * The rows to keep after a fetch, so history outlives Grafana's retention:
 *   - by a date column: the fetched days replace those days, other days are kept. The window's
 *     first day only replaces stored rows when there are none, since Grafana may have already
 *     dropped part of it.
 *   - without one: the fetch is saved as today's snapshot, replacing an earlier one from today.
 * Fetched rows without a day are left out.
 */
export function mergeRows(
  stored: GrafanaRow[],
  fetched: GrafanaRow[],
  options: { dateColumn: string | null; firstDay: string; today: string },
): { rows: GrafanaRow[]; added: number; skipped: number } {
  if (!options.dateColumn) {
    const kept = stored.filter((r) => r[SYNCED_COLUMN.key] !== options.today);
    const snapshot = fetched.map((r) => ({ ...r, [SYNCED_COLUMN.key]: options.today }));
    return { rows: [...kept, ...snapshot], added: snapshot.length, skipped: 0 };
  }
  const key = options.dateColumn;
  const storedDays = new Set(stored.map((r) => dayOf(r[key])).filter(Boolean));
  const dated = fetched.filter((r) => dayOf(r[key]));
  const replace = new Set(
    dated.map((r) => dayOf(r[key])!).filter((day) => day > options.firstDay || !storedDays.has(day)),
  );
  const incoming = dated.filter((r) => replace.has(dayOf(r[key])!));
  const kept = stored.filter((r) => !replace.has(dayOf(r[key]) ?? ""));
  const rows = [...kept, ...incoming].sort((a, b) => (dayOf(a[key]) ?? "").localeCompare(dayOf(b[key]) ?? ""));
  return { rows, added: incoming.length, skipped: fetched.length - dated.length };
}
