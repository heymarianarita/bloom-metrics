import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceQuarter {
  /** Tab name, e.g. "2026-Q1" */
  quarter: string;
  headers: string[];
  rows: string[][];
  /** Indexes of columns whose values are all numeric — chartable */
  numericColumns: number[];
  rowCount: number;
}

export interface PerformanceSheetResponse {
  configured: boolean;
  error?: string;
  details?: string;
  refreshedAt?: string;
  spreadsheetTitle?: string | null;
  quarters: PerformanceQuarter[];
}

const parseFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "Performance sheet request failed";
  const maybeContext = error as { context?: Response; message?: string };
  const text = maybeContext.context ? await maybeContext.context.text() : maybeContext.message ?? fallback;
  try {
    const parsed = JSON.parse(text) as { error?: string; details?: string };
    if (parsed.error && parsed.details) return `${parsed.error}: ${parsed.details}`;
    if (parsed.error) return parsed.error;
  } catch {
    /* fall through to plain text */
  }
  return text || fallback;
};

/** One tab per quarter in the Performance Google Sheet. */
export const usePerformanceSheet = () =>
  useQuery<PerformanceSheetResponse>({
    queryKey: ["performance-sheet"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<PerformanceSheetResponse>(
        "performance-sheet",
      );
      if (error) throw new Error(await parseFunctionError(error));
      return data as PerformanceSheetResponse;
    },
  });
