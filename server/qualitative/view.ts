import { query, toIso } from "../db.ts";
import { loadSource, sha256, sourcesForGroup, type LoadedSource } from "./data.ts";

/** Period key of the across-periods summary (kept here so the view needs nothing from the job). */
export const TREND_PERIOD = "__trend__";

/**
 * What the metric group page shows: theme counts per period and segment, the stored
 * summaries and a few excerpts per theme. Built from stored tags only; never calls the AI.
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
}

type TagRow = { row_id: string; theme_ids: unknown; non_answer: number | boolean };

const idsOf = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[];
  try {
    return JSON.parse(String(v ?? "[]"));
  } catch {
    return [];
  }
};

export interface SegmentCount {
  /** "all", or "<breakdown label>: <value>". */
  key: string;
  type: string;
  value: string;
  /** Non-blank answers. */
  responses: number;
  nonAnswers: number;
  /** Answers not tagged yet (a run is pending or failed). */
  untagged: number;
  /** Answers with content (responses minus non-answers minus untagged). */
  answered: number;
  themes: { id: string; count: number }[];
}

/** Theme counts for everyone and for every breakdown value in one period. */
export function segmentCounts(loaded: LoadedSource, question: string, tags: TagRow[], themes: Theme[], period: string): SegmentCount[] {
  const tagOf = new Map(tags.map((t) => [t.row_id, t]));
  const valid = new Set(themes.map((t) => t.id));
  const rows = loaded.responses.filter((r) => r.period === period && r.answers[question]);
  const groups = new Map<string, { type: string; value: string; rows: typeof rows }>([["all", { type: "all", value: "all", rows }]]);
  for (const b of loaded.source.breakdowns) {
    if (b.kind === "business_unit" && !loaded.businessUnitsAvailable) continue;
    for (const r of rows) {
      const value = r.segments[b.label];
      const key = `${b.label}: ${value}`;
      const g = groups.get(key) ?? { type: b.label, value, rows: [] };
      g.rows.push(r);
      groups.set(key, g);
    }
  }
  return Array.from(groups.entries()).map(([key, g]) => {
    const counts = new Map<string, number>();
    let nonAnswers = 0;
    let untagged = 0;
    for (const r of g.rows) {
      const tag = tagOf.get(r.rowId);
      if (!tag) {
        untagged++;
        continue;
      }
      if (Number(tag.non_answer)) {
        nonAnswers++;
        continue;
      }
      idsOf(tag.theme_ids)
        .filter((id) => valid.has(id))
        .forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    }
    return {
      key,
      type: g.type,
      value: g.value,
      responses: g.rows.length,
      nonAnswers,
      untagged,
      answered: g.rows.length - nonAnswers - untagged,
      themes: themes.map((t) => ({ id: t.id, count: counts.get(t.id) ?? 0 })),
    };
  });
}

const EXCERPTS_PER_THEME = 3;

export async function groupView(groupName: string) {
  const sources = await sourcesForGroup(groupName);
  return {
    sources: await Promise.all(
      sources.map(async (source) => {
        const loaded = await loadSource(source);
        const [themes, tags, summaries] = await Promise.all([
          query<Theme & { question: string }>(
            "SELECT id, question, name, description FROM qualitative_themes WHERE source_id = ? ORDER BY sort_order, created_at",
            [source.id],
          ),
          query<TagRow & { question: string; excerpt: string }>(
            "SELECT row_id, question, theme_ids, non_answer, excerpt FROM qualitative_tags WHERE source_id = ?",
            [source.id],
          ),
          query<{ question: string; period: string; segment_type: string; segment_value: string; summary: string }>(
            "SELECT question, period, segment_type, segment_value, summary FROM qualitative_summaries WHERE source_id = ?",
            [source.id],
          ),
        ]);
        const periodOf = new Map(loaded.responses.map((r) => [r.rowId, r.period]));
        return {
          id: source.id,
          name: source.name,
          runStatus: source.run_status,
          runMessage: source.run_message,
          runAt: toIso(source.run_at),
          breakdowns: source.breakdowns.map((b) => ({
            label: b.label,
            available: b.kind !== "business_unit" || loaded.businessUnitsAvailable,
          })),
          periods: loaded.periods,
          questions: source.questions.map((q) => {
            const qThemes = themes.filter((t) => t.question === q.column);
            const qTags = tags.filter((t) => t.question === q.column);
            return {
              column: q.column,
              label: q.label,
              tone: q.tone,
              themes: qThemes.map((t) => ({ id: t.id, name: t.name, description: t.description })),
              /** How the answers evolved across all periods (all respondents). */
              trendSummary:
                summaries.find((s) => s.question === q.column && s.period === TREND_PERIOD)?.summary ?? null,
              periods: Object.fromEntries(
                loaded.periods.map((period) => {
                  const segments = segmentCounts(loaded, q.column, qTags, qThemes, period).map((c) => ({
                    ...c,
                    summary:
                      summaries.find(
                        (s) =>
                          s.question === q.column &&
                          s.period === period &&
                          s.segment_type === c.type &&
                          s.segment_value === c.value,
                      )?.summary ?? null,
                  }));
                  // A few excerpts per theme from the whole period, never narrowed to a segment.
                  const excerpts: Record<string, string[]> = {};
                  for (const t of qThemes) {
                    excerpts[t.id] = qTags
                      .filter(
                        (tag) =>
                          periodOf.get(tag.row_id) === period &&
                          tag.excerpt.length >= 20 &&
                          idsOf(tag.theme_ids).includes(t.id),
                      )
                      // Stable but spread out, rather than always the first rows.
                      .sort((a, b) => sha256(a.row_id + t.id).localeCompare(sha256(b.row_id + t.id)))
                      .slice(0, EXCERPTS_PER_THEME)
                      .map((tag) => tag.excerpt);
                  }
                  return [period, { segments, excerpts }];
                }),
              ),
            };
          }),
        };
      }),
    ),
  };
}
