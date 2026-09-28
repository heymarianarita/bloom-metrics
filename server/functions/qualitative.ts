import { canEdit } from "../auth.ts";
import { getSource } from "../qualitative/data.ts";
import { startRun } from "../qualitative/job.ts";
import { groupView } from "../qualitative/view.ts";
import type { FnHandler } from "./types.ts";

/**
 * Qualitative metrics (free-text answers summarised into themes).
 *
 *   GET  ?group=Impact              what the metric group page shows (public)
 *   POST {action: "run", sourceId}  find themes and write summaries in the background (editors)
 */

const json = (body: unknown, status = 200) => ({ status, body });

const handler: FnHandler = async (req) => {
  if (req.method === "GET") {
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
