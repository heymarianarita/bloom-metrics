import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Qualitative metrics: a free-text dataset column summarised into themes (see server/qualitative). */

export type QuestionTone = "positive" | "improvement" | "neutral";

export interface QualitativeBreakdown {
  /** "column": split by the column's values; "business_unit": map a team column to GetDX business units. */
  kind: "column" | "business_unit";
  column: string;
  label: string;
}

export interface QualitativeSource {
  id: string;
  name: string;
  description: string;
  group_name: string;
  dataset_id: string;
  period_column: string;
  /** The free-text column this metric summarises. */
  text_column: string;
  tone: QuestionTone;
  breakdowns: QualitativeBreakdown[];
  enabled: boolean;
  sort_order: number;
  run_status: "idle" | "running" | "done" | "error";
  run_message: string;
  run_at: string | null;
}

export interface SegmentView {
  key: string;
  type: string;
  value: string;
  responses: number;
  nonAnswers: number;
  untagged: number;
  answered: number;
  themes: { id: string; count: number }[];
  summary: string | null;
}

export interface QualitativeGroupView {
  sources: {
    id: string;
    name: string;
    runStatus: QualitativeSource["run_status"];
    runMessage: string;
    runAt: string | null;
    breakdowns: { label: string; available: boolean }[];
    /** Oldest first. */
    periods: string[];
    questions: {
      column: string;
      label: string;
      tone: QuestionTone;
      themes: { id: string; name: string; description: string }[];
      /** AI summary of how the answers evolved across all periods. */
      trendSummary: string | null;
      periods: Record<string, { segments: SegmentView[]; excerpts: Record<string, string[]> }>;
    }[];
  }[];
}

/** Calls /api/functions/qualitative, surfacing the server's error message. */
const invoke = async <T,>(path: string, options?: { body?: unknown; method?: string }) => {
  const method = options?.method ?? "POST";
  const res = await fetch(`/api/functions/${path}`, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(options?.body ?? {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
};

export const useQualitativeSources = () =>
  useQuery({
    queryKey: ["qualitative-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("qualitative_sources").select("*").order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as QualitativeSource[];
    },
    // While a run is going, keep its progress message fresh.
    refetchInterval: (q) => ((q.state.data as QualitativeSource[] | undefined)?.some((s) => s.run_status === "running") ? 3000 : false),
  });

/** What the metric group page shows; polls while a run is in progress. */
export const useQualitativeGroup = (group: string) =>
  useQuery({
    queryKey: ["qualitative-group", group],
    queryFn: () => invoke<QualitativeGroupView>(`qualitative?group=${encodeURIComponent(group)}`, { method: "GET" }),
    refetchInterval: (q) =>
      (q.state.data as QualitativeGroupView | undefined)?.sources.some((s) => s.runStatus === "running") ? 5000 : false,
  });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["qualitative-sources"] }),
      qc.invalidateQueries({ queryKey: ["qualitative-group"] }),
    ]);
};

export const useSaveQualitativeSource = () => {
  const invalidate = useInvalidate();
  return useMutation({
    /** Returns the saved row's id. */
    mutationFn: async (source: Partial<QualitativeSource> & { name: string }): Promise<string> => {
      const { id, run_status: _s, run_message: _m, run_at: _a, ...fields } = source;
      if (id) {
        const { error } = await supabase.from("qualitative_sources").update(fields as never).eq("id", id);
        if (error) throw new Error(error.message);
        return id;
      }
      const { data, error } = await supabase.from("qualitative_sources").insert(fields as never).select("id").single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },
    onSuccess: invalidate,
  });
};

export const useDeleteQualitativeSource = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qualitative_sources").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
};

/** Starts the analysis (find themes, tag answers, write summaries) in the background. */
export const useRunQualitative = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (sourceId: string) => invoke<{ ok: boolean; started: boolean }>("qualitative", { body: { action: "run", sourceId } }),
    onSuccess: invalidate,
  });
};
