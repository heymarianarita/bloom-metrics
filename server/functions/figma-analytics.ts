import { getCredential } from "../credentials.ts";
import type { FnHandler } from "./types.ts";

const FIGMA_API = "https://api.figma.com";

interface FigmaComponent {
  key: string;
  name: string;
  node_id?: string;
  description?: string;
  containing_frame?: {
    pageName?: string;
    name?: string;
    nodeId?: string;
    containingComponentSet?: { name?: string; nodeId?: string } | null;
  };
  updated_at?: string;
}

interface FigmaStyle {
  key: string;
  name: string;
  style_type?: string;
  description?: string;
  updated_at?: string;
}

const FILE_KEY_RE = /^[A-Za-z0-9]{10,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function figmaFetch(path: string, token: string) {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { "X-Figma-Token": token },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json } as {
    ok: boolean;
    status: number;
    json: any;
  };
}

/** Follows Figma analytics cursor pagination. */
async function figmaFetchAllRows(path: string, token: string) {
  let rows: any[] = [];
  let cursor: string | null = null;
  let ok = false;
  let status = 0;
  let safety = 0;
  do {
    const url = cursor
      ? `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`
      : path;
    const res = await figmaFetch(url, token);
    status = res.status;
    if (!res.ok) return { ok: false, status, rows: [] };
    ok = true;
    rows = rows.concat(res.json?.rows ?? []);
    cursor = res.json?.next_page ? res.json?.cursor ?? null : null;
    safety++;
  } while (cursor && safety < 20);
  return { ok, status, rows };
}

const handler: FnHandler = async (req) => {
  const json = (body: unknown, status = 200) => ({ status, body });

  const token = await getCredential("FIGMA_ACCESS_TOKEN");
  if (!token) {
    // Not an error condition: return 200 so the client can show setup guidance.
    return json({
      configured: false,
      error: "Figma is not configured",
      details: "Add your Figma access token under Settings, Dynamic sources.",
    }, 200);
  }


  let fileKey: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
  if (req.method === "POST") {
    const body = req.body;
    fileKey = typeof body?.fileKey === "string" ? body.fileKey.trim() : undefined;
    startDate = typeof body?.startDate === "string" ? body.startDate.trim() : undefined;
    endDate = typeof body?.endDate === "string" ? body.endDate.trim() : undefined;
  } else {
    const params = req.query;
    fileKey = params.get("fileKey")?.trim() ?? undefined;
    startDate = params.get("startDate")?.trim() ?? undefined;
    endDate = params.get("endDate")?.trim() ?? undefined;
  }

  if (!fileKey || !FILE_KEY_RE.test(fileKey)) {
    return json(
      { error: "fileKey is required and must be a valid Figma file key" },
      400,
    );
  }
  if (startDate && !DATE_RE.test(startDate)) {
    return json({ error: "startDate must be YYYY-MM-DD" }, 400);
  }
  if (endDate && !DATE_RE.test(endDate)) {
    return json({ error: "endDate must be YYYY-MM-DD" }, 400);
  }

  // File metadata (depth=1 keeps the payload small; page names come from /components)
  const meta = await figmaFetch(`/v1/files/${fileKey}?depth=1`, token);
  if (!meta.ok) {
    const message =
      meta.status === 403
        ? "Figma rejected the token (403). Check the token scopes and that it can read this file."
        : meta.status === 404
          ? "File not found (404). Double-check the file key."
          : `Figma API error (${meta.status}).`;
    return json({ error: message, status: meta.status }, 502);
  }

  // Page order straight from the (shallow) document tree
  const pageOrder: string[] = (
    (meta.json?.document?.children ?? []) as { name: string }[]
  ).map((page) => page.name);

  const [componentsRes, stylesRes, setsRes] = await Promise.all([
    figmaFetch(`/v1/files/${fileKey}/components`, token),
    figmaFetch(`/v1/files/${fileKey}/styles`, token),
    figmaFetch(`/v1/files/${fileKey}/component_sets`, token),
  ]);

  const components: FigmaComponent[] = componentsRes.ok
    ? (componentsRes.json?.meta?.components ?? [])
    : [];
  const styles: FigmaStyle[] = stylesRes.ok ? (stylesRes.json?.meta?.styles ?? []) : [];

  const resolvePage = (c: FigmaComponent) => c.containing_frame?.pageName ?? "—";

  // Library Analytics API — Enterprise plans only. Degrade gracefully.
  const dateQuery = `${startDate ? `&start_date=${startDate}` : ""}${endDate ? `&end_date=${endDate}` : ""}`;
  const base = `/v1/analytics/libraries/${fileKey}`;
  const [actionsRes, usagesRes] = await Promise.all([
    figmaFetchAllRows(`${base}/component/actions?group_by=component${dateQuery}`, token),
    figmaFetchAllRows(`${base}/component/usages?group_by=component`, token),
  ]);

  const analyticsAvailable = actionsRes.ok || usagesRes.ok;
  const actionRows = actionsRes.rows;
  const usageRows = usagesRes.rows;

  // Aggregate analytics by component key (fall back to name for older payloads)
  const insertsByKey = new Map<string, number>();
  const detachesByKey = new Map<string, number>();
  const insertsByName = new Map<string, number>();
  const detachesByName = new Map<string, number>();
  for (const row of actionRows) {
    const k = row.component_key;
    const n = row.component_name;
    const ins = Number(row.insertions) || 0;
    const det = Number(row.detachments) || 0;
    if (k) {
      insertsByKey.set(k, (insertsByKey.get(k) ?? 0) + ins);
      detachesByKey.set(k, (detachesByKey.get(k) ?? 0) + det);
    }
    if (n) {
      insertsByName.set(n, (insertsByName.get(n) ?? 0) + ins);
      detachesByName.set(n, (detachesByName.get(n) ?? 0) + det);
    }
  }

  const usagesByKey = new Map<string, number>();
  const teamsByKey = new Map<string, number>();
  const usagesByName = new Map<string, number>();
  const teamsByName = new Map<string, number>();
  for (const row of usageRows) {
    const k = row.component_key;
    const n = row.component_name;
    const u = Number(row.usages) || 0;
    const t = Number(row.teams_using) || 0;
    if (k) {
      usagesByKey.set(k, (usagesByKey.get(k) ?? 0) + u);
      teamsByKey.set(k, (teamsByKey.get(k) ?? 0) + t);
    }
    if (n) {
      usagesByName.set(n, (usagesByName.get(n) ?? 0) + u);
      teamsByName.set(n, (teamsByName.get(n) ?? 0) + t);
    }
  }

  const pick = (
    byKey: Map<string, number>,
    byName: Map<string, number>,
    c: FigmaComponent,
  ) => byKey.get(c.key) ?? byName.get(c.name) ?? (analyticsAvailable ? 0 : null);

  const variantRows = components.map((c) => ({
    key: c.key,
    name: c.name,
    page: resolvePage(c),
    documented: Boolean(c.description && c.description.trim().length > 0),
    updatedAt: c.updated_at ?? null,
    inserts: pick(insertsByKey, insertsByName, c),
    detaches: pick(detachesByKey, detachesByName, c),
    usages: pick(usagesByKey, usagesByName, c),
    teamsUsing: pick(teamsByKey, teamsByName, c),
  }));

  // Group variants under their parent component (component set). Standalone
  // components stay as their own row.
  const setsByNodeId = new Map<string, { name: string; description?: string; key?: string }>();
  for (const set of (setsRes.ok ? setsRes.json?.meta?.component_sets ?? [] : []) as {
    node_id?: string; name: string; description?: string; key?: string;
  }[]) {
    if (set.node_id) setsByNodeId.set(set.node_id, set);
  }
  type Row = (typeof variantRows)[number] & { variantCount: number };
  const grouped = new Map<string, Row>();
  const add = (a: number | null, b: number | null) =>
    a === null && b === null ? null : (a ?? 0) + (b ?? 0);
  components.forEach((c, i) => {
    const v = variantRows[i];
    const parent = c.containing_frame?.containingComponentSet;
    const groupId = parent?.nodeId ? `set:${parent.nodeId}` : `c:${c.key}`;
    const existing = grouped.get(groupId);
    if (!existing) {
      const set = parent?.nodeId ? setsByNodeId.get(parent.nodeId) : undefined;
      grouped.set(groupId, {
        ...v,
        key: set?.key ?? (parent?.nodeId ? groupId : v.key),
        name: set?.name ?? parent?.name ?? v.name,
        documented: set
          ? Boolean(set.description && set.description.trim().length > 0)
          : v.documented,
        variantCount: 1,
      });
      return;
    }
    existing.variantCount += 1;
    existing.inserts = add(existing.inserts, v.inserts);
    existing.detaches = add(existing.detaches, v.detaches);
    existing.usages = add(existing.usages, v.usages);
    // Teams can overlap across variants, so keep the widest reach instead of summing.
    existing.teamsUsing =
      existing.teamsUsing === null && v.teamsUsing === null
        ? null
        : Math.max(existing.teamsUsing ?? 0, v.teamsUsing ?? 0);
    if (v.updatedAt && (!existing.updatedAt || v.updatedAt > existing.updatedAt)) {
      existing.updatedAt = v.updatedAt;
    }
  });
  const componentRows = [...grouped.values()];

  const countByPage = new Map<string, number>();
  for (const row of componentRows) {
    countByPage.set(row.page, (countByPage.get(row.page) ?? 0) + 1);
  }
  const pages = pageOrder
    .filter((name) => countByPage.has(name))
    .map((name) => ({ name, componentCount: countByPage.get(name) ?? 0 }));
  for (const [name, componentCount] of countByPage) {
    if (!pages.some((p) => p.name === name)) pages.push({ name, componentCount });
  }

  const documentedCount = componentRows.filter((c) => c.documented).length;
  const totalInserts = actionRows.reduce((s, r) => s + (Number(r.insertions) || 0), 0);
  const totalDetaches = actionRows.reduce((s, r) => s + (Number(r.detachments) || 0), 0);
  const totalUsages = usageRows.reduce((s, r) => s + (Number(r.usages) || 0), 0);

  return json({
    file: {
      key: fileKey,
      name: meta.json?.name ?? "Untitled",
      lastModified: meta.json?.lastModified ?? null,
      version: meta.json?.version ?? null,
    },
    range: { startDate: startDate ?? null, endDate: endDate ?? null },
    pages,
    summary: {
      componentCount: componentRows.length,
      variantCount: components.length,
      styleCount: styles.length,
      documentedCount,
      documentationCoverage: componentRows.length
        ? Math.round((documentedCount / componentRows.length) * 100)
        : 0,
      totalInserts: analyticsAvailable ? totalInserts : null,
      totalDetaches: analyticsAvailable ? totalDetaches : null,
      totalUsages: analyticsAvailable ? totalUsages : null,
      detachRate:
        analyticsAvailable && totalInserts + totalDetaches > 0
          ? Math.round((totalDetaches / (totalInserts + totalDetaches)) * 100)
          : null,
    },
    analyticsAvailable,
    analyticsNote: analyticsAvailable
      ? null
      : "Figma Library Analytics is available on Enterprise plans only — adoption counts are unavailable for this token/plan.",
    components: componentRows,
    styles: styles.map((s) => ({
      key: s.key,
      name: s.name,
      type: s.style_type ?? "—",
      documented: Boolean(s.description && s.description.trim().length > 0),
    })),
  });
};

export default handler;
