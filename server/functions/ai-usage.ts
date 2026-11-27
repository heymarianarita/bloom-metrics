import { AI_FEATURES, modelLabel, type AiFeature } from "../ai.ts";
import { canEdit } from "../auth.ts";
import { query, toIso } from "../db.ts";
import type { FnHandler } from "./types.ts";

/**
 * GET or POST → spend by AI feature, at Anthropic's list prices.
 * Editors only. Older qualitative runs are one `qualitative` row; newer calls are split.
 */

const json = (body: unknown, status = 200) => ({ status, body });

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

type Totals = {
  calls: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  last_at: string | null;
};

const handler: FnHandler = async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return json({ ok: false, error: "Use GET." }, 405);
  if (!(await canEdit(req.user?.id))) return json({ ok: false, error: "Only editors can see AI usage." }, 403);

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const [rows, monthRows, recent] = await Promise.all([
    query<Totals & { feature: string }>(
      `SELECT feature, COUNT(*) AS calls, COALESCE(SUM(cost_usd), 0) AS cost_usd,
              COALESCE(SUM(input_tokens), 0) AS input_tokens, COALESCE(SUM(output_tokens), 0) AS output_tokens,
              COALESCE(SUM(cache_write_tokens), 0) AS cache_write_tokens,
              COALESCE(SUM(cache_read_tokens), 0) AS cache_read_tokens, MAX(created_at) AS last_at
       FROM ai_usage GROUP BY feature`,
    ),
    query<{ feature: string; cost_usd: number }>(
      `SELECT feature, COALESCE(SUM(cost_usd), 0) AS cost_usd FROM ai_usage WHERE created_at >= ? GROUP BY feature`,
      [monthStart],
    ),
    query<{ id: string; feature: string; detail: string; model: string; cost_usd: number; created_at: string }>(
      `SELECT id, feature, detail, model, cost_usd, created_at FROM ai_usage ORDER BY created_at DESC LIMIT 100`,
    ),
  ]);

  const byFeature = new Map(rows.map((row) => [row.feature, row]));
  const monthOf = new Map(monthRows.map((row) => [row.feature, num(row.cost_usd)]));
  const known = Object.keys(AI_FEATURES) as AiFeature[];
  const order = [
    ...known.filter((feature) => feature !== "qualitative" || (byFeature.get(feature)?.calls ?? 0) > 0),
    ...rows.map((row) => row.feature).filter((feature) => !(feature in AI_FEATURES)),
  ];

  const features = order.map((feature) => {
    const row = byFeature.get(feature);
    const copy = feature in AI_FEATURES ? AI_FEATURES[feature as AiFeature] : null;
    return {
      feature,
      label: copy?.label ?? feature,
      description: copy?.description ?? "",
      calls: num(row?.calls),
      costUsd: num(row?.cost_usd),
      monthCostUsd: monthOf.get(feature) ?? 0,
      inputTokens: num(row?.input_tokens),
      outputTokens: num(row?.output_tokens),
      lastAt: row?.last_at ? String(toIso(row.last_at)) : null,
    };
  });

  return json({
    ok: true,
    monthStart,
    totalCostUsd: features.reduce((sum, feature) => sum + feature.costUsd, 0),
    monthCostUsd: features.reduce((sum, feature) => sum + feature.monthCostUsd, 0),
    calls: features.reduce((sum, feature) => sum + feature.calls, 0),
    features,
    recent: recent.map((row) => ({
      id: row.id,
      feature: row.feature,
      label: (row.feature in AI_FEATURES ? AI_FEATURES[row.feature as AiFeature].label : row.feature),
      detail: row.detail,
      model: modelLabel(row.model),
      costUsd: num(row.cost_usd),
      createdAt: String(toIso(row.created_at)),
    })),
  });
};

export default handler;
