import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Only accounts on this domain may use the app. */
export const ALLOWED_EMAIL_DOMAIN = "vinted.com";

export type AppRole = "admin" | "editor" | "viewer";

export const isAllowedEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase().split("@")[1] === ALLOWED_EMAIL_DOMAIN);

/** Session state, kept in sync with the auth listener. */
export const useSession = () => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const accept = (next: Session | null) => {
      if (next && !isAllowedEmail(next.user.email)) {
        supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(next);
      setLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      accept(next);
      queryClient.invalidateQueries({ queryKey: ["my-role"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    });
    supabase.auth.getSession().then(({ data }) => accept(data.session));
    return () => listener.subscription.unsubscribe();
  }, [queryClient]);

  return { session, user: session?.user ?? null, loading };
};

/** Highest role held by the signed-in user, or null when they have none. */
export const useMyRole = (user: User | null) =>
  useQuery({
    queryKey: ["my-role", user?.id ?? null],
    enabled: Boolean(user),
    queryFn: async (): Promise<AppRole | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      const roles = (data ?? []).map((r) => r.role as AppRole);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("editor")) return "editor";
      if (roles.includes("viewer")) return "viewer";
      return null;
    },
  });

/** True when the signed-in user holds the admin role. */
export const useIsAdmin = (user: User | null) => {
  const query = useMyRole(user);
  return { ...query, data: query.data === undefined ? undefined : query.data === "admin" };
};

/** True when the signed-in user may change data (admin or editor). */
export const useCanEdit = (user: User | null) => {
  const query = useMyRole(user);
  return {
    ...query,
    data: query.data === undefined ? undefined : query.data === "admin" || query.data === "editor",
  };
};

/** Whether any admin exists yet — used to offer the one-time bootstrap. */
export const useAdminExists = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin-exists"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
  });

export const signOut = () => supabase.auth.signOut();
