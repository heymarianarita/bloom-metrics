import { getCredential } from "../credentials.ts";
import { canEdit } from "../auth.ts";
import { query, queryAll } from "../shared/getdxStudio.ts";
import type { FnHandler } from "./types.ts";

/**
 * GetDX studies (app.getdx.com/studies), read from GetDX's Data Cloud.
 *   GET                      → every study, newest first, with its response count
 *   POST { studyIds: [...] } → those studies' questions and every submitted response, with the
 *                              respondent's email, team, role and level, for "Add from GetDX"
 * Editors only: responses carry people's emails.
 */

const json = (body: unknown, status = 200) => ({ status, body });

/** Data Cloud timestamps ("2026-11-16 07:08:16.175", UTC) → their calendar day. */
const day = (v: unknown) => (v ? String(v).slice(0, 10) : "");

/** Values of one of a user's attribute groups (Settings → Attributes in GetDX), e.g. "Role". */
const attribute = (group: string) =>
  `(SELECT string_agg(tg.name, ', ' ORDER BY tg.name) FROM dx_user_tags ut
      JOIN dx_tags tg ON tg.id = ut.tag_id JOIN dx_tag_groups g ON g.id = tg.tag_group_id
     WHERE ut.user_id = u.id AND g.name = '${group}')`;

async function listStudies(token: string) {
  const rows = await queryAll(
    token,
    `SELECT s.id, s.name, s.created_at,
            COUNT(r.id) FILTER (WHERE r.responded_at IS NOT NULL) AS responses,
            MAX(r.responded_at) AS last_response
       FROM dx_studies s LEFT JOIN dx_study_responses r ON r.study_id = s.id
      GROUP BY s.id, s.name, s.created_at
      ORDER BY s.created_at DESC, s.id`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "").trim(),
    createdAt: day(r.created_at),
    responses: Number(r.responses ?? 0),
    lastResponse: day(r.last_response),
  }));
}

async function studyResponses(token: string, ids: string[]) {
  const list = ids.join(", ");
  const [studies, questions, responses] = await Promise.all([
    query(
      token,
      `SELECT s.id, s.name, s.created_at, MAX(r.responded_at) AS last_response
         FROM dx_studies s LEFT JOIN dx_study_responses r ON r.study_id = s.id
        WHERE s.id IN (${list}) GROUP BY s.id, s.name, s.created_at`,
    ),
    queryAll(
      token,
      `SELECT q.id, q.study_id, q.question_type, q.prompt, q.position FROM dx_study_questions q
        WHERE q.study_id IN (${list}) ORDER BY q.study_id, q.position, q.id`,
    ),
    // One row per response; a multi-select question's options are joined into one answer.
    queryAll(
      token,
      `WITH answers AS (
         SELECT a.response_id, a.question_id,
                string_agg(COALESCE(NULLIF(a.value, ''), o.name), ', ' ORDER BY o.position) AS value
           FROM dx_study_response_answers a
           JOIN dx_study_responses r ON r.id = a.response_id
           LEFT JOIN dx_study_question_options o ON o.id = a.option_id
          WHERE r.study_id IN (${list})
          GROUP BY a.response_id, a.question_id
       )
       SELECT r.source_id, r.study_id, r.responded_at, u.email, t.name AS team,
              ${attribute("Role")} AS role, ${attribute("Level")} AS level,
              (SELECT json_object_agg(x.question_id, x.value) FROM answers x WHERE x.response_id = r.id) AS answers
         FROM dx_study_responses r
         JOIN dx_users u ON u.id = r.user_id
         LEFT JOIN dx_teams t ON t.id = u.team_id
        WHERE r.study_id IN (${list}) AND r.responded_at IS NOT NULL
        ORDER BY r.id`,
    ),
  ]);
  return {
    studies: studies.map((s) => ({
      id: String(s.id),
      name: String(s.name ?? "").trim(),
      createdAt: day(s.created_at),
      lastResponse: day(s.last_response),
    })),
    questions: questions.map((q) => ({
      id: String(q.id),
      studyId: String(q.study_id),
      type: String(q.question_type ?? ""),
      prompt: String(q.prompt ?? "").trim(),
      position: Number(q.position ?? 0),
    })),
    responses: responses.map((r) => {
      const raw = typeof r.answers === "string" ? (JSON.parse(r.answers) as Record<string, unknown>) : ((r.answers ?? {}) as Record<string, unknown>);
      return {
        id: String(r.source_id),
        studyId: String(r.study_id),
        respondedAt: day(r.responded_at),
        email: String(r.email ?? "").trim().toLowerCase(),
        team: String(r.team ?? ""),
        role: String(r.role ?? ""),
        level: String(r.level ?? ""),
        answers: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === null ? "" : String(v)])),
      };
    }),
  };
}

const handler: FnHandler = async (req) => {
  if (!(await canEdit(req.user?.id))) return json({ ok: false, error: "Only editors can read GetDX studies." }, 403);
  const token = await getCredential("GETDX_API_TOKEN");
  if (!token) return json({ ok: false, error: "No GetDX token saved. Add one in Settings → Dynamic sources → GetDX." });
  try {
    if (req.method === "GET") return json({ ok: true, studies: await listStudies(token) });
    const ids: string[] = Array.isArray(req.body?.studyIds) ? req.body.studyIds.map(String) : [];
    if (!ids.length) return json({ ok: false, error: "Pick at least one study." }, 400);
    if (ids.length > 50 || !ids.every((id) => /^\d+$/.test(id))) return json({ ok: false, error: "Invalid study list." }, 400);
    return json({ ok: true, ...(await studyResponses(token, ids)) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
  }
};

export default handler;
