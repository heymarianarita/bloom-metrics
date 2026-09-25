import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Periodicity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "yearly";

export const PERIODICITY_OPTIONS: { value: Periodicity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semiannual", label: "Every 6 months" },
  { value: "yearly", label: "Yearly" },
];

export interface MetricGroup {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  periodicity: Periodicity;
}

export const slugifyGroup = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const useMetricGroups = () =>
  useQuery({
    queryKey: ["metric-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_groups")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MetricGroup[];
    },
  });

export const useSaveMetricGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (group: {
      id?: string;
      name: string;
      description?: string;
      sort_order?: number;
      periodicity?: Periodicity;
    }) => {
      const payload = {
        ...(group.id ? { id: group.id } : {}),
        slug: slugifyGroup(group.name),
        name: group.name.trim(),
        description: group.description ?? "",
        sort_order: group.sort_order ?? 0,
        periodicity: group.periodicity ?? "quarterly",
      };
      const { error } = await supabase
        .from("metric_groups")
        .upsert(payload as never, { onConflict: "slug" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metric-groups"] }),
  });
};

export const useDeleteMetricGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metric_groups").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metric-groups"] }),
  });
};
