import { canEdit } from "../auth.ts";
import { getSource } from "../qualitative/data.ts";
import { startRun } from "../qualitative/job.ts";
import { groupView, periodAnswers } from "../qualitative/view.ts";
import type { FnHandler } from "./types.ts";

/**
 * Qualitative metrics (free-text answers summarised into themes).
 *
 *   GET  ?group=Impact              what the metric group page shows (public)
 *   GET  ?answers=<id>&period=…     one period's answers as written (public, like the dataset rows;
 *                                   who wrote each one only when signed in)
 *   POST {action: "run", sourceId}  find themes and write summaries in the background (editors)
 */

const json = (body: unknown, status = 200) => ({ status, body });

const handler: FnHandler = async (req) => {
  if (req.method === "GET") {
    const answersOf = req.query.get("answers")?.trim();
    if (answersOf) {
      const period = req.query.get("period")?.trim();
      if (!period) return json({ error: "Pass &period=<period>" }, 400);
      const result = await periodAnswers(answersOf, period, Boolean(req.user));
      return result ? json(result) : json({ error: "Unknown qualitative metric" }, 404);
    }
    const group = req.query.get("group")?.trim();
    if (!group) return json({ error: "Pass ?group=<metric group name>" }, 400);
    return json(await groupView(group));
  }

  if (!(await canEdit(req.user?.id))) return json({ error: "Only editors can analyse qualitative metrics" }, 403);
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.action !== "run") return json({ error: "Unknown action" }, 400);
  const source = await getSource(String(body.sourceId ?? ""));
  if (!source) return json({ error: "Unknown qualitative metric" }, 404);
  const started = await startRun(source.id, req.user?.email ?? null);
  return json({ ok: true, started });
};

export default handler;
