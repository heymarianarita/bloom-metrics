import type { FnHandler } from "../functions/types.ts";

/**
 * LOCAL DEVELOPMENT ONLY — made-up Figma data (FIGMA_FAKE_DATA=1 in .env).
 * Excluded from the production image (.dockerignore) and only loaded when
 * localDevFlag("FIGMA_FAKE_DATA") allows it. Numbers are deterministic per
 * library and date range, and roughly Bloom-shaped, so layouts can be tested.
 */

const LIBRARIES: Record<string, string> = {
  AxgxbkHNzhVbyMBdB1wMuM: "Bloom Design System Library",
  aqKiVM9OcIQEDDaOliQLar: "Marketplace Kit",
  "16F5fJBPOVvV3cKsoFgCXb": "Vinted Go Kit",
};

const configuredLibraries = (): Record<string, string> => {
  try {
    const list = JSON.parse(process.env.FIGMA_FILE_KEYS ?? "[]") as { id?: string; key?: string; label?: string; name?: string }[];
    const fromEnv = Object.fromEntries(
      list.map((l) => [String(l.id ?? l.key ?? ""), String(l.label ?? l.name ?? l.id ?? l.key)]).filter(([k]) => k),
    );
    return { ...LIBRARIES, ...fromEnv };
  } catch {
    return LIBRARIES;
  }
};

const libraryName = (fileKey: string) => configuredLibraries()[fileKey] ?? `Fake library ${fileKey.slice(0, 6)}`;

/** Small seeded PRNG so the same inputs always give the same numbers. */
const seeded = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const PAGES: Record<string, string[]> = {
  Actions: ["Button / Filled", "Button / Outlined", "Button / Flat", "Icon Button", "Link"],
  Inputs: ["Input / Text", "Input / Select", "Input / Text area", "Checkbox", "Radio", "Toggle", "Selection Group / Simplified horizontal", "Slider"],
  Content: ["Text", "Cell / Default", "Cell / Navigating", "Badge", "Chip / Round", "Avatar", "Image", "Card", "Rating", "Divider / Horizontal"],
  Layout: ["Spacer / Horizontal", "Spacer / Vertical", "Grid", "Bottom Sheet", "Side Sheet"],
  Navigation: ["Navigation / Top bar", "Navigation / Bottom bar", "Tabs", "Pagination", "Breadcrumbs"],
  Feedback: ["Loader", "Info Banner", "Notification", "Validation", "Empty State", "Tooltip", "Dialog"],
};

function fakeComponents(fileKey: string, days: number) {
  const rand = seeded(fileKey);
  const scale = Math.max(1, days) / 30;
  const rows: {
    key: string; name: string; page: string; documented: boolean; updatedAt: string;
    inserts: number; detaches: number; usages: number; teamsUsing: number; variantCount: number;
  }[] = [];
  for (const [page, names] of Object.entries(PAGES)) {
    for (const name of names) {
      const popularity = rand() ** 2.2; // a few components dominate, most are modest
      const never = rand() < 0.05;
      const inserts = never ? 0 : Math.round((20 + popularity * 18000) * scale * (0.8 + rand() * 0.4));
      const detachRate = rand() < 0.08 ? 0.08 + rand() * 0.1 : rand() * 0.012;
      rows.push({
        key: `fake-${fileKey.slice(0, 4)}-${rows.length}`,
        name,
        page,
        documented: rand() > 0.18,
        updatedAt: new Date(Date.UTC(2026, Math.floor(rand() * 8), 1 + Math.floor(rand() * 27))).toISOString(),
        inserts,
        detaches: Math.round(inserts * detachRate),
        usages: Math.round(inserts * (3 + rand() * 9)),
        teamsUsing: never ? 0 : 1 + Math.floor(popularity * 40),
        variantCount: 1 + Math.floor(rand() * 24),
      });
    }
  }
  return rows;
}

const daysBetween = (start?: string, end?: string) => {
  const s = start ? Date.parse(start) : NaN;
  const e = end ? Date.parse(end) : NaN;
  return Number.isFinite(s) && Number.isFinite(e) ? Math.max(1, Math.round((e - s) / 86_400_000) + 1) : 90;
};

const figmaAnalytics: FnHandler = async (req) => {
  const fileKey = String(req.body?.fileKey ?? req.query.get("fileKey") ?? "").trim();
  if (!fileKey) return { status: 400, body: { error: "fileKey is required and must be a valid Figma file key" } };
  const startDate = req.body?.startDate ?? req.query.get("startDate") ?? null;
  const endDate = req.body?.endDate ?? req.query.get("endDate") ?? null;
  const components = fakeComponents(fileKey, daysBetween(startDate, endDate));
  const pages = Object.keys(PAGES).map((name) => ({ name, componentCount: components.filter((c) => c.page === name).length }));
  const documentedCount = components.filter((c) => c.documented).length;
  const totalInserts = components.reduce((s, c) => s + c.inserts, 0);
  const totalDetaches = components.reduce((s, c) => s + c.detaches, 0);
  const totalUsages = components.reduce((s, c) => s + c.usages, 0);
  return {
    status: 200,
    body: {
      file: { key: fileKey, name: libraryName(fileKey), lastModified: "2026-09-20T10:00:00Z", version: "fake" },
      range: { startDate, endDate },
      pages,
      summary: {
        componentCount: components.length,
        variantCount: components.reduce((s, c) => s + c.variantCount, 0),
        styleCount: 42,
        documentedCount,
        documentationCoverage: Math.round((documentedCount / components.length) * 100),
        totalInserts,
        totalDetaches,
        totalUsages,
        detachRate: totalInserts + totalDetaches > 0 ? Math.round((totalDetaches / (totalInserts + totalDetaches)) * 100) : null,
      },
      analyticsAvailable: true,
      analyticsNote: null,
      components,
      styles: ["Primary", "Secondary", "Surface", "Border", "Title", "Body", "Caption"].map((name, i) => ({
        key: `fake-style-${i}`,
        name,
        type: i < 4 ? "FILL" : "TEXT",
        documented: i % 3 !== 0,
      })),
      fake: true,
    },
  };
};

const figmaFileName: FnHandler = async (req) => {
  const fileKey = String(req.body?.fileKey ?? req.query.get("fileKey") ?? "").trim();
  if (!fileKey) return { status: 400, body: { error: "A valid Figma file key is required" } };
  return { status: 200, body: { fileKey, name: libraryName(fileKey) } };
};

/** Last six quarters (oldest first) ending with the current one. */
const recentQuarters = () => {
  const now = new Date();
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3);
  const out: { quarter: string; start: string; end: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(Date.UTC(y, q * 3, 1));
    const end = new Date(Date.UTC(y, q * 3 + 3, 0));
    out.unshift({ quarter: `${y}-Q${q + 1}`, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
    q -= 1;
    if (q < 0) { q = 3; y -= 1; }
  }
  return out;
};

const figmaSnapshot: FnHandler = async (req) => {
  if (req.method !== "GET") return { status: 403, body: { error: "Capture is disabled while FIGMA_FAKE_DATA is on" } };
  const only = req.query.get("fileKey")?.trim();
  const keys = Object.keys(configuredLibraries()).filter((k) => !only || k === only);
  const snapshots = keys.flatMap((fileKey) => {
    const rand = seeded(`${fileKey}-history`);
    let inserts = 40000 + rand() * 250000;
    return recentQuarters().map(({ quarter, start, end }) => {
      inserts *= 1.04 + rand() * 0.22; // steady growth with some wobble
      const components = fakeComponents(`${fileKey}-${quarter}`, 90);
      const documented = components.filter((c) => c.documented).length;
      const detachRate = Number((0.05 + rand() * 0.4).toFixed(2));
      return {
        file_key: fileKey,
        file_name: libraryName(fileKey),
        quarter,
        period_start: start,
        period_end: end,
        inserts: Math.round(inserts),
        detaches: Math.round(inserts * (detachRate / 100)),
        usages: Math.round(inserts * 6),
        component_count: components.length,
        components_used: components.filter((c) => c.inserts > 0).length,
        documented_count: documented,
        documentation_coverage: Math.round((documented / components.length) * 100),
        detach_rate: detachRate,
        captured_at: `${end}T05:15:00+00:00`,
      };
    });
  });
  snapshots.sort((a, b) => a.quarter.localeCompare(b.quarter) || a.file_key.localeCompare(b.file_key));
  return { status: 200, body: { snapshots, fake: true } };
};

export const FAKE_FIGMA_FUNCTIONS: Record<string, FnHandler> = {
  "figma-analytics": figmaAnalytics,
  "figma-file-name": figmaFileName,
  "figma-snapshot": figmaSnapshot,
};
