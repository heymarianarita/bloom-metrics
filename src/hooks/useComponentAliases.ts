import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Per dataset: platform-specific component name → shared component name. */
export interface ComponentColumn { id: string; datasetId: string; columnKey: string }
export interface ComponentRow { id: string; name: string; cells: Record<string, string[]> }
export interface ComponentTable { id: string; name: string; columns: ComponentColumn[]; rows: ComponentRow[] }

export interface ComponentAliasConfig {
  map: Record<string, Record<string, string>>;
  /** Editable matching tables. When present, `map` is derived from them. */
  tables?: ComponentTable[];
}

/** Builds the dataset → raw → shared-name map from the tables. */
export function mapFromTables(tables: ComponentTable[]) {
  const map: Record<string, Record<string, string>> = {};
  tables.forEach((t) =>
    t.rows.forEach((r) =>
      t.columns.forEach((c) => {
        (r.cells[c.id] ?? []).forEach((v) => {
          const raw = v.trim();
          if (raw && r.name.trim()) (map[c.datasetId] ??= {})[raw] = r.name.trim();
        });
      }),
    ),
  );
  return map;
}

/** Upgrades older saved tables (one name per cell) to lists of names. */
export function normalizeTables(tables: ComponentTable[]): ComponentTable[] {
  return tables.map((t) => ({
    ...t,
    rows: t.rows.map((r) => ({
      ...r,
      cells: Object.fromEntries(
        Object.entries(r.cells ?? {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.map(String) : v ? [String(v)] : [],
        ]),
      ),
    })),
  }));
}

export const DEFAULT_ALIAS_CONFIG: ComponentAliasConfig = { map: {} };

const KEY = "component_aliases";

export const useComponentAliases = () =>
  useQuery<ComponentAliasConfig>({
    queryKey: ["component-aliases"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_source_configs")
        .select("config")
        .eq("source_key", KEY)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const c = (data?.config ?? null) as Partial<ComponentAliasConfig> | null;
      return {
        map: c?.map && typeof c.map === "object" ? c.map : {},
        tables: Array.isArray(c?.tables) ? normalizeTables(c!.tables) : undefined,
      };
    },
  });

export const useSaveComponentAliases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: ComponentAliasConfig) => {
      const { error } = await supabase
        .from("data_source_configs")
        .upsert(
          { source_key: KEY, label: "Component name mapping", config: config as never, enabled: true },
          { onConflict: "source_key" },
        );
      if (error) throw new Error(error.message);
    },
    onMutate: (config) => qc.setQueryData(["component-aliases"], config),
    onSettled: () => qc.invalidateQueries({ queryKey: ["component-aliases"] }),
  });
};

/** Suggested shared name: drops Bloom/Vinted prefixes, a View suffix and "(Deprecated)". */
export function suggestComponentName(raw: string) {
  let out = raw.trim().replace(/\s*\(deprecated\)\s*$/i, "");
  const p = out.match(/^(Bloom|Vinted)(?=[A-Z])/);
  if (p) out = out.slice(p[0].length);
  if (out.length > 4 && out.endsWith("View")) out = out.slice(0, -4);
  return out;
}

/** Maps a dataset's component name to its shared name. */
export function normalizeComponentName(raw: string, config: ComponentAliasConfig, datasetId: string) {
  const name = raw.trim();
  return config.map[datasetId]?.[name] ?? suggestComponentName(name);
}
