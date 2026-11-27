import { getCredential } from "../credentials.ts";
import { query } from "../db.ts";
import type { FnHandler } from "./types.ts";

/**
 * Atlassian Goals — quarterly OKR reporting.
 *
 * The team reports OKRs in Atlassian Goals (Atlassian Home / Jira), not in the
 * metrics Sheet. Atlassian shipped GraphQL APIs for Goals and Projects in
 * January 2026; this function reads them and shapes the result to the same
 * `Okr` rows the OKRs page already renders, so the page is source-agnostic.
 *
 * Mapping:
 *   top-level goal  -> objective
 *   sub-goal        -> key result   (a goal with no sub-goals becomes its own KR)
 *   goal owner      -> owner
 *   metric progress -> progress 0-100
 *   goal state      -> status ("On track" / "At risk" / "Off track" / "Done")
 *
 * Required env vars:
 *   ATLASSIAN_EMAIL      — account the API token belongs to
 *   ATLASSIAN_API_TOKEN  — https://id.atlassian.com/manage-profile/security/api-tokens
 *   ATLASSIAN_WORKSPACE  — workspace / cloud id the goals live in
 * Optional:
 *   ATLASSIAN_GRAPHQL_URL — defaults to the public gateway
 */

const DEFAULT_ENDPOINT = "https://team.atlassian.com/gateway/api/graphql";

const GOALS_QUERY = `
  query BloomGoals($containerId: ID!, $after: String, $searchString: String) {
    goals_search(containerId: $containerId, searchString: $searchString, first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          key
          url
          name
          status { value score }
          owner { name }
          startDate
          creationDate
          latestUpdateDate
          watchers(first: 20) { edges { node { name } } }
          targetDate { dateRange { start end } }
          progress { percentage }
          parentGoal { id name }
          teams { edges { node { id displayName } } }
          projects(first: 20) { edges { node { id key name url state { value label } contributors(first: 50) { edges { node { userContributor { name } } } } members(first: 50) { edges { node { name accountId } } } } } }
          metricTargets(first: 20) {
            edges { node { id startValue targetValue snapshotValue { value } metric { name type subType } } }
          }
        }
      }
    }
  }
`;

function json(body: unknown, status = 200) {
  return { status, body };
}

/** Atlassian goal states -> the status vocabulary the Performance/OKR pages already use. */
function toStatus(state?: { value?: string; label?: string }) {
  const raw = (state?.value ?? state?.label ?? "").toLowerCase();
  if (raw.includes("done") || raw.includes("complete")) return "Done";
  if (raw.includes("off_track") || raw.includes("off track")) return "Off track";
  if (raw.includes("at_risk") || raw.includes("at risk")) return "At risk";
  if (raw.includes("on_track") || raw.includes("on track")) return "On track";
  if (raw.includes("pending") || raw.includes("not_started")) return "Planned";
  return state?.label ?? undefined;
}

/** Atlassian date ranges -> "2026-Q3". */
function toQuarter(start?: string, end?: string) {
  const iso = end ?? start;
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

const pct = (p?: { percentage?: number }) =>
  typeof p?.percentage === "number" ? Math.round(p.percentage) : 0;

const handler: FnHandler = async (req) => {
  const email = await getCredential("ATLASSIAN_EMAIL");
  const token = await getCredential("ATLASSIAN_API_TOKEN");
  const workspaceId = await getCredential("ATLASSIAN_WORKSPACE");
  const endpoint = process.env.ATLASSIAN_GRAPHQL_URL ?? DEFAULT_ENDPOINT;

  if (!email || !token || !workspaceId) {
    return json(
      {
        configured: false,
        error: "Atlassian Goals is not configured",
        details:
          "Add your Atlassian email, API token and workspace id under Settings, Dynamic sources.",
        okrs: [],
        quarters: [],
      },
      200,
    );
  }

  // Accept either a raw cloud id or a full container ARI.
  const containerId = workspaceId.startsWith("ari:")
    ? workspaceId
    : `ari:cloud:townsquare::site/${workspaceId}`;

  // Optional team filter set in Settings, Dynamic sources.
  const searchString = "archived = false";
  let teamFilter = "";
  try {
    const rows = await query<{ config?: { team?: string } }>(
      "SELECT config FROM data_source_configs WHERE source_key = ?",
      ["atlassian_goals"],
    );
    teamFilter = (rows[0]?.config?.team ?? "").trim();
  } catch {
    // keep the default filter
  }

  const auth = Buffer.from(`${email}:${token}`).toString("base64");

  // Debug helper: POST { debugQuery, debugVariables } to run a raw query (admin use).
  const reqBody = req.body ?? {};
  if (reqBody?.debugQuery) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: reqBody.debugQuery, variables: { containerId, ...(reqBody.debugVariables ?? {}) } }),
    });
    return json({ debug: true, status: res.status, body: JSON.parse(await res.text()) });
  }

  const nodes: Record<string, unknown>[] = [];
  let after: string | null = null;

  try {
    for (let page = 0; page < 20; page++) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: GOALS_QUERY, variables: { containerId, after, searchString } }),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error(`Atlassian Goals API error [${res.status}]: ${text}`);
        return json(
          {
            configured: true,
            error: "Could not read Atlassian Goals",
            details:
              res.status === 401
                ? "401 Unauthorized — check the API token, and that the account has access to this workspace. SSO orgs may need a scoped token."
                : `HTTP ${res.status}: ${text.slice(0, 400)}`,
            okrs: [],
            quarters: [],
          },
          502,
        );
      }

      const body: any = JSON.parse(text);
      if (body.errors?.length) {
        console.error("Atlassian Goals GraphQL errors:", JSON.stringify(body.errors));
        return json(
          {
            configured: true,
            error: "Atlassian Goals returned errors",
            details: body.errors.map((e: { message?: string }) => e.message).join("; "),
            okrs: [],
            quarters: [],
          },
          502,
        );
      }

      const conn = body.data?.goals_search;
      for (const edge of conn?.edges ?? []) nodes.push(edge.node);
      if (!conn?.pageInfo?.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }
  } catch (err) {
    console.error("Atlassian Goals request failed:", err);
    return json(
      { configured: true, error: "Atlassian Goals request failed", details: String(err), okrs: [], quarters: [] },
      502,
    );
  }

  const teamNames = (goal: any): string[] =>
    (goal.teams?.edges ?? []).map((e: any) => e?.node?.displayName).filter(Boolean);

  const wanted = teamFilter.toLowerCase();
  const scoped = wanted
    ? nodes.filter((goal: any) => teamNames(goal).some((n) => n.toLowerCase() === wanted))
    : nodes;

  let id = 0;
  const okrs = scoped.map((goal: any) => ({
    id: ++id,
    quarter: toQuarter(goal.targetDate?.dateRange?.start, goal.targetDate?.dateRange?.end),
    startDate: goal.targetDate?.dateRange?.start ?? undefined,
    endDate: goal.targetDate?.dateRange?.end ?? undefined,
    objective: goal.parentGoal?.name ?? goal.name,
    keyResult: goal.name,
    owner: goal.owner?.name,
    progress: pct(goal.progress),
    status: toStatus(goal.status),
    teams: teamNames(goal),
    url: goal.url ?? (goal.key ? `https://home.atlassian.com/goal/${goal.key}` : undefined),
  }));

  // Full goal tree: parent goals (themes) -> sub-goals (objectives) -> metrics (key results).
  const goals = scoped.map((goal: any) => ({
    id: goal.id,
    parentId: goal.parentGoal?.id ?? null,
    parentName: goal.parentGoal?.name ?? null,
    name: goal.name,
    quarter: toQuarter(goal.targetDate?.dateRange?.start, goal.targetDate?.dateRange?.end),
    startDate: goal.targetDate?.dateRange?.start ?? undefined,
    endDate: goal.targetDate?.dateRange?.end ?? undefined,
    owner: goal.owner?.name,
    plannedStart: goal.startDate ?? undefined,
    createdAt: goal.creationDate ?? undefined,
    lastUpdate: goal.latestUpdateDate ?? undefined,
    watchers: (goal.watchers?.edges ?? []).map((e: any) => e?.node?.name).filter(Boolean),
    progress: pct(goal.progress),
    score: typeof goal.status?.score === "number" ? goal.status.score : null,
    status: toStatus(goal.status),
    url: goal.url ?? (goal.key ? `https://home.atlassian.com/goal/${goal.key}` : undefined),
    projects: (goal.projects?.edges ?? []).map((e: any) => ({
      id: e.node.id,
      name: e.node.name,
      url: e.node.url ?? (e.node.key ? `https://home.atlassian.com/project/${e.node.key}` : undefined),
      status: toStatus(e.node.state),
      contributors: [...new Set([...(e.node.members?.edges ?? []).map((m: any) => m?.node?.name), ...(e.node.contributors?.edges ?? []).map((m: any) => m?.node?.userContributor?.name)].filter(Boolean))],
      contributorLinks: (() => {
        const m = String(e.node.url ?? "").match(/\/o\/([^/]+)\/s\/([^/]+)\//);
        const seen = new Set<string>();
        return (e.node.members?.edges ?? [])
          .map((x: any) => x?.node)
          .filter((n: any) => n?.name && n?.accountId && !seen.has(n.name) && seen.add(n.name))
          .map((n: any) => ({
            name: n.name,
            url: m ? `https://home.atlassian.com/o/${m[1]}/people/${n.accountId}?cloudId=${m[2]}&tab=projects` : undefined,
          }));
      })(),
    })),
    metrics: (goal.metricTargets?.edges ?? []).map((e: any) => {
      const n = e.node;
      const start = typeof n.startValue === "number" ? n.startValue : null;
      const target = typeof n.targetValue === "number" ? n.targetValue : null;
      const current = typeof n.snapshotValue?.value === "number" ? n.snapshotValue.value : null;
      let progress: number | null = null;
      if (start !== null && target !== null && current !== null && target !== start) {
        progress = Math.max(0, Math.min(100, Math.round(((current - start) / (target - start)) * 100)));
      }
      return { id: n.id, name: n.metric?.name ?? "Metric", type: n.metric?.type ?? null, unit: n.metric?.subType ?? null, start, target, current, progress };
    }),
  }));

  const quarters = [...new Set(okrs.map((o) => o.quarter).filter(Boolean))].sort() as string[];

  return json({
    configured: true,
    refreshedAt: new Date().toISOString(),
    source: "atlassian-goals",
    goalCount: okrs.length,
    teamFilter: teamFilter || undefined,
    availableTeams: [...new Set(nodes.flatMap((g: any) => teamNames(g)))].sort(),
    quarters,
    okrs,
    goals,
  });
};

export default handler;
