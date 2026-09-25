import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SurveyMetrics {
  csat?: number;
  efficiency?: number;
  discoverability?: number;
  confidence?: number;
  handoff?: number;
  zhUmux?: number;
  sbUmux?: number;
}

export interface SurveyQuarter {
  all: SurveyMetrics;
  byRole: Record<string, SurveyMetrics>;
  byBU: Record<string, SurveyMetrics>;
}

export interface Milestone {
  id: number;
  name?: string;
  phase?: string;
  status?: string;
  date?: string;
}

export interface RagGrades {
  discovery?: string;
  delivery?: string;
  impact?: string;
}

export interface Okr {
  id: number;
  quarter?: string;
  objective?: string;
  keyResult?: string;
  owner?: string;
  progress: number;
  status?: string;
}

export interface SheetsAnalyticsResponse {
  configured: boolean;
  error?: string;
  details?: string;
  refreshedAt?: string;
  quarters: string[];
  survey: Record<string, SurveyQuarter>;
  milestones: Milestone[];
  rag: Record<string, RagGrades>;
  okrs: Okr[];
  tabsRead?: { survey: boolean; milestones: boolean; rag: boolean; okrs: boolean };
}

const parseFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "Sheets request failed";
  const maybeContext = error as { context?: Response; message?: string };
  const text = maybeContext.context ? await maybeContext.context.text() : maybeContext.message ?? fallback;
  try {
    const parsed = JSON.parse(text) as { error?: string; details?: string };
    if (parsed.error && parsed.details) return `${parsed.error}: ${parsed.details}`;
    if (parsed.error) return parsed.error;
  } catch {
    /* use plain text fallback */
  }
  return text || fallback;
};

/** Survey scores, milestones, RAG grades, and OKRs — all sourced from the team's Google Sheet. */
export function useSheetsAnalytics() {
  return useQuery<SheetsAnalyticsResponse>({
    queryKey: ["sheets-analytics"],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("sheets-analytics", { body: {} });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }
      const response = data as SheetsAnalyticsResponse;
      // Not configured is a normal state, not a failure — pages show setup guidance.
      if (response?.error && response.configured !== false) {
        throw new Error(response.details ? `${response.error}: ${response.details}` : response.error);
      }
      return response;
    },
  });
}
