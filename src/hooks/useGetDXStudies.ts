import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DxStudy, DxStudyData } from "@/lib/getdxSync";

type Result<T> = { ok: true } & T;

const unwrap = <T,>(data: unknown, error: unknown): Result<T> => {
  if (error) throw error instanceof Error ? error : new Error(String(error));
  const body = data as { ok?: boolean; error?: string } | null;
  if (!body?.ok) throw new Error(body?.error ?? "GetDX did not answer");
  return body as Result<T>;
};

/** Every GetDX study, newest first. Each load runs a query in GetDX, so it's kept a while. */
export const useGetDXStudies = (enabled = true) =>
  useQuery({
    queryKey: ["getdx-studies"],
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("getdx-studies", { method: "GET" });
      return unwrap<{ studies: DxStudy[] }>(data, error).studies;
    },
  });

/** The studies' questions and every submitted response, always fresh. */
export const useGetDXStudyResponses = (studyIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: ["getdx-study-responses", studyIds.join(",")],
    enabled: enabled && studyIds.length > 0,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("getdx-studies", { body: { studyIds } });
      return unwrap<DxStudyData>(data, error) as DxStudyData;
    },
  });
