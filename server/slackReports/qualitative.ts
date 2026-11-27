import { query } from "../db.ts";
import { loadSource, normalizeSource } from "../qualitative/data.ts";
import { segmentCounts, TREND_PERIOD, type Theme } from "../qualitative/view.ts";

/**
 * The quarter's open-text survey questions, for the report's AI summary: each one's stored
 * summary (already written and reviewed on the Metrics pages), how many people answered and its
 * most common themes with counts. Reads stored data only; never calls the AI.
 */

export interface OpenQuestion {
  question: string;
  /** Asked once (a one-off dataset), so the report summarises it in its own part. */
  oneOff: boolean;
  /** People who answered with something to say. */
  answered: number;
  themes: { theme: string; mentions: number }[];
  summary: string;
  /** How answers changed across quarters, for recurring questions. */
  trend: string;
}

const TOP_THEMES = 6;

export async function openQuestionsFor(quarter: string): Promise<OpenQuestion[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT s.*, d.one_off FROM qualitative_sources s
       JOIN manual_datasets d ON d.id = s.dataset_id
      WHERE s.enabled = 1 AND d.archived = 0
      ORDER BY d.one_off DESC, s.sort_order, s.created_at`,
  );
  const out = await Promise.all(
    rows.map(async (row): Promise<OpenQuestion | null> => {
      const source = normalizeSource(row);
      const question = source.questions[0];
      const [loaded, themes, tags, summaries] = await Promise.all([
        loadSource(source),
        query<Theme>("SELECT id, name, description FROM qualitative_themes WHERE source_id = ? AND question = ?", [source.id, question.column]),
        query<{ row_id: string; theme_ids: unknown; non_answer: number }>(
          "SELECT row_id, theme_ids, non_answer FROM qualitative_tags WHERE source_id = ? AND question = ?",
          [source.id, question.column],
        ),
        query<{ period: string; summary: string }>(
          "SELECT period, summary FROM qualitative_summaries WHERE source_id = ? AND question = ? AND segment_type = 'all' AND period IN (?, ?)",
          [source.id, question.column, quarter, TREND_PERIOD],
        ),
      ]);
      const all = segmentCounts(loaded, question.column, tags, themes, quarter).find((c) => c.key === "all");
      const summary = summaries.find((s) => s.period === quarter)?.summary ?? "";
      if (!all?.responses && !summary) return null;
      const nameOf = new Map(themes.map((t) => [t.id, t.name]));
      return {
        question: source.name,
        oneOff: Boolean(Number(row.one_off)),
        answered: all?.answered ?? 0,
        themes: (all?.themes ?? [])
          .filter((t) => t.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, TOP_THEMES)
          .map((t) => ({ theme: nameOf.get(t.id) ?? "", mentions: t.count })),
        summary,
        trend: Number(row.one_off) ? "" : (summaries.find((s) => s.period === TREND_PERIOD)?.summary ?? ""),
      };
    }),
  );
  return out.filter((q): q is OpenQuestion => q !== null);
}
