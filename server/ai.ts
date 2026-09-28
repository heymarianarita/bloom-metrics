import Anthropic from "@anthropic-ai/sdk";
import { getCredential } from "./credentials.ts";

/** Claude model used by the Insights chat and the qualitative summaries. */
export const MODEL = "claude-opus-5";

/** Opus 5 list prices, USD per million tokens, for the cost shown after a run. */
const PRICE = { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 };

/** Server-side refusal fallback: a declined request is retried on the recommended model. */
export const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as const;

/** An Anthropic client using ANTHROPIC_API_KEY from Settings or the environment, or null when none is set. */
export async function anthropicClient() {
  const apiKey = await getCredential("ANTHROPIC_API_KEY");
  return apiKey ? new Anthropic({ apiKey }) : null;
}

export const costOf = (usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}) =>
  (usage.input_tokens * PRICE.input +
    usage.output_tokens * PRICE.output +
    (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead) /
  1_000_000;
