import { getCredential } from "./credentials.ts";

/**
 * Sends one-time sign-in links to people as a Slack direct message from the app's bot.
 * Needs SLACK_BOT_TOKEN (Settings → Data sources, or the environment) from a Slack app
 * with the `chat:write`, `users:read` and `users:read.email` bot scopes, installed in the workspace.
 */

export type SlackResult = { sent: true } | { sent: false; error: string };

export const slackEnabled = async () => Boolean(await getCredential("SLACK_BOT_TOKEN"));

const ERRORS: Record<string, string> = {
  users_not_found: "No Slack account uses this email.",
  invalid_auth: "Slack rejected the token. Check it in Settings → Data sources.",
  not_authed: "Slack rejected the token. Check it in Settings → Data sources.",
  token_revoked: "The Slack token was revoked. Save a new one in Settings → Data sources.",
  account_inactive: "The Slack app was uninstalled. Reinstall it and save its new token.",
  missing_scope: "The Slack app needs the chat:write, users:read and users:read.email scopes.",
  ratelimited: "Slack is busy. Try again in a minute.",
};

async function postMessage(token: string, body: Record<string, unknown>) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { ok: false, error: "ratelimited" };
  return (await res.json()) as { ok: boolean; error?: string };
}

// users.lookupByEmail only reads form or query parameters, not JSON.
async function lookupByEmail(token: string, email: string) {
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  type Found = { ok: boolean; error?: string; user?: { id: string; profile?: { first_name?: string } } };
  if (res.status === 429) return { ok: false, error: "ratelimited" } as Found;
  return (await res.json()) as Found;
}

/** `2026-12-01T12:05:00.000Z` → `2026-12-01 12:05 UTC` */
const utcLabel = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

export async function sendLinkOnSlack(input: {
  email: string;
  link: string;
  expires_at: string;
  purpose: "invite" | "reset";
  senderName: string | null;
}): Promise<SlackResult> {
  const token = await getCredential("SLACK_BOT_TOKEN");
  if (!token) return { sent: false, error: "Slack isn't connected." };
  try {
    const found = await lookupByEmail(token, input.email);
    if (!found.ok || !found.user) {
      return { sent: false, error: ERRORS[found.error ?? ""] ?? `Slack said: ${found.error ?? "unknown error"}` };
    }
    const hi = found.user.profile?.first_name ? `Hi ${found.user.profile.first_name}, ` : "Hi, ";
    const text =
      input.purpose === "invite"
        ? `${hi}${input.senderName ?? "an admin"} added you to Bloom Metrics. <${input.link}|Choose your password> to sign in.`
        : `${hi}here's your link to <${input.link}|choose a new Bloom Metrics password>.`;
    const sent = await postMessage(token, {
      channel: found.user.id,
      text: `${text}\nThe link works once and expires on ${utcLabel(input.expires_at)}.`,
      unfurl_links: false,
    });
    if (!sent.ok) return { sent: false, error: ERRORS[sent.error ?? ""] ?? `Slack said: ${sent.error ?? "unknown error"}` };
    return { sent: true };
  } catch (e) {
    console.error("slack: could not send sign-in link", e);
    return { sent: false, error: "Couldn't reach Slack." };
  }
}
