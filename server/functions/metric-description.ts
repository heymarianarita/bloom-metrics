import { anthropicClient, FALLBACK, recordAiUsage, TAG_MODEL } from "../ai.ts";
import { canEdit } from "../auth.ts";
import type { FnHandler } from "./types.ts";

/**
 * POST { kind: "quantitative" | "qualitative", details: { label: value } } → { description }
 * One plain sentence saying what a metric shows, written when an editor saves one without a
 * description. Only the metric's settings are sent (names, columns, scale labels), never rows.
 */

const json = (body: unknown, status = 200) => ({ status, body });

const SYSTEM = `You write the one-sentence description of a metric on Bloom Metrics, a dashboard about how Vinted's design system (Bloom) is adopted and how it affects people's work.
Say what the metric shows and where its numbers or answers come from, so someone reading the dashboard understands it without opening its settings.
Rules: one sentence, at most 25 words. Sentence case, plain words, no jargon, no marketing tone, no quotes around it. Don't start with the metric's name or with "This metric". Dates are written YYYY-MM-DD. Reply with the sentence only.`;

const clip = (v: unknown, max = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const handler: FnHandler = async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  if (!(await canEdit(req.user?.id))) return json({ ok: false, error: "Only editors can write descriptions." }, 403);
  const kind = req.body?.kind === "qualitative" ? "qualitative" : "quantitative";
  const details = Object.entries((req.body?.details ?? {}) as Record<string, unknown>)
    .map(([label, value]) => [clip(label, 60), clip(value)] as const)
    .filter(([label, value]) => label && value)
    .slice(0, 20);
  if (!details.length) return json({ ok: false, error: "Nothing to describe yet." }, 400);

  const client = await anthropicClient();
  if (!client) return json({ ok: false, error: "No Anthropic API key saved." });
  try {
    const res = await client.beta.messages.create({
      model: TAG_MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `A ${kind} metric${kind === "qualitative" ? " (free-text survey answers grouped into themes by AI)" : ""}:\n${details
            .map(([label, value]) => `- ${label}: ${value}`)
            .join("\n")}`,
        },
      ],
      ...FALLBACK,
      betas: [...FALLBACK.betas],
    });
    const name = details.find(([label]) => label === "Name")?.[1];
    await recordAiUsage({
      feature: "metric_description",
      model: TAG_MODEL,
      reportedModel: res.model,
      usage: res.usage,
      detail: name || (kind === "qualitative" ? "Qualitative metric" : "Quantitative metric"),
    });
    const text = res.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^["“]|["”]$/g, "");
    return text ? json({ ok: true, description: text }) : json({ ok: false, error: "No description came back." });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
  }
};

export default handler;
