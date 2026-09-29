import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Elements = { ds: number; greenhouse: number; native: number; untagged: number };

/** One stored ds-analyzer report (one weekly scan of a product repo). */
export interface CodeAdoptionSnapshot {
  repo: string;
  commit_sha: string | null;
  generated_at: string;
  total_files: number | null;
  ds_percent: number | null;
  native_percent: number | null;
  tagged_percent: number | null;
  untagged_percent: number | null;
  summary: {
    totalFiles: number;
    filesWithJsx: number;
    dsCompositionsDetected: number;
    greenhouseRegistrySize: number;
    elements: Elements;
    files: { ds: number; greenhouse: number; untagged: number };
  };
}

/** Adoption for one owning team (GitHub team from CODEOWNERS) inside a repo. */
export interface CodeAdoptionDomain {
  domain: string;
  fileCount: number;
  elements: Elements;
  dsPercent: number | null;
  nativePercent: number | null;
  taggedPercent: number | null;
  untaggedCustomPercent: number | null;
}

export interface CodeAdoptionDetail {
  generated_at: string;
  domains: CodeAdoptionDomain[];
  greenhouse: { name: string; count: number }[];
}

export interface CodeAdoptionRepo {
  repo: string;
  /** GitHub repository the report file lives in, and the metric (sub)group it's shown in. */
  repository: string | null;
  metricGroupId: string | null;
  snapshots: CodeAdoptionSnapshot[];
  latest: CodeAdoptionDetail | null;
  previous: CodeAdoptionDetail | null;
}

export interface CodeAdoptionData {
  configured: boolean;
  reports: CodeReportSource[];
  lastRun: { status: string; message: string; ran_at: string } | null;
  repos: CodeAdoptionRepo[];
}

/** One report file to sync: where it lives on GitHub and which metric (sub)group shows it. */
export interface CodeReportSource {
  repository: string;
  branch: string;
  path: string;
  metricGroupId: string | null;
}

export const useCodeAdoption = () =>
  useQuery<CodeAdoptionData>({
    queryKey: ["code-adoption"],
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("code-adoption", { method: "GET" });
      if (error) throw new Error(error.message);
      return data as CodeAdoptionData;
    },
  });

/** Editors: pull new reports from GitHub now instead of waiting for the daily check. */
export const useSyncCodeAdoption = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("code-adoption", { method: "POST" });
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? error.message);
      }
      return data as { ok: boolean; added: number };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["code-adoption"] });
      queryClient.invalidateQueries({ queryKey: ["sync-runs"] });
    },
  });
};
