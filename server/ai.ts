import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getCredential } from "./credentials.ts";
import { execute, nowMysql } from "./db.ts";

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

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export const costOf = (usage: TokenUsage, model: Model = MODEL) => {
  const price = PRICES[model];
  return (
    (usage.input_tokens * price.input +
      usage.output_tokens * price.output +
      (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * price.cacheRead) /
    1_000_000
  );
};

/** Every place this app calls the model. `qualitative` is older runs logged as one total. */
export const AI_FEATURES = {
  qualitative_themes: {
    label: "Finding themes",
    description: "Proposes themes from a sample of free-text answers.",
  },
  qualitative_tagging: {
    label: "Tagging answers",
    description: "Tags each answer with one to three themes.",
  },
  qualitative_summaries: {
    label: "Qualitative summaries",
    description: "Writes the short summaries under the charts, and how themes change over time.",
  },
  insights_chat: {
    label: "AI analysis",
    description: "Questions in the insights chat. One question can be several calls while it looks up data.",
  },
  metric_description: {
    label: "Metric descriptions",
    description: "The sentence written when a metric is saved without a description.",
  },
  slack_reports: {
    label: "Slack reports",
    description: "The summary at the top of each quarterly Slack report, including previews.",
  },
  qualitative: {
    label: "Qualitative analysis",
    description: "Themes, tagging and summaries from before those were recorded separately.",
  },
} as const;

export type AiFeature = keyof typeof AI_FEATURES;

const MODEL_LABELS: Record<string, string> = {
  [MODEL]: "Claude Opus",
  [TAG_MODEL]: "Claude Sonnet",
};

/** Older qualitative runs only logged a total, so they have no model. */
export const modelLabel = (model: string) => (model ? (MODEL_LABELS[model] ?? model) : "Not recorded");

/** "AI cost about $1.23" written on a qualitative run, or null when the message has no total. */
export const loggedQualitativeCost = (message: string) => {
  const match = /AI cost about \$(\d+(?:\.\d+)?)/.exec(message);
  if (!match) return null;
  const cost = Number(match[1]);
  return Number.isFinite(cost) ? cost : null;
};

const pricedModel = (reported: string | undefined, requested: Model): Model =>
  reported && reported in PRICES ? (reported as Model) : requested;

/**
 * Stores one model call so Settings → AI usage can total it. A failure here is logged and
 * swallowed: losing the cost line must not fail the feature that made the call.
 */
export async function recordAiUsage(input: {
  feature: AiFeature;
  model: Model;
  reportedModel?: string;
  usage: TokenUsage;
  detail?: string;
}) {
  const model = pricedModel(input.reportedModel, input.model);
  try {
    await execute(
      `INSERT INTO ai_usage
         (id, feature, detail, model, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.feature,
        (input.detail ?? "").slice(0, 191),
        input.reportedModel || model,
        input.usage.input_tokens ?? 0,
        input.usage.output_tokens ?? 0,
        input.usage.cache_creation_input_tokens ?? 0,
        input.usage.cache_read_input_tokens ?? 0,
        costOf(input.usage, model),
        nowMysql(),
      ],
    );
  } catch (err) {
    console.error("could not record AI usage", err);
  }
}
