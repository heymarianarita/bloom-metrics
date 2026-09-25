import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { execute, nowMysql, query } from "./db.ts";

/**
 * Integration credentials (Figma, Atlassian, GetDX…), managed from Settings.
 * Stored AES-256-GCM encrypted with CREDENTIALS_KEY; falls back to an env var
 * of the same name, like the old edge functions did.
 */

const key = () => {
  const raw = process.env.CREDENTIALS_KEY;
  if (!raw) throw new Error("CREDENTIALS_KEY is not set");
  return createHash("sha256").update(raw, "utf8").digest();
};

const encrypt = (plain: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
};

const decrypt = (stored: string) => {
  if (!stored.startsWith("v1:")) return stored;
  const [, iv, tag, data] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
};

/** Whether a stored value can still be decrypted (false after CREDENTIALS_KEY changed). */
export const isReadable = (stored: string) => {
  try {
    decrypt(stored);
    return true;
  } catch {
    return false;
  }
};

const cache = new Map<string, { at: number; value: string | undefined }>();
const TTL_MS = 60_000;

export async function getCredential(name: string): Promise<string | undefined> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: string | undefined;
  try {
    const rows = await query<{ value: string }>("SELECT value FROM service_credentials WHERE name = ?", [name]);
    const stored = rows[0]?.value ? decrypt(rows[0].value).trim() : "";
    if (stored) value = stored;
  } catch (e) {
    console.error(`credential ${name}: could not read stored value`, e);
  }
  if (!value) value = process.env[name]?.trim() || undefined;

  cache.set(name, { at: Date.now(), value });
  return value;
}

export async function setCredential(name: string, value: string, userId: string) {
  await execute(
    `INSERT INTO service_credentials (name, value, updated_by, updated_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by), updated_at = VALUES(updated_at)`,
    [name, encrypt(value), userId, nowMysql()],
  );
  cache.delete(name);
}

export async function deleteCredential(name: string) {
  await execute("DELETE FROM service_credentials WHERE name = ?", [name]);
  cache.delete(name);
}
