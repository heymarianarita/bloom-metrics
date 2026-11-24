import { supabase } from "@/integrations/supabase/client";

/** Calls to the server's own sign-in and people endpoints (server/passwords.ts). */

export interface AuthProviders {
  password: boolean;
  google: boolean;
}

export interface SignInLink {
  link: string;
  expires_at: string;
}

/** Whether the link also went out as a Slack direct message (only when asked to send it). */
export type SlackResult = { sent: true } | { sent: false; error: string };

export interface PersonAuthStatus {
  user_id: string;
  has_password: boolean;
  link_expires_at: string | null;
  first_sign_in_at: string | null;
  last_seen_at: string | null;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error ?? `Request failed (${res.status})`);
  return payload as T;
}

export const getProviders = () => request<AuthProviders>("/api/auth/providers");

/** Signs in and refreshes the session every useSession() listener sees. */
export const signInWithPassword = async (email: string, password: string) => {
  await request("/api/auth/login", { email, password });
  await supabase.auth.setSession({ access_token: "", refresh_token: "" });
};

export const getLinkInfo = (token: string) =>
  request<{ email: string; display_name: string | null; purpose: "invite" | "reset" | "setup"; min_length: number }>(
    "/api/auth/link-info",
    { token },
  );

export const setPasswordFromLink = async (token: string, password: string, displayName?: string) => {
  await request("/api/auth/set-password", { token, password, display_name: displayName });
  await supabase.auth.setSession({ access_token: "", refresh_token: "" });
};

export const getPeopleStatus = () =>
  request<{ password: boolean; slack: boolean; people: PersonAuthStatus[] }>("/api/admin/people/status");

export const addPerson = (input: { email: string; display_name?: string; role: "admin" | "editor" | "viewer"; slack?: boolean }) =>
  request<{ user_id: string; existed: boolean; has_password: boolean; slack?: SlackResult } & Partial<SignInLink>>(
    "/api/admin/people",
    input,
  );

export const createSignInLink = (userId: string, slack = false) =>
  request<SignInLink & { slack?: SlackResult }>(`/api/admin/people/${encodeURIComponent(userId)}/link`, { slack });
