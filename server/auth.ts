import { randomBytes, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response, Router } from "express";
import express from "express";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { execute, query } from "./db.ts";

/**
 * Sessions and Google sign-in for @vinted.com accounts, replacing Lovable Cloud auth.
 * The session is a signed JWT in an HttpOnly cookie; profiles and roles keep
 * their Lovable ids, matched by email on sign-in. Google is used when
 * GOOGLE_CLIENT_ID is set; password sign-in lives in passwords.ts.
 */

export const ALLOWED_EMAIL_DOMAIN = "vinted.com";
export type AppRole = "admin" | "editor" | "viewer";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

const SESSION_COOKIE = "bloom_session";
const STATE_COOKIE = "bloom_oauth_state";
const SESSION_DAYS = 30;

const secret = () => {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(raw);
};

export const publicUrl = () => (process.env.PUBLIC_URL ?? "http://localhost:8080").replace(/\/$/, "");
const redirectUri = () => `${publicUrl()}/auth/google/callback`;
const secureCookies = () => publicUrl().startsWith("https://");

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const cookieOpts = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: secureCookies(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeMs,
});

export async function readSession(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

export async function rolesOf(userId: string): Promise<AppRole[]> {
  const rows = await query<{ role: AppRole }>("SELECT role FROM user_roles WHERE user_id = ?", [userId]);
  return rows.map((r) => r.role);
}

export const hasRole = async (userId: string | undefined, role: AppRole) =>
  Boolean(userId) && (await rolesOf(userId!)).includes(role);

export const canEdit = async (userId: string | undefined) => {
  if (!userId) return false;
  const roles = await rolesOf(userId);
  return roles.includes("admin") || roles.includes("editor");
};

export const adminExists = async () =>
  (await query("SELECT 1 FROM user_roles WHERE role = 'admin' LIMIT 1")).length > 0;

export const isAllowedEmail = (email?: string) =>
  Boolean(email && email.toLowerCase().split("@")[1] === ALLOWED_EMAIL_DOMAIN);

/** Finds the profile by email (keeps Lovable ids) or creates it with a viewer role, like handle_new_user did. */
async function upsertUser(claims: { email: string; name?: string; picture?: string }): Promise<SessionUser> {
  const email = claims.email.toLowerCase();
  const existing = await query<{ id: string; display_name: string | null; avatar_url: string | null }>(
    "SELECT id, display_name, avatar_url FROM profiles WHERE LOWER(email) = ?",
    [email],
  );

  let id: string;
  if (existing[0]) {
    id = existing[0].id;
    await execute(
      "UPDATE profiles SET avatar_url = COALESCE(?, avatar_url), display_name = COALESCE(display_name, ?), updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?",
      [claims.picture ?? null, claims.name ?? null, id],
    );
  } else {
    id = randomUUID();
    await execute("INSERT INTO profiles (id, email, display_name, avatar_url) VALUES (?, ?, ?, ?)", [
      id,
      email,
      claims.name ?? email.split("@")[0],
      claims.picture ?? null,
    ]);
    await execute("INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'viewer')", [randomUUID(), id]);
  }

  return {
    id,
    email,
    name: claims.name ?? existing[0]?.display_name ?? null,
    avatar_url: claims.picture ?? existing[0]?.avatar_url ?? null,
  };
}

/** Signs the user in on this browser. */
export async function issueSession(res: Response, user: SessionUser) {
  const jwt = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  res.cookie(SESSION_COOKIE, jwt, cookieOpts(SESSION_DAYS * 24 * 3600 * 1000));
}

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Shape the frontend's supabase-js stand-in expects for `session.user`. */
export const toClientUser = (u: SessionUser) => ({
  id: u.id,
  email: u.email,
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: u.name, name: u.name, avatar_url: u.avatar_url, email: u.email },
});

/** Passes async errors to Express' error handler (Express 4 does not). */
const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export function authRouter(): Router {
  const r = express.Router();

  r.get("/auth/google", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !googleEnabled()) {
      res.status(500).send("Google sign-in is not configured (GOOGLE_CLIENT_ID missing).");
      return;
    }
    const state = randomBytes(24).toString("base64url");
    const next = typeof req.query.next === "string" && req.query.next.startsWith("/") ? req.query.next : "/";
    res.cookie(STATE_COOKIE, JSON.stringify({ state, next }), cookieOpts(10 * 60 * 1000));
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      hd: ALLOWED_EMAIL_DOMAIN,
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  r.get("/auth/google/callback", h(async (req: Request, res: Response) => {
    const fail = (reason: string) => res.redirect(`/auth?error=${encodeURIComponent(reason)}`);
    try {
      const saved = JSON.parse(req.cookies?.[STATE_COOKIE] ?? "null") as { state: string; next: string } | null;
      res.clearCookie(STATE_COOKIE, { path: "/" });
      if (!saved || typeof req.query.state !== "string" || req.query.state !== saved.state) {
        return fail("Sign-in expired, please try again.");
      }
      if (typeof req.query.code !== "string") return fail(String(req.query.error ?? "Sign-in was cancelled."));

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: req.query.code,
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          redirect_uri: redirectUri(),
          grant_type: "authorization_code",
        }),
      });
      const tokens = (await tokenRes.json()) as { id_token?: string; error_description?: string };
      if (!tokenRes.ok || !tokens.id_token) return fail(tokens.error_description ?? "Google rejected the sign-in.");

      const { payload } = await jwtVerify(tokens.id_token, googleJwks, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const email = String(payload.email ?? "");
      if (!payload.email_verified || !isAllowedEmail(email) || payload.hd !== ALLOWED_EMAIL_DOMAIN) {
        return fail(`Only @${ALLOWED_EMAIL_DOMAIN} Google accounts can sign in.`);
      }

      const user = await upsertUser({
        email,
        name: payload.name as string | undefined,
        picture: payload.picture as string | undefined,
      });
      await issueSession(res, user);
      res.redirect(saved.next || "/");
    } catch (e) {
      console.error("google callback failed", e);
      fail("Sign-in failed, please try again.");
    }
  }));

  r.get("/api/auth/session", h(async (req: Request, res: Response) => {
    const user = await readSession(req);
    res.json({ user: user ? toClientUser(user) : null });
  }));

  r.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  return r;
}
