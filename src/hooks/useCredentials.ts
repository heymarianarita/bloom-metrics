import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CredentialStatus {
  name: string;
  updated_at: string;
  updated_by: string | null;
  /** False when the server can no longer decrypt it (the encryption key changed): save it again. */
  readable?: boolean;
}

/** Credential names the settings area can manage, grouped by source. */
export const CREDENTIAL_DEFS: {
  sourceKey: string;
  name: string;
  label: string;
  helper: string;
  secret: boolean;
}[] = [
  {
    sourceKey: "figma",
    name: "FIGMA_ACCESS_TOKEN",
    label: "Figma access token",
    helper: "Figma → Settings → Security → personal access token with file and library analytics read access.",
    secret: true,
  },
  {
    sourceKey: "atlassian_goals",
    name: "ATLASSIAN_EMAIL",
    label: "Atlassian account email",
    helper: "The account the API token belongs to.",
    secret: false,
  },
  {
    sourceKey: "atlassian_goals",
    name: "ATLASSIAN_API_TOKEN",
    label: "Atlassian API token",
    helper: "id.atlassian.com → Security → API tokens.",
    secret: true,
  },
  {
    sourceKey: "atlassian_goals",
    name: "ATLASSIAN_WORKSPACE",
    label: "Atlassian workspace / cloud id",
    helper: "The workspace the goals live in.",
    secret: true,
  },
  {
    sourceKey: "getdx",
    name: "GETDX_API_TOKEN",
    label: "GetDX access token",
    helper: "getdx.com → Settings → Web API → create a token with read access to teams.",
    secret: true,
  },
  {
    sourceKey: "anthropic",
    name: "ANTHROPIC_API_KEY",
    label: "Anthropic API key",
    helper: "platform.claude.com → API keys. Each question in the Insights chat uses API credits.",
    secret: true,
  },
];

export const useCredentialStatus = () =>
  useQuery({
    queryKey: ["credential-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("credential_status");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CredentialStatus[];
    },
  });

export const useSetCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; value: string }) => {
      const { error } = await supabase.rpc("set_credential", {
        _name: input.name,
        _value: input.value,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["credential-status"] }),
  });
};

export const useDeleteCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.rpc("delete_credential", { _name: name });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["credential-status"] }),
  });
};
