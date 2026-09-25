import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Team name → business unit name. */
export type TeamBusinessUnitMap = Record<string, string>;

const KEY = "team_business_units";

export const isTeamLabel = (label: string) => /\bteams?\b/i.test(label);

type DxTeam = { id: string; name: string; parentId: string | null; isParent: boolean; contributors: number };

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** GetDX level that counts as a business unit / group (1 = top of the tree). */
const UNIT_LEVEL = 3;

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
      const payload = dx.data as { teams?: DxTeam[]; historic?: { name: string; path: string[] }[] } | null;
      const teams: DxTeam[] = payload?.teams ?? [];
      const historic = payload?.historic ?? [];
      const byId = new Map(teams.map((t) => [t.id, t]));
      const chain = (t: DxTeam) => {
        const path: DxTeam[] = [t];
        let p = t.parentId ? byId.get(t.parentId) : undefined;
        while (p) {
          path.unshift(p);
          p = p.parentId ? byId.get(p.parentId) : undefined;
        }
        return path;
      };
      const byName = new Map<string, DxTeam[]>();
      teams.forEach((t) => {
        const k = norm(t.name);
        byName.set(k, [...(byName.get(k) ?? []), t]);
      });
      const histByName = new Map(historic.map((h) => [norm(h.name), h]));
      // Current level-3 group names, so historic paths snap onto today's groups.
      const currentUnits = new Set(teams.map((t) => chain(t)[UNIT_LEVEL - 1]?.name).filter(Boolean) as string[]);

      /** Name variants: "Späti/Spaeti" → both halves, "Zebra2-tmp" → "zebra". */
      const variants = (raw: string) => {
        const parts = raw.split(/[/|,]/).map(norm).filter(Boolean);
        const loose = parts.map((p) => p.replace(/\b(tmp|temp|old|new|team)\b/g, "").replace(/\d+/g, "").replace(/\s+/g, " ").trim());
        return Array.from(new Set([norm(raw), ...parts, ...loose].filter(Boolean)));
      };

      const fromCurrent = (key: string) => {
        const candidates = byName.get(key) ?? [];
        // Prefer the Design tree, then real teams (leaves), then deepest match.
        const inDesign = (t: DxTeam) => Number(chain(t)[1]?.name === "Design");
        const best = [...candidates].sort(
          (a, b) =>
            inDesign(b) - inDesign(a) ||
            Number(a.isParent) - Number(b.isParent) ||
            chain(b).length - chain(a).length ||
            b.contributors - a.contributors,
        )[0];
        if (!best) return undefined;
        const path = chain(best);
        return (path[UNIT_LEVEL - 1] ?? path[path.length - 1]).name;
      };
      const fromHistoric = (key: string) => {
        const h = histByName.get(key);
        if (!h) return undefined;
        // Walk up from the old parent to the nearest group that still exists
        // today (snapshot names may carry an owner suffix, e.g. "Marketplace Jane Doe").
        const units = Array.from(currentUnits);
        for (const n of [...h.path].reverse().slice(1)) {
          const k = norm(n);
          const hit = units.find((u) => k === norm(u)) ?? units.find((u) => k.startsWith(norm(u) + " "));
          if (hit) return hit;
        }
        return undefined;
      };

      const map: TeamBusinessUnitMap = {};
      for (const raw of known) {
        if (overrides[raw]) { map[raw] = overrides[raw]; continue; }
        const keys = variants(raw);
        const unit =
          keys.map(fromCurrent).find(Boolean) ??
          keys.map(fromHistoric).find(Boolean);
        if (unit) map[raw] = norm(unit) === "marketplace product" ? "Marketplace" : unit;
      }
      return map;
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
