import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import express, { type NextFunction, type Request, type Response, type Router } from "express";
import { query, toIso, toMysqlDatetime, transaction } from "./db.ts";
import {
  ALLOWED_EMAIL_DOMAIN,
  googleEnabled,
  hasRole,
  isAllowedEmail,
  issueSession,
  publicUrl,
  readSession,
  type AppRole,
  type SessionUser,
} from "./auth.ts";

/**
 * Email + password sign-in for people an admin has added (no self sign-up).
 * Admins hand out one-time links to set or reset a password. Identity is the
 * @vinted.com email on `profiles`, the same key Google sign-in uses, so turning
 * Google on later (and AUTH_PASSWORD=off) keeps everyone's roles and history.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MIN_PASSWORD = 12;
const LINK_DAYS: Record<LinkPurpose, number> = { invite: 7, reset: 1, setup: 1 };

type LinkPurpose = "invite" | "reset" | "setup";

export const passwordEnabled = () => process.env.AUTH_PASSWORD !== "off";

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(actual, expected);
}

// A fixed hash so unknown emails take as long as wrong passwords.
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Creates a one-time link, replacing any earlier unused link for the same person. */
async function createLink(userId: string, purpose: LinkPurpose, createdBy: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + LINK_DAYS[purpose] * 24 * 3600 * 1000);
  await transaction(async (conn) => {
    await conn.query("DELETE FROM password_links WHERE user_id = ? AND used_at IS NULL", [userId]);
    await conn.query(
      "INSERT INTO password_links (token_hash, user_id, purpose, created_by, expires_at) VALUES (?, ?, ?, ?, ?)",
      [sha256(token), userId, purpose, createdBy, toMysqlDatetime(expires)],
    );
  });
  // In the fragment, so the token never reaches server or proxy logs.
  return { link: `${publicUrl()}/auth/set-password#token=${token}`, expires_at: expires.toISOString() };
}

async function findLink(token: unknown) {
  if (typeof token !== "string" || token.length < 20) return null;
  const rows = await query<{ user_id: string; purpose: LinkPurpose; email: string; display_name: string | null; avatar_url: string | null }>(
    `SELECT l.user_id, l.purpose, p.email, p.display_name, p.avatar_url
       FROM password_links l JOIN profiles p ON p.id = l.user_id
      WHERE l.token_hash = ? AND l.used_at IS NULL AND l.expires_at > CURRENT_TIMESTAMP(6)`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

/** Slows down password guessing: 5 failures per email or 20 per IP in 15 minutes. */
const failures = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const tooMany = (key: string, limit: number) => {
  const recent = (failures.get(key) ?? []).filter((t) => Date.now() - t < WINDOW_MS);
  failures.set(key, recent);
  return recent.length >= limit;
};
const recordFailure = (...keys: string[]) => keys.forEach((k) => failures.set(k, [...(failures.get(k) ?? []), Date.now()]));

const toSessionUser = (p: { user_id: string; email: string; display_name: string | null; avatar_url: string | null }): SessionUser => ({
  id: p.user_id,
  email: p.email,
  name: p.display_name,
  avatar_url: p.avatar_url,
});

const validPassword = (pw: unknown): pw is string => typeof pw === "string" && pw.length >= MIN_PASSWORD && pw.length <= 200;

/**
 * Local development only: gives every admin in the (throwaway) dev database the
 * DEV_ADMIN_PASSWORD from .env, so admin screens can be tested without setup links.
 * Refuses to run in production or when the app isn't served from localhost.
 */
export async function applyDevAdminPassword() {
  const password = process.env.DEV_ADMIN_PASSWORD;
  if (!password) return;
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(publicUrl());
  if (process.env.NODE_ENV === "production" || !local) {
    console.warn("DEV_ADMIN_PASSWORD ignored: only used for local development");
    return;
  }
  // No length rule here: this password only exists in the throwaway local database.
  const admins = await query<{ id: string; email: string }>(
    "SELECT p.id, p.email FROM profiles p JOIN user_roles r ON r.user_id = p.id AND r.role = 'admin'",
  );
  const hash = await hashPassword(password);
  for (const a of admins) {
    await query(
      `INSERT INTO user_passwords (user_id, password_hash) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP(6)`,
      [a.id, hash],
    );
  }
  console.log(`[dev] admins can sign in with DEV_ADMIN_PASSWORD: ${admins.map((a) => a.email).join(", ") || "none found"}`);
}

/**
 * Admins who can't sign in yet (e.g. right after the Lovable import) get a setup
 * link in the server log on start. Nothing is printed once they have a password.
 */
export async function logAdminSetupLinks() {
  if (!passwordEnabled()) return;
  const admins = await query<{ id: string; email: string }>(
    `SELECT p.id, p.email FROM profiles p
       JOIN user_roles r ON r.user_id = p.id AND r.role = 'admin'
      WHERE NOT EXISTS (SELECT 1 FROM user_passwords w WHERE w.user_id = p.id)`,
  );
  for (const a of admins) {
    const { link } = await createLink(a.id, "setup", null);
    console.log(`[admin setup] ${a.email} has no password yet. One-time link (24h): ${link}`);
  }
}

/** Passes async errors to Express' error handler (Express 4 does not). */
const h =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export function passwordRouter(): Router {
  const r = express.Router();

  r.get("/api/auth/providers", (_req, res) => {
    res.json({ password: passwordEnabled(), google: googleEnabled() });
  });

  r.post("/api/auth/login", h(async (req: Request, res: Response) => {
    if (!passwordEnabled()) return void res.status(404).json({ error: "Password sign-in is turned off" });
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const ip = req.ip ?? "unknown";
    if (tooMany(`e:${email}`, 5) || tooMany(`i:${ip}`, 20)) {
      return void res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
    }

    const rows = await query<{ user_id: string; email: string; display_name: string | null; avatar_url: string | null; password_hash: string }>(
      `SELECT p.id AS user_id, p.email, p.display_name, p.avatar_url, w.password_hash
         FROM profiles p JOIN user_passwords w ON w.user_id = p.id WHERE LOWER(p.email) = ?`,
      [email],
    );
    const ok = await verifyPassword(password, rows[0]?.password_hash ?? (await DUMMY_HASH));
    if (!rows[0] || !ok) {
      recordFailure(`e:${email}`, `i:${ip}`);
      return void res.status(401).json({ error: "Email or password is incorrect." });
    }
    failures.delete(`e:${email}`);
    await issueSession(res, toSessionUser(rows[0]));
    res.json({ ok: true });
  }));

  r.post("/api/auth/link-info", h(async (req: Request, res: Response) => {
    const link = await findLink(req.body?.token);
    if (!link) return void res.status(400).json({ error: "This link has expired or was already used. Ask an admin for a new one." });
    res.json({ email: link.email, display_name: link.display_name, purpose: link.purpose, min_length: MIN_PASSWORD });
  }));

  r.post("/api/auth/set-password", h(async (req: Request, res: Response) => {
    const link = await findLink(req.body?.token);
    if (!link) return void res.status(400).json({ error: "This link has expired or was already used. Ask an admin for a new one." });
    if (!validPassword(req.body?.password)) {
      return void res.status(400).json({ error: `Use at least ${MIN_PASSWORD} characters.` });
    }
    const hash = await hashPassword(req.body.password);
    const name = typeof req.body?.display_name === "string" ? req.body.display_name.trim().slice(0, 120) : "";
    await transaction(async (conn) => {
      await conn.query(
        `INSERT INTO user_passwords (user_id, password_hash) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP(6)`,
        [link.user_id, hash],
      );
      await conn.query("UPDATE password_links SET used_at = CURRENT_TIMESTAMP(6) WHERE token_hash = ?", [sha256(req.body.token)]);
      if (name) await conn.query("UPDATE profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [name, link.user_id]);
    });
    await issueSession(res, toSessionUser({ ...link, display_name: name || link.display_name }));
    res.json({ ok: true });
  }));

  // ---- admin: people management ---------------------------------------------

  const requireAdmin = async (req: Request, res: Response) => {
    const user = await readSession(req);
    if (!user || !(await hasRole(user.id, "admin"))) {
      res.status(403).json({ error: "Only admins can manage people" });
      return null;
    }
    return user;
  };

  r.get("/api/admin/people/status", h(async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;
    const rows = await query<{ user_id: string; has_password: number; link_expires_at: string | null }>(
      `SELECT p.id AS user_id,
              EXISTS (SELECT 1 FROM user_passwords w WHERE w.user_id = p.id) AS has_password,
              (SELECT MAX(l.expires_at) FROM password_links l
                WHERE l.user_id = p.id AND l.used_at IS NULL AND l.expires_at > CURRENT_TIMESTAMP(6)) AS link_expires_at
         FROM profiles p`,
    );
    res.json({
      password: passwordEnabled(),
      people: rows.map((r) => ({ user_id: r.user_id, has_password: Boolean(r.has_password), link_expires_at: toIso(r.link_expires_at) })),
    });
  }));

  r.post("/api/admin/people", h(async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const displayName = String(req.body?.display_name ?? "").trim().slice(0, 120);
    const role = req.body?.role as AppRole;
    if (!isAllowedEmail(email) || !/^[^\s@]+@[^\s@]+$/.test(email)) {
      return void res.status(400).json({ error: `Use a @${ALLOWED_EMAIL_DOMAIN} email address.` });
    }
    if (!["admin", "editor", "viewer"].includes(role)) return void res.status(400).json({ error: "Pick a role." });

    const existing = await query<{ id: string }>("SELECT id FROM profiles WHERE LOWER(email) = ?", [email]);
    const userId = existing[0]?.id ?? randomUUID();
    await transaction(async (conn) => {
      if (!existing[0]) {
        await conn.query("INSERT INTO profiles (id, email, display_name) VALUES (?, ?, ?)", [userId, email, displayName || email.split("@")[0]]);
      } else if (displayName) {
        await conn.query("UPDATE profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP(6) WHERE id = ?", [displayName, userId]);
      }
      await conn.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      await conn.query("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)", [randomUUID(), userId, role]);
    });
    const hasPassword = (await query("SELECT 1 FROM user_passwords WHERE user_id = ?", [userId])).length > 0;
    const link = passwordEnabled() && !hasPassword ? await createLink(userId, "invite", admin.id) : null;
    res.status(existing[0] ? 200 : 201).json({ user_id: userId, existed: Boolean(existing[0]), has_password: hasPassword, ...link });
  }));

  r.post("/api/admin/people/:id/link", h(async (req: Request, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!passwordEnabled()) return void res.status(400).json({ error: "Password sign-in is turned off" });
    const found = await query<{ id: string; has_password: number }>(
      "SELECT p.id, EXISTS (SELECT 1 FROM user_passwords w WHERE w.user_id = p.id) AS has_password FROM profiles p WHERE p.id = ?",
      [req.params.id],
    );
    if (!found[0]) return void res.status(404).json({ error: "Person not found" });
    res.json(await createLink(found[0].id, found[0].has_password ? "reset" : "invite", admin.id));
  }));

  return r;
}
