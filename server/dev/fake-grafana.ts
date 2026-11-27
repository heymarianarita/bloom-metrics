import type { Frame, GrafanaQuery } from "../shared/grafana.ts";

/**
 * LOCAL DEVELOPMENT ONLY — made-up Grafana answers (GRAFANA_FAKE_DATA=1 in .env), shaped like the
 * Elasticsearch data source's replies to /api/ds/query, for a made-up nightly scan of an iOS app's
 * component usage. Excluded from the production image (.dockerignore) and only loaded when
 * localDevFlag("GRAFANA_FAKE_DATA") allows it. Numbers are deterministic per day, team, framework
 * and component, trend slowly, and add up: teams sum to the run totals.
 *
 * Documents (one set per nightly run, 23:10 UTC), picked by the query's grouping, else its `type:` term:
 *   type:component (grouped by component)        — component, team_name, usages
 *   type:team (grouped by team_name or framework) — team_name, framework (swiftui | native_swiftui | uikit), usages
 *   type:run (anything else)                     — run totals: swiftui_usages, native_swiftui_usages,
 *                                                  uikit_usages, total_usages (all three), files_scanned, …
 * `field:value` terms on fields a document has filter it; other terms are ignored.
 *
 * Answers by query shape, like Grafana:
 *   raw_data                         -> one table of documents
 *   bucket aggs ending in date_histogram -> one time series frame per group, named by it, no labels
 *   bucket aggs ending in terms      -> one table: time, one column per term, one per metric ("Sum usages")
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** The made-up scanner's first nightly run. */
const FIRST_RUN = Date.UTC(2026, 6, 1);

const TEAMS = Array.from({ length: 31 }, (_, i) => `team-${String(i + 1).padStart(2, "0")}`);
const FRAMEWORKS = ["swiftui", "native_swiftui", "uikit"] as const;
const COMPONENTS = Array.from({ length: 12 }, (_, i) => `Component${String.fromCharCode(65 + i)}`);

/** A number in [0, 1) that's always the same for the same seed. */
const seeded = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
};

/** 0 on the first run, 1 a year later: how far the slow trends have moved. */
const progress = (day: number) => Math.min(1, Math.max(0, (day - FIRST_RUN) / (365 * DAY_MS)));

/** A team's usages of one framework on one day. */
function teamUsages(team: string, framework: string, day: number): number {
  const weight = 0.3 + seeded(`${team}:weight`) * 1.7;
  const p = progress(day);
  const wobble = 0.95 + seeded(`${team}:${framework}:${day}`) * 0.1;
  const base =
    framework === "swiftui" ? 8 + 10 * p + seeded(`${team}:swiftui`) * 6 * p
    : framework === "native_swiftui" ? Math.max(0.1, 1.2 - 0.9 * p)
    : 290 - 25 * p;
  return Math.round(base * weight * wobble);
}

const componentUsages = (component: string, day: number) =>
  Math.round((5 + seeded(`${component}:size`) * 60) * (0.6 + 0.6 * progress(day)) * (0.97 + seeded(`${component}:${day}`) * 0.06));

/** A run's total for one of its fields. */
function runTotal(field: string, day: number): number {
  const of = (framework: string) => TEAMS.reduce((n, t) => n + teamUsages(t, framework, day), 0);
  if (field === "total_usages" || field === "usages") return FRAMEWORKS.reduce((n, f) => n + of(f), 0);
  const framework = field.replace(/_usages$/, "");
  if ((FRAMEWORKS as readonly string[]).includes(framework)) return of(framework);
  if (field === "files_scanned") return 4200 + Math.round(progress(day) * 180);
  if (field === "teams_with_usages") return TEAMS.length;
  if (field === "components") return COMPONENTS.length;
  return Math.round(10 + seeded(field) * 40);
}

/** When a day's nightly run happens: 23:10 UTC. */
const runAt = (day: number) => day + 23 * 60 * 60 * 1000 + 10 * 60 * 1000;
const runId = (day: number) => String(40000 + Math.round((day - FIRST_RUN) / DAY_MS));

/** The days (UTC midnight) whose nightly run falls between two times. */
function runDays(from: number, to: number): number[] {
  const days: number[] = [];
  for (let day = Math.floor(from / DAY_MS) * DAY_MS - DAY_MS; day <= to; day += DAY_MS) {
    if (day >= FIRST_RUN && runAt(day) >= from && runAt(day) <= to) days.push(day);
  }
  return days;
}

type Doc = Record<string, string | number>;
type Kind = "run" | "team" | "component";

const kindOf = (lucene: string, termFields: string[]): Kind => {
  if (termFields.includes("component")) return "component";
  if (termFields.includes("team_name") || termFields.includes("framework")) return "team";
  const type = /(?<![\w.])type:"?(run|team|component)\b/.exec(lucene)?.[1];
  return (type as Kind | undefined) ?? "run";
};

/** One nightly run's documents of a kind. */
function docs(kind: Kind, day: number): Doc[] {
  const common = { "@timestamp": runAt(day), type: kind, run_id: runId(day), branch: "master" };
  if (kind === "component") {
    return COMPONENTS.map((component, i) => ({
      ...common,
      component,
      team_name: TEAMS[(i * 7) % TEAMS.length],
      usages: componentUsages(component, day),
    }));
  }
  if (kind === "team") {
    return TEAMS.flatMap((team_name) =>
      FRAMEWORKS.map((framework) => ({ ...common, team_name, framework, usages: teamUsages(team_name, framework, day) })),
    );
  }
  const fields = ["files_scanned", "teams_with_usages", "components", "swiftui_usages", "native_swiftui_usages", "uikit_usages", "total_usages"];
  return [{ ...common, generated_at: new Date(runAt(day)).toISOString(), ...Object.fromEntries(fields.map((f) => [f, runTotal(f, day)])) }];
}

/** Keeps documents matching the query's simple `field:value` terms on their own fields. */
function matches(doc: Doc, lucene: string): boolean {
  for (const [, field, value] of lucene.matchAll(/(?<![\w.])([a-z_]+):"?([\w-]+)"?/g)) {
    if (field in doc && String(doc[field]) !== value) return false;
  }
  return true;
}

type Column = { name: string; type: "time" | "string" | "number"; values: unknown[] };
const frame = (columns: Column[], name?: string, timeseries = false): Frame => ({
  schema: {
    ...(name ? { name } : {}),
    ...(timeseries ? { meta: { type: "timeseries-multi" } } : {}),
    fields: columns.map((c) => ({ name: c.name, type: c.type })),
  },
  data: { values: columns.map((c) => c.values) },
});

interface Agg {
  type?: string;
  field?: string;
  hide?: boolean;
}

const metricName = (m: Agg) => (m.type === "count" ? "Count" : `${(m.type ?? "sum").replace(/^./, (c) => c.toUpperCase())} ${m.field ?? ""}`.trim());

function aggregate(m: Agg, group: Doc[]): number | null {
  if (m.type === "count") return group.length;
  const values = group.map((d) => Number(d[m.field ?? ""])).filter(Number.isFinite);
  if (!values.length) return null;
  if (m.type === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (m.type === "max") return Math.max(...values);
  if (m.type === "min") return Math.min(...values);
  return values.reduce((a, b) => a + b, 0);
}

/** Grafana's /api/ds/query frames for one query between two times. */
export function fakeGrafanaFrames(query: GrafanaQuery, from: number, to: number): Frame[] {
  const lucene = String(query.query ?? "");
  const metrics = ((query.metrics as Agg[] | undefined) ?? []).filter((m) => !m.hide);
  const aggs = (query.bucketAggs as Agg[] | undefined) ?? [];
  const termFields = aggs.filter((a) => a.type === "terms").map((a) => (a.field ?? "").replace(/\.keyword$/, ""));
  const kind = kindOf(lucene, termFields);
  const all = runDays(from, to)
    .flatMap((day) => docs(kind, day).map((d) => ({ day, doc: d })))
    .filter(({ doc }) => matches(doc, lucene));

  if (!aggs.length || metrics.some((m) => m.type === "raw_data" || m.type === "raw_document" || m.type === "logs")) {
    const names = [...new Set(all.flatMap(({ doc }) => Object.keys(doc)))];
    return [
      frame(
        names.map((name) => ({
          name,
          type: name === "@timestamp" ? "time" : typeof all[0]?.doc[name] === "number" ? "number" : "string",
          values: all.map(({ doc }) => doc[name] ?? null),
        })),
      ),
    ];
  }

  const groups = new Map<string, { day: number; terms: string[]; docs: Doc[] }>();
  for (const { day, doc } of all) {
    const terms = termFields.map((f) => String(doc[f] ?? ""));
    const key = JSON.stringify([day, terms]);
    const group = groups.get(key) ?? { day, terms, docs: [] };
    group.docs.push(doc);
    groups.set(key, group);
  }

  if (aggs[aggs.length - 1]?.type === "date_histogram") {
    const series = new Map<string, { day: number; docs: Doc[] }[]>();
    for (const g of groups.values()) {
      const name = g.terms.join(" ");
      series.set(name, [...(series.get(name) ?? []), g]);
    }
    return [...series.entries()].flatMap(([name, points]) =>
      metrics.map((m) =>
        frame(
          [
            { name: "Time", type: "time", values: points.map((p) => p.day) },
            { name: "Value", type: "number", values: points.map((p) => aggregate(m, p.docs)) },
          ],
          [name, metrics.length > 1 || !name ? metricName(m) : ""].filter(Boolean).join(" "),
          true,
        ),
      ),
    );
  }

  const rows = [...groups.values()];
  return [
    frame([
      { name: aggs.find((a) => a.type === "date_histogram")?.field ?? "@timestamp", type: "time", values: rows.map((r) => r.day) },
      ...termFields.map((f, i) => ({ name: f, type: "string" as const, values: rows.map((r) => r.terms[i]) })),
      ...metrics.map((m) => ({ name: metricName(m), type: "number" as const, values: rows.map((r) => aggregate(m, r.docs)) })),
    ]),
  ];
}
