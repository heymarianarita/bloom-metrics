import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GrafanaColumn, GrafanaQuery } from "../../server/shared/grafana.ts";

/** A saved query (Settings → Dynamic sources → Grafana), as stored in its config. */
export interface GrafanaSavedQuery {
  id: string;
  name: string;
  query: GrafanaQuery;
  /** Column whose days a fetch replaces; unset: the first date column; null: none (snapshots). */
  dateColumn?: string | null;
  days?: number;
}

/** What a query's dataset holds. */
export interface GrafanaQueryStatus {
  id: string;
  datasetId: string | null;
  rows: number;
  columns: GrafanaColumn[];
  dateColumn?: string | null;
  firstDay: string | null;
  lastDay: string | null;
}

export const useGrafana = () =>
  useQuery({
    queryKey: ["grafana"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("grafana", { method: "GET" });
      if (error) throw new Error(error.message);
      return data as {
        queries: GrafanaQueryStatus[];
        lastRun: { status: string; message: string; ran_at: string } | null;
        /** Local development: syncs use made-up data instead of Grafana. */
        fake?: boolean;
      };
    },
  });

/** Editors: run every query now (or one, by id) instead of waiting for Monday's sync. */
export const useSyncGrafana = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (query?: string) => {
      const { data, error } = await supabase.functions.invoke("grafana", { method: "POST", body: query ? { query } : {} });
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      return data as { ok: boolean; added: number };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["grafana"] });
      queryClient.invalidateQueries({ queryKey: ["manual-datasets"] });
    },
  });
};
