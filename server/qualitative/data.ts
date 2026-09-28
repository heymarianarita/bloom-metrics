import { createHash } from "node:crypto";
import { query } from "../db.ts";
import getdxTeams from "../functions/getdx-teams.ts";
import { bucketPeriod, comparePeriods, type Periodicity } from "../shared/periods.ts";
import { matchTeamBusinessUnits, type TeamBusinessUnitMap } from "../shared/teamBusinessUnits.ts";

/**
 * A qualitative metric (the qualitative_sources row): one free-text column of a dataset.
 * `questions` always holds that single column; the pipeline works per question.
 */
export interface QualitativeSource {
  id: string;
  name: string;
  description: string;
  group_name: string;
  dataset_id: string;
  period_column: string;
  questions: { column: string; label: string; tone: "positive" | "improvement" | "neutral" }[];
  /** "column": split by a dataset column; "business_unit": map a team column to GetDX business units. */
  breakdowns: { kind: "column" | "business_unit"; column: string; label: string }[];
  enabled: boolean;
  run_status: string;
  run_message: string;
  run_at: string | null;
}

/** One dataset row, reduced to what the qualitative features need. */
export interface Response {
  rowId: string;
  period: string;
  /** Breakdown label → value ("Role" → "Web Engineer"). Missing values are "Unknown". */
  segments: Record<string, string>;
  /** Question column → trimmed answer ("" when blank). */
  answers: Record<string, string>;
}

export const UNKNOWN = "Unknown";

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

const asJson = <T>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};

export const normalizeSource = (row: Record<string, unknown>): QualitativeSource => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  description: String(row.description ?? ""),
  group_name: String(row.group_name ?? ""),
  dataset_id: String(row.dataset_id),
  period_column: String(row.period_column ?? ""),
  questions: [
    {
      column: String(row.text_column ?? ""),
      label: String(row.name ?? ""),
      tone: (["positive", "improvement"].includes(String(row.tone)) ? row.tone : "neutral") as QualitativeSource["questions"][number]["tone"],
    },
  ],
  breakdowns: asJson(row.breakdowns, []),
  enabled: Boolean(Number(row.enabled ?? 1)),
  run_status: String(row.run_status ?? "idle"),
  run_message: String(row.run_message ?? ""),
  run_at: (row.run_at as string | null) ?? null,
});

export async function getSource(id: string) {
  const rows = await query("SELECT * FROM qualitative_sources WHERE id = ?", [id]);
  return rows[0] ? normalizeSource(rows[0]) : null;
}

export async function sourcesForGroup(groupName: string) {
  const rows = await query(
    "SELECT * FROM qualitative_sources WHERE group_name = ? AND enabled = 1 ORDER BY sort_order, created_at",
    [groupName],
  );
  return rows.map(normalizeSource);
}

async function periodicityOf(groupName: string): Promise<Periodicity> {
  const rows = await query<{ periodicity: string }>("SELECT periodicity FROM metric_groups WHERE name = ?", [groupName]);
  return (rows[0]?.periodicity as Periodicity) ?? "quarterly";
}

/** Team → business unit, matched the same way as the app (GetDX copy plus manual overrides). */
async function businessUnits(teams: string[]): Promise<TeamBusinessUnitMap> {
  const [dx, cfg] = await Promise.all([
    getdxTeams({ method: "GET", query: new URLSearchParams("historic=1"), body: {}, headers: {}, user: null }).catch(() => null),
    query<{ config: unknown }>("SELECT config FROM data_source_configs WHERE source_key = 'team_business_units'"),
  ]);
  const payload = (dx?.body ?? {}) as { teams?: []; historic?: [] };
  const overrides = asJson<{ map?: TeamBusinessUnitMap }>(cfg[0]?.config, {}).map ?? {};
  return matchTeamBusinessUnits({ teams: payload.teams ?? [], historic: payload.historic ?? [], known: teams, overrides });
}

export interface LoadedSource {
  source: QualitativeSource;
  periodicity: Periodicity;
  /** Oldest period first. */
  periods: string[];
  responses: Response[];
  /** Whether business units could be resolved (false when no GetDX copy or no team matched). */
  businessUnitsAvailable: boolean;
  /** Words to strip from excerpts: people's names (from email addresses) and team names. */
  scrub: ScrubTerms;
}

/** Reads the dataset behind a source and resolves each row's period and segments. */
export async function loadSource(source: QualitativeSource): Promise<LoadedSource> {
  const [rows, periodicity] = await Promise.all([
    query<{ id: string; data: unknown }>("SELECT id, data FROM manual_dataset_rows WHERE dataset_id = ? ORDER BY sort_order", [
      source.dataset_id,
    ]),
    periodicityOf(source.group_name),
  ]);
  const data = rows.map((r) => ({ id: r.id, data: asJson<Record<string, unknown>>(r.data, {}) }));
  const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

  const buBreakdowns = source.breakdowns.filter((b) => b.kind === "business_unit");
  const teamValues = Array.from(new Set(buBreakdowns.flatMap((b) => data.map((r) => text(r.data[b.column])).filter(Boolean))));
  const buMap = buBreakdowns.length ? await businessUnits(teamValues) : {};

  const responses: Response[] = data
    .map(({ id, data: d }) => {
      const periodRaw = text(d[source.period_column]);
      const segments: Record<string, string> = {};
      for (const b of source.breakdowns) {
        const value = text(d[b.column]);
        segments[b.label] = (b.kind === "business_unit" ? buMap[value] : value) || UNKNOWN;
      }
      return {
        rowId: id,
        period: periodRaw ? bucketPeriod(periodRaw, periodicity) : "",
        segments,
        answers: Object.fromEntries(source.questions.map((q) => [q.column, text(d[q.column])])),
      };
    })
    .filter((r) => r.period);

  // Names to keep out of excerpts: first/last names from email-like values, and team names.
  const names = new Set<string>();
  for (const { data: d } of data) {
    for (const v of Object.values(d)) {
      const m = typeof v === "string" ? v.match(/^([a-z][a-z.\-_]+)@/i) : null;
      m?.[1].split(/[.\-_]/).forEach((part) => part.length >= 3 && names.add(part.toLowerCase()));
    }
  }

  return {
    source,
    periodicity,
    periods: Array.from(new Set(responses.map((r) => r.period))).sort(comparePeriods),
    responses,
    businessUnitsAvailable: buBreakdowns.length === 0 || Object.keys(buMap).length > 0,
    scrub: { names: Array.from(names), teams: teamValues.filter((t) => t.length >= 3) },
  };
}

export interface ScrubTerms {
  names: string[];
  teams: string[];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes emails, people's names and team names from a quote. The AI is asked to do this
 * too; this is the safety net. Names and teams are often ordinary words ("Will", "Search"),
 * so they are only replaced when written with a capital letter.
 */
export function scrubExcerpt(excerpt: string, { names, teams }: ScrubTerms) {
  let out = excerpt.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]");
  const replace = (terms: string[], label: string) => {
    // Longest first, so "Anna Maria" goes before "Anna".
    for (const term of [...terms].sort((a, b) => b.length - a.length)) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, "giu");
      out = out.replace(re, (hit) => (hit[0] === hit[0].toLocaleUpperCase() && hit[0] !== hit[0].toLocaleLowerCase() ? label : hit));
    }
  };
  replace(names, "[name]");
  replace(teams, "[team]");
  return out;
}
