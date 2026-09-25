import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { previousQuarter, sortQuarters } from "@/lib/quarters";

/** The AI prototyping template numbers live in the manual dataset with this slug. */
export const AI_TEMPLATES_DATASET_SLUG = "ai_prototyping_templates";

export interface AiTemplateRow {
  id: string;
  templateName: string;
  quarter: string;
  prototypes_created: number;
  active_users: number;
  active_teams: number;
  prototypes_off_bloom: number;
  note: string;
  shareOfTotal: number;
}

type RawRow = Omit<AiTemplateRow, "shareOfTotal">;

const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const sum = (rows: RawRow[], key: keyof RawRow) =>
  rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

const totalsFor = (rows: RawRow[]) => {
  const created = sum(rows, "prototypes_created");
  const offBloom = sum(rows, "prototypes_off_bloom");
  const all = created + offBloom;
  return {
    prototypes: created,
    activeUsers: sum(rows, "active_users"),
    activeTeams: sum(rows, "active_teams"),
    bloomShare: all > 0 ? Math.round((created / all) * 100) : null,
  };
};

/** Reads the AI prototyping dataset rows straight from Datasets. */
export const useAiTemplateDatasetRows = () =>
  useQuery({
    queryKey: ["ai-template-dataset-rows"],
    queryFn: async (): Promise<RawRow[]> => {
      const { data: dataset, error: datasetError } = await supabase
        .from("manual_datasets")
        .select("id")
        .eq("slug", AI_TEMPLATES_DATASET_SLUG)
        .maybeSingle();
      if (datasetError) throw new Error(datasetError.message);
      if (!dataset) return [];

      const { data, error } = await supabase
        .from("manual_dataset_rows")
        .select("*")
        .eq("dataset_id", (dataset as { id: string }).id)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => {
        const cells = (row.data ?? {}) as Record<string, unknown>;
        return {
          id: row.id as string,
          templateName: String(cells.template ?? "Untitled template"),
          quarter: String(cells.quarter ?? ""),
          prototypes_created: num(cells.prototypes_created),
          active_users: num(cells.active_users),
          active_teams: num(cells.active_teams),
          prototypes_off_bloom: num(cells.prototypes_off_bloom),
          note: String(cells.note ?? ""),
        };
      });
    },
  });

/** Totals, previous-quarter deltas, per-template rows and the full trend series. */
export const useAiTemplateMetrics = (quarter: string) => {
  const query = useAiTemplateDatasetRows();

  const derived = useMemo(() => {
    const all = query.data ?? [];
    const current = all.filter((row) => row.quarter === quarter);
    const totals = totalsFor(current);
    const prevTotals = totalsFor(all.filter((row) => row.quarter === previousQuarter(quarter)));

    const rows: AiTemplateRow[] = current
      .map((row) => ({
        ...row,
        shareOfTotal: totals.prototypes > 0 ? Math.round((row.prototypes_created / totals.prototypes) * 100) : 0,
      }))
      .sort((a, b) => b.prototypes_created - a.prototypes_created);

    const quarters = sortQuarters([...new Set(all.map((row) => row.quarter).filter(Boolean))]);

    const trend = quarters.map((q) => {
      const t = totalsFor(all.filter((row) => row.quarter === q));
      return { quarter: q, prototypes: t.prototypes, bloomShare: t.bloomShare ?? 0 };
    });

    const delta = (now: number | null, before: number | null) =>
      now === null || before === null || before === 0 ? null : Math.round(((now - before) / before) * 100);

    return {
      totals,
      prevTotals,
      prototypesDelta: delta(totals.prototypes, prevTotals.prototypes),
      shareDelta:
        totals.bloomShare === null || prevTotals.bloomShare === null
          ? null
          : totals.bloomShare - prevTotals.bloomShare,
      rows,
      trend,
      quarters: [...quarters].reverse(),
    };
  }, [query.data, quarter]);

  return {
    ...derived,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
};
