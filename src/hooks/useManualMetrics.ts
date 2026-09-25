import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManualMetric {
  id: string;
  slug: string;
  name: string;
  unit: string;
  surface: string;
  description: string;
  sort_order: number;
  archived: boolean;
  dataset_id: string | null;
  value_column: string;
  period_column: string;
  aggregation: "sum" | "avg" | "latest" | "count";
  /** "dataset" reads a manual dataset, "dynamic" reads a connected live source. */
  source_type: "dataset" | "dynamic";
  source_key: string;
  source_field: string;
  /** Dataset column keys that can be used as filters on the Metrics page. */
  filter_columns: string[];
  /** How each filter column's breakdown is shown: column key → "table" | "bar" | "line" | "none". */
  breakdown_views: Record<string, BreakdownView>;
}

export type BreakdownView = "none" | "table" | "bar" | "line";

export const BREAKDOWN_VIEW_OPTIONS: { value: BreakdownView; label: string }[] = [
  { value: "none", label: "Don't show a breakdown" },
  { value: "table", label: "Table" },
  { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart over time" },
];

export interface ManualMetricValue {
  id: string;
  metric_id: string;
  period: string;
  value: number;
  note: string;
  updated_at: string;
}

export const useManualMetrics = () =>
  useQuery({
    queryKey: ["manual-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_metrics")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManualMetric[];
    },
  });

export const useManualMetricValues = (metricId?: string) =>
  useQuery({
    queryKey: ["manual-metric-values", metricId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("manual_metric_values").select("*").order("period", { ascending: false });
      if (metricId) query = query.eq("metric_id", metricId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManualMetricValue[];
    },
  });

export const useSaveManualMetric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (metric: Partial<ManualMetric> & { name: string; slug: string }) => {
      // Editing an existing metric updates that row by id, so renaming it (which
      // changes the slug) never creates a second metric.
      if (metric.id) {
        const { id, ...fields } = metric;
        const { error } = await supabase.from("manual_metrics").update(fields as never).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("manual_metrics").upsert(metric as never, { onConflict: "slug" });
      if (error) throw new Error(error.message);
    },

    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-metrics"] }),
  });
};

export const useDeleteManualMetric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: valueError } = await supabase
        .from("manual_metric_values")
        .delete()
        .eq("metric_id", id);
      if (valueError) throw new Error(valueError.message);
      const { error } = await supabase.from("manual_metrics").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["manual-metric-values"] });
    },
  });
};


export const useSaveManualMetricValue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: { id?: string; metric_id: string; period: string; value: number; note?: string }) => {
      const { error } = await supabase
        .from("manual_metric_values")
        .upsert({ ...value, note: value.note ?? "" } as never, { onConflict: "metric_id,period" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-metric-values"] }),
  });
};

export const useDeleteManualMetricValue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_metric_values").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-metric-values"] }),
  });
};
