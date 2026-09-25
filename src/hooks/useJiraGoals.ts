import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Okr } from "./useSheetsAnalytics";

/** An OKR row from Atlassian Goals. Same shape as the Sheet rows, plus a deep link. */
export interface JiraGoalOkr extends Okr {
  url?: string;
  startDate?: string;
  endDate?: string;
  teams?: string[];
}

export interface JiraGoalMetric {
  id: string;
  name: string;
  type: string | null;
  unit: string | null;
  start: number | null;
  target: number | null;
  current: number | null;
  progress: number | null;
}

export interface JiraGoal {
  id: string;
  parentId: string | null;
  parentName: string | null;
  name: string;
  quarter?: string;
  startDate?: string;
  endDate?: string;
  owner?: string;
  plannedStart?: string;
  createdAt?: string;
  lastUpdate?: string;
  watchers?: string[];
  progress: number;
  score?: number | null;
  status?: string;
  url?: string;
  metrics: JiraGoalMetric[];
  projects?: {
    id: string;
    name: string;
    url?: string;
    status?: string;
    contributors?: string[];
    contributorLinks?: { name: string; url?: string }[];
  }[];
}

export interface JiraGoalsResponse {
  goals?: JiraGoal[];
  configured: boolean;
  error?: string;
  details?: string;
  refreshedAt?: string;
  source?: string;
  goalCount?: number;
  teamFilter?: string;
  availableTeams?: string[];
  quarters: string[];
  okrs: JiraGoalOkr[];
}

const parseFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "Atlassian Goals request failed";
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

/**
 * Quarterly OKRs, reported in Atlassian Goals.
 *
 * The metrics Sheet stays the source for survey scores, RAG grades and milestones;
 * OKRs come from here. If the Atlassian secrets are not set the function returns
 * `configured: false` and the OKRs page falls back to the Sheet's `okrs` tab.
 */
export function useJiraGoals() {
  return useQuery<JiraGoalsResponse>({
    queryKey: ["jira-goals"],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("jira-goals", { body: {} });
      if (error) {
        const message = await parseFunctionError(error);
        // Not configured is a normal state, not a failure — let the page fall back.
        if (/not configured/i.test(message)) {
          return { configured: false, details: message, quarters: [], okrs: [] };
        }
        throw new Error(message);
      }
      const response = data as JiraGoalsResponse;
      if (response?.error && response.configured !== false) {
        throw new Error(response.details ? `${response.error}: ${response.details}` : response.error);
      }
      return response;
    },
  });
}
