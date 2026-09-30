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
  /** Set on a subgroup: the group it belongs to (one level deep). */
  parent_id: string | null;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  periodicity: Periodicity;
}

export const slugifyGroup = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Top-level groups in order, each with its subgroups in order. */
export const groupTree = (groups: MetricGroup[]) => {
  const byOrder = (a: MetricGroup, b: MetricGroup) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  return groups
    .filter((g) => !g.parent_id)
    .sort(byOrder)
    .map((group) => ({ group, children: groups.filter((g) => g.parent_id === group.id).sort(byOrder) }));
};

/** "Adoption", "Adoption › Web", … — for pickers that point something at a group or subgroup. */
export const groupOptions = (groups: MetricGroup[]) =>
  groupTree(groups).flatMap(({ group, children }) => [
    { value: group.id, label: group.name },
    ...children.map((c) => ({ value: c.id, label: `${group.name} › ${c.name}` })),
  ]);

/** Where a metric sits: its subgroup if it has one, else the top-level group named in `surface`. */
export const metricGroupId = (groups: MetricGroup[], metric: { surface: string; subgroup_id?: string | null }) =>
  metric.subgroup_id && groups.some((g) => g.id === metric.subgroup_id)
    ? metric.subgroup_id
    : groups.find((g) => !g.parent_id && g.name === metric.surface)?.id ?? "";

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
      parent_id?: string | null;
      name: string;
      description?: string;
      sort_order?: number;
      periodicity?: Periodicity;
      /** All groups, so a subgroup's slug can avoid clashing with another group's. */
      existing?: MetricGroup[];
    }) => {
      let slug = slugifyGroup(group.name);
      const parent = group.existing?.find((g) => g.id === group.parent_id);
      if (parent && group.existing?.some((g) => g.slug === slug && g.id !== group.id)) slug = `${parent.slug}-${slug}`;
      const payload = {
        ...(group.id ? { id: group.id } : {}),
        parent_id: group.parent_id ?? null,
        slug,
        name: group.name.trim(),
        description: group.description ?? "",
        sort_order: group.sort_order ?? 0,
        periodicity: group.periodicity ?? "quarterly",
      };
      const { error } = await supabase
        .from("metric_groups")
        .upsert(payload as never, { onConflict: "slug" });
      if (error) throw new Error(error.message);
      // Metrics and qualitative insights point at a top-level group by name: follow a rename.
      const before = group.existing?.find((g) => g.id === group.id);
      if (before && !before.parent_id && before.name !== payload.name) {
        const { error: metricsError } = await supabase
          .from("manual_metrics")
          .update({ surface: payload.name } as never)
          .eq("surface", before.name);
        if (metricsError) throw new Error(metricsError.message);
        const { error: qualitativeError } = await supabase
          .from("qualitative_sources")
          .update({ group_name: payload.name } as never)
          .eq("group_name", before.name);
        if (qualitativeError) throw new Error(qualitativeError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-groups"] });
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["qualitative-sources"] });
    },
  });
};

/** Saves a new order for sibling tabs (or any rows of `table`): position = index. */
export const reorderRows = async (table: "metric_groups" | "manual_metrics" | "qualitative_sources", ids: string[]) => {
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase.from(table).update({ sort_order: index } as never).eq("id", id);
    if (error) throw new Error(error.message);
  }
};

export const useReorder = (table: "metric_groups" | "manual_metrics" | "qualitative_sources") => {
  const queryClient = useQueryClient();
  const key = { metric_groups: "metric-groups", manual_metrics: "manual-metrics", qualitative_sources: "qualitative-sources" }[table];
  return useMutation({
    mutationFn: (ids: string[]) => reorderRows(table, ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
};

export const useDeleteMetricGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Subgroups go with their group; their metrics stay in the top-level group.
      const { data: children } = await supabase.from("metric_groups").select("id").eq("parent_id", id);
      for (const groupId of [id, ...((children ?? []) as { id: string }[]).map((c) => c.id)]) {
        const { error: unlink } = await supabase
          .from("manual_metrics")
          .update({ subgroup_id: null } as never)
          .eq("subgroup_id", groupId);
        if (unlink) throw new Error(unlink.message);
        const { error } = await supabase.from("metric_groups").delete().eq("id", groupId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-groups"] });
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
    },
  });
};
