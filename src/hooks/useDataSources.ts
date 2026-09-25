import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DataSourceConfig {
  id: string;
  source_key: string;
  label: string;
  config: Record<string, unknown>;
  enabled: boolean;
  updated_at: string;
}

export interface SyncRun {
  id: string;
  source_key: string;
  status: string;
  message: string;
  row_count: number | null;
  triggered_by: string;
  ran_at: string;
}

/** Every source the settings area can configure, with the fields it exposes. */
export const DATA_SOURCE_DEFS: {
  key: string;
  label: string;
  description: string;
  mode: "dynamic" | "manual";
  fields: { name: string; label: string; placeholder?: string; helper?: string }[];
  credential?: string;
}[] = [
  {
    key: "figma",
    label: "Figma component analytics",
    description: "Design adoption — inserts, detaches and component coverage.",
    mode: "dynamic",
    credential: "FIGMA_ACCESS_TOKEN",
    fields: [],
  },

  {

    key: "ga4_documentation",
    label: "GA4 documentation traffic",
    description: "Documentation site usage.",
    mode: "dynamic",
    fields: [],
  },
  {
    key: "atlassian_goals",
    label: "Atlassian goals",
    description: "Source for OKRs — goals, progress and delivery tracking.",

    mode: "dynamic",
    credential: "ATLASSIAN_API_TOKEN",
    fields: [
      {
        name: "team",
        label: "Team",
        placeholder: "Design System",
        helper: "Only goals owned by this team are shown. Leave empty to show every goal.",
      },
    ],
  },
  {
    key: "getdx",
    label: "GetDX",
    description: "Source for teams and business units.",
    mode: "dynamic",
    credential: "GETDX_API_TOKEN",
    fields: [],
  },
  {
    key: "anthropic",
    label: "AI assistant (Claude)",
    description: "Powers \"Ask the data\" in the Insights panels. Questions are answered from this app's data.",
    mode: "dynamic",
    credential: "ANTHROPIC_API_KEY",
    fields: [],
  },
];

export const useDataSourceConfigs = () =>
  useQuery({
    queryKey: ["data-source-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_source_configs").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DataSourceConfig[];
    },
  });

export const useSaveDataSourceConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source_key: string; label: string; config: Record<string, unknown>; enabled?: boolean }) => {
      const { error } = await supabase
        .from("data_source_configs")
        .upsert(
          {
            source_key: input.source_key,
            label: input.label,
            config: input.config as never,
            enabled: input.enabled ?? true,
          },
          { onConflict: "source_key" }
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["data-source-configs"] }),
  });
};

export const useSyncRuns = (limit = 50) =>
  useQuery({
    queryKey: ["sync-runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_runs")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SyncRun[];
    },
  });
