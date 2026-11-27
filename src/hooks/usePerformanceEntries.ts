import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceEntry {
  id: string;
  quarter: string;
  team: string;
  intended_outcomes: string;
  main_deliverables: string;
  headcount: string;
  discovery_rag: string;
  delivery_rag: string;
  impact_rag: string;
  comment: string;
  sort_order: number;
}

export type PerformanceEntryDraft = Omit<PerformanceEntry, "id">;

export const usePerformanceEntries = () =>
  useQuery({
    queryKey: ["performance-entries"],
    queryFn: async (): Promise<PerformanceEntry[]> => {
      const { data, error } = await supabase
        .from("performance_entries")
        .select(
          "id, quarter, team, intended_outcomes, main_deliverables, headcount, discovery_rag, delivery_rag, impact_rag, comment, sort_order",
        )
        .order("quarter", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PerformanceEntry[];
    },
  });

/** Saves a quarter's rows. `replace` wipes the quarter first, otherwise rows are appended. */
export const useSavePerformanceQuarter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quarter,
      rows,
      replace,
    }: {
      quarter: string;
      rows: PerformanceEntryDraft[];
      replace: boolean;
    }) => {
      if (replace) {
        const { error } = await supabase
          .from("performance_entries")
          .delete()
          .eq("quarter", quarter);
        if (error) throw new Error(error.message);
      }
      if (rows.length > 0) {
        const { error } = await supabase.from("performance_entries").insert(rows);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance-entries"] }),
  });
};

export const useDeletePerformanceQuarter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quarter: string) => {
      const { error } = await supabase
        .from("performance_entries")
        .delete()
        .eq("quarter", quarter);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance-entries"] }),
  });
};
