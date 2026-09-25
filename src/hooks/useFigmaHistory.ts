import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** One stored quarter of Figma adoption for a library file. */
export interface FigmaAdoptionSnapshot {
  file_key: string;
  file_name?: string | null;
  quarter: string;
  period_start: string;
  period_end: string;
  inserts: number | null;
  detaches: number | null;
  usages: number | null;
  component_count: number | null;
  components_used: number | null;
  documented_count: number | null;
  documentation_coverage: number | null;
  detach_rate: number | null;
  captured_at: string;
}

export interface FigmaAdoptionDelta extends FigmaAdoptionSnapshot {
  insertsDelta: number | null;
  detachRateDelta: number | null;
  coverageDelta: number | null;
}

/** Quarter-over-quarter deltas, so stat cards can show a trend without extra work. */
function withDeltas(rows: FigmaAdoptionSnapshot[]): FigmaAdoptionDelta[] {
  return rows.map((row, i) => {
    const prev = i > 0 ? rows[i - 1] : undefined;
    const diff = (a?: number | null, b?: number | null) =>
      a === null || a === undefined || b === null || b === undefined ? null : Number((a - b).toFixed(2));
    return {
      ...row,
      insertsDelta: diff(row.inserts, prev?.inserts),
      detachRateDelta: diff(row.detach_rate, prev?.detach_rate),
      coverageDelta: diff(row.documentation_coverage, prev?.documentation_coverage),
    };
  });
}

/**
 * Stored quarterly Figma adoption history.
 *
 * The live Adoption view still calls the Figma API directly for the selected range;
 * this hook reads what the nightly `figma-snapshot` cron has accumulated, which is
 * the only way to show quarter-over-quarter movement (Figma's API is range-only).
 */
export function useFigmaHistory(fileKey?: string) {
  return useQuery<FigmaAdoptionDelta[]>({
    queryKey: ["figma-history", fileKey ?? "all"],
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const query = fileKey ? `?fileKey=${encodeURIComponent(fileKey)}` : "";
      const { data, error } = await supabase.functions.invoke(`figma-snapshot${query}`, {
        method: "GET",
      });
      if (error) throw new Error(error.message);
      return withDeltas(((data as { snapshots?: FigmaAdoptionSnapshot[] })?.snapshots ?? []));
    },
  });
}
