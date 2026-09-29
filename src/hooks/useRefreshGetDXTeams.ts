import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Editors: fetch the team tree from GetDX now instead of waiting for the monthly refresh. */
export const useRefreshGetDXTeams = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("getdx-teams?refresh=1", { method: "GET" });
      if (error) throw error;
      const body = data as { ok: boolean; error?: string; refreshError?: string; teams: unknown[] };
      if (!body.ok || body.refreshError) throw new Error(body.refreshError ?? body.error ?? "GetDX refresh failed");
      return body;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["getdx-teams"] }),
  });
};
