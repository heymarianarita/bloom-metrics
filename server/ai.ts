import Anthropic from "@anthropic-ai/sdk";
import { getCredential } from "./credentials.ts";

/** Claude model used by the Insights chat, qualitative theme finding and summaries. */
export const MODEL = "claude-opus-5";

/** Faster model for tagging qualitative answers against themes, where most of the calls go. */
export const TAG_MODEL = "claude-sonnet-5-5";

type Model = typeof MODEL | typeof TAG_MODEL;

/** List prices, USD per million tokens, for the cost shown after a run. */
const PRICES: Record<Model, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  [MODEL]: { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  [TAG_MODEL]: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};

/** Server-side refusal fallback: a declined request is retried on the recommended model. */
export const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as const;

/** An Anthropic client using ANTHROPIC_API_KEY from Settings or the environment, or null when none is set. */
export async function anthropicClient() {
  const apiKey = await getCredential("ANTHROPIC_API_KEY");
  return apiKey ? new Anthropic({ apiKey }) : null;
}

export const costOf = (
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  },
  model: Model = MODEL,
) => {
  const price = PRICES[model];
  return (
    (usage.input_tokens * price.input +
      usage.output_tokens * price.output +
      (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * price.cacheRead) /
    1_000_000
  );
};
