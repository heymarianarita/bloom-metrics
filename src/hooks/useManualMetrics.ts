import type { Aggregation, AggregationOptions } from "../../server/shared/aggregate.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { removePlacements } from "@/hooks/useViewItems";

export interface ManualMetric {
  id: string;
  slug: string;
  name: string;
  unit: string;
  /** Name of the metric's top-level group. */
  surface: string;
  /** The subgroup it sits in, if any (a metric_groups row whose parent is `surface`). */
  subgroup_id: string | null;
  description: string;
  sort_order: number;
  archived: boolean;
  dataset_id: string | null;
  value_column: string;
  period_column: string;
  aggregation: Aggregation;
  /** ratio: {denominator_column}; count_if: {op, threshold}. */
  aggregation_options: AggregationOptions;
  /** "dataset" reads a manual dataset, "dynamic" reads a connected live source. */
  source_type: "dataset" | "dynamic";
  source_key: string;
  source_field: string;
  /** Dataset column keys that can be used as filters on the Metrics page. */
  filter_columns: string[];
  /** How each filter column's breakdown is shown: column key → "table" | "bar" | "line" | "none". */
  breakdown_views: Record<string, BreakdownView>;
  /** Which way is good: "up" (more is better), "down" (less is better) or "none". */
  direction: MetricDirection;
  /** What each score means on a rating scale ("1" → "…"); empty when not a rating. */
  scale_labels: Record<string, string>;
}

export type MetricDirection = "up" | "down" | "none";

export const DIRECTION_OPTIONS: { value: MetricDirection; label: string }[] = [
  { value: "up", label: "Going up is good" },
  { value: "down", label: "Going down is good" },
  { value: "none", label: "Neither" },
];

/** How a change reads for this metric: good, bad, or neutral (no change, or no good direction). */
export const changeTone = (direction: MetricDirection | undefined, delta: number | undefined): "good" | "bad" | "neutral" => {
  if (delta === undefined || delta === 0 || direction === "none") return "neutral";
  return (direction === "down" ? delta < 0 : delta > 0) ? "good" : "bad";
};

/** Order of metrics on a tab: as arranged in Metrics → All metrics, ties broken by name. */
export const byTabOrder = (a: Pick<ManualMetric, "sort_order" | "name">, b: Pick<ManualMetric, "sort_order" | "name">) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

/** The scores a rating-scale metric can take. */
export const SCALE_POINTS = ["1", "2", "3", "4", "5"] as const;

/** Meaning of the whole score nearest to an average (4.2 → the "4" label), if defined. */
export const scaleLabelFor = (metric: Pick<ManualMetric, "scale_labels">, value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const key = String(Math.min(5, Math.max(1, Math.round(value))));
  const label = metric.scale_labels?.[key]?.trim();
  return label ? { score: key, label } : undefined;
};

export const hasScaleLabels = (metric: Pick<ManualMetric, "scale_labels">) =>
  SCALE_POINTS.some((p) => metric.scale_labels?.[p]?.trim());

export type BreakdownView = "none" | "table" | "bar" | "line" | "area";

export const BREAKDOWN_VIEW_OPTIONS: { value: BreakdownView; label: string }[] = [
  { value: "none", label: "Don't show a breakdown" },
  { value: "table", label: "Table" },
  { value: "bar", label: "Bar chart" },
  { value: "line", label: "Line chart over time" },
  { value: "area", label: "Stacked area over time" },
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
      // The order set in Metrics → All metrics, everywhere metrics are listed.
      return ((data ?? []) as unknown as ManualMetric[]).sort(byTabOrder);
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
      await removePlacements("number", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["manual-metric-values"] });
      queryClient.invalidateQueries({ queryKey: ["view-items"] });
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
