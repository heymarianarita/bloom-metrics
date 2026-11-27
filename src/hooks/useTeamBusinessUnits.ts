import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  matchTeamBusinessUnits,
  type DxHistoric,
  type DxTeam,
  type TeamBusinessUnitMap,
} from "../../server/shared/teamBusinessUnits.ts";

export type { TeamBusinessUnitMap };

const KEY = "team_business_units";

export const isTeamLabel = (label: string) => /\bteams?\b/i.test(label);

const fetchKnownTeams = async (): Promise<string[]> => {
  const { data: cols, error } = await supabase.from("manual_dataset_columns").select("dataset_id, key, label");
  if (error) throw new Error(error.message);
  const teams = new Set<string>();
  for (const col of (cols ?? []).filter((c) => isTeamLabel(c.label))) {
    const { data: rows } = await supabase.from("manual_dataset_rows").select("data").eq("dataset_id", col.dataset_id);
    (rows ?? []).forEach((r) => {
      const v = String((r.data as Record<string, unknown>)?.[col.key] ?? "").trim();
      if (v) teams.add(v);
    });
  }
  return Array.from(teams);
};

/**
 * Team name → GetDX level-3 group. Each survey team is matched by name to a
 * GetDX team, then walked up the tree to its level-3 ancestor. Manual
 * overrides saved in data_source_configs win over the GetDX match.
 */
export const useTeamBusinessUnits = () =>
  useQuery<TeamBusinessUnitMap>({
    queryKey: ["team-business-units"],
    // GetDX teams come from the server's monthly copy, so there is no need to refetch often.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const [{ data: cfg }, dx, known] = await Promise.all([
        supabase.from("data_source_configs").select("config").eq("source_key", KEY).maybeSingle(),
        supabase.functions.invoke("getdx-teams?historic=1", { method: "GET" }),
        fetchKnownTeams(),
      ]);
      const overrides = ((cfg?.config as { map?: TeamBusinessUnitMap } | null)?.map ?? {}) as TeamBusinessUnitMap;
      const payload = dx.data as { teams?: DxTeam[]; historic?: DxHistoric[] } | null;
      return matchTeamBusinessUnits({ teams: payload?.teams ?? [], historic: payload?.historic ?? [], known, overrides });
    },
  });

export const useSaveTeamBusinessUnits = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (map: TeamBusinessUnitMap) => {
      const clean = Object.fromEntries(
        Object.entries(map).map(([t, b]) => [t.trim(), b.trim()]).filter(([t, b]) => t && b),
      );
      const { error } = await supabase
        .from("data_source_configs")
        .upsert(
          { source_key: KEY, label: "Team business units", config: { map: clean } as never, enabled: true },
          { onConflict: "source_key" },
        );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-business-units"] }),
  });
};

/** Every distinct team name found in dataset columns labelled "Team". */
export const useKnownTeams = () =>
  useQuery<string[]>({
    queryKey: ["known-teams"],
    queryFn: async () => {
      const { data: cols, error } = await supabase
        .from("manual_dataset_columns")
        .select("dataset_id, key, label");
      if (error) throw new Error(error.message);
      const teamCols = (cols ?? []).filter((c) => isTeamLabel(c.label));
      const teams = new Set<string>();
      for (const col of teamCols) {
        const { data: rows, error: rErr } = await supabase
          .from("manual_dataset_rows")
          .select("data")
          .eq("dataset_id", col.dataset_id);
        if (rErr) throw new Error(rErr.message);
        (rows ?? []).forEach((r) => {
          const v = String((r.data as Record<string, unknown>)?.[col.key] ?? "").trim();
          if (v) teams.add(v);
        });
      }
      return Array.from(teams).sort((a, b) => a.localeCompare(b));
    },
  });
