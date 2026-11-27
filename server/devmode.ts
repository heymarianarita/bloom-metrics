/**
 * Guards for local-development-only features (dev admin password, fake Figma data).
 * They only switch on outside production and when the app is served from localhost.
 */

const publicUrl = () => (process.env.PUBLIC_URL ?? "http://localhost:8080").replace(/\/$/, "");

export const isLocalDev = () =>
  process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(publicUrl());

const warned = new Set<string>();

/** True when `flag` is set in the environment and we're in local development. */
export function localDevFlag(flag: string): boolean {
  const value = process.env[flag]?.trim();
  if (!value || value === "0" || value.toLowerCase() === "false") return false;
  if (isLocalDev()) return true;
  if (!warned.has(flag)) {
    warned.add(flag);
    console.warn(`${flag} ignored: only used for local development`);
  }
  return false;
}
