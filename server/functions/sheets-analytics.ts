import { query } from "../db.ts";
import type { FnHandler } from "./types.ts";

/**
 * Sheets-backed analytics: survey scores, milestones, RAG grades, and OKRs.
 *
 * KEYLESS — no service account, no API key. The spreadsheet must be shared as
 * "Anyone with the link -> Viewer". We discover the tabs from the public
 * htmlview page and download each one as CSV.
 *
 * The spreadsheet id comes from (in order):
 *   1. the request body  { sheetId }
 *   2. the `survey_sheet` row in data_source_configs (config.sheetId)
 *   3. the SHEET_ID env var
 *
 * Expected tabs (case-insensitive): survey, milestones, rag, okrs.
 */

interface SurveyRow {
  quarter?: string;
  role?: string;
  business_unit?: string;
  csat?: string;
  efficiency?: string;
  discoverability?: string;
  confidence?: string;
  handoff?: string;
  zh_umux?: string;
  sb_umux?: string;
}

interface MilestoneRow {
  name?: string;
  phase?: string;
  status?: string;
  date?: string;
}

interface RagRow {
  quarter?: string;
  discovery?: string;
  delivery?: string;
  impact?: string;
}

interface OkrRow {
  quarter?: string;
  objective?: string;
  key_result?: string;
  owner?: string;
  progress?: string;
  status?: string;
}

const SETUP_DETAILS =
  "Add the spreadsheet ID in Settings -> Data sources -> Survey sheet, and share the sheet with 'Anyone with the link -> Viewer'. No API key or service account is needed.";

function json(body: unknown, status = 200) {
  return { status, body };
}

const empty = (error: string, details: string) =>
  json({ configured: false, error, details, quarters: [], survey: {}, milestones: [], rag: {}, okrs: [] });

/** Minimal RFC4180 CSV parser. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");

async function discoverTabs(sheetId: string): Promise<{ name: string; gid: string }[]> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`, { redirect: "follow" });
  if (!res.ok) throw new Error(`htmlview returned ${res.status}`);
  const html = await res.text();

  const tabs: { name: string; gid: string }[] = [];
  const seen = new Set<string>();

  const liRe = /id="sheet-button-(\d+)"[^>]*>(?:<[^>]+>)*([^<]*)/g;
  for (const m of html.matchAll(liRe)) {
    const gid = m[1];
    const name = decodeEntities(m[2]).trim();
    if (name && !seen.has(gid)) { seen.add(gid); tabs.push({ name, gid }); }
  }
  if (tabs.length === 0) {
    const jsonRe = /\{"[^{}]*?name":"([^"]+)"[^{}]*?"gid":"?(\d+)/g;
    for (const m of html.matchAll(jsonRe)) {
      const [, name, gid] = m;
      if (!seen.has(gid)) { seen.add(gid); tabs.push({ name: decodeEntities(name).trim(), gid }); }
    }
  }
  return tabs;
}

async function fetchTabValues(sheetId: string, gid: string): Promise<string[][] | undefined> {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
    { redirect: "follow" },
  );
  if (!res.ok) return undefined;
  return parseCsv(await res.text());
}

function rowsToObjects<T>(values: string[][] | undefined): T[] {
  if (!values || values.length < 2) return [];
  const headers = values[0].map((h) => (h ?? "").trim().toLowerCase().replace(/\s+/g, "_"));
  return values.slice(1)
    .filter((row) => row.some((cell) => cell && cell.trim().length > 0))
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => { obj[header] = (row[i] ?? "").trim(); });
      return obj as T;
    });
}

const num = (v: string | undefined) => (v === undefined || v === "" ? undefined : Number(v));

function buildSurvey(rows: SurveyRow[]) {
  const survey: Record<string, { all: Record<string, number>; byRole: Record<string, Record<string, number>>; byBU: Record<string, Record<string, number>> }> = {};
  for (const r of rows) {
    const quarter = r.quarter;
    if (!quarter) continue;
    survey[quarter] ??= { all: {}, byRole: {}, byBU: {} };
    const metrics: Record<string, number> = {};
    const set = (key: string, value: number | undefined) => {
      if (value !== undefined && !Number.isNaN(value)) metrics[key] = value;
    };
    set("csat", num(r.csat));
    set("efficiency", num(r.efficiency));
    set("discoverability", num(r.discoverability));
    set("confidence", num(r.confidence));
    set("handoff", num(r.handoff));
    set("zhUmux", num(r.zh_umux));
    set("sbUmux", num(r.sb_umux));

    const role = r.role || "All";
    const bu = r.business_unit || "All";
    if (role === "All" && bu === "All") survey[quarter].all = metrics;
    else if (bu === "All") survey[quarter].byRole[role] = metrics;
    else if (role === "All") survey[quarter].byBU[bu] = metrics;
  }
  return survey;
}

function buildRag(rows: RagRow[]) {
  const rag: Record<string, { discovery?: string; delivery?: string; impact?: string }> = {};
  for (const r of rows) {
    if (!r.quarter) continue;
    rag[r.quarter] = { discovery: r.discovery, delivery: r.delivery, impact: r.impact };
  }
  return rag;
}

function buildMilestones(rows: MilestoneRow[]) {
  return rows
    .filter((r) => r.name)
    .map((r, i) => ({ id: i + 1, name: r.name, phase: r.phase, status: r.status, date: r.date }));
}

function buildOkrs(rows: OkrRow[]) {
  return rows
    .filter((r) => r.objective)
    .map((r, i) => ({
      id: i + 1,
      quarter: r.quarter,
      objective: r.objective,
      keyResult: r.key_result,
      owner: r.owner,
      progress: num(r.progress) ?? 0,
      status: r.status,
    }));
}

async function sheetIdFromConfig(): Promise<string | undefined> {
  try {
    const rows = await query<{ config: Record<string, unknown> | null }>(
      "SELECT config FROM data_source_configs WHERE source_key = ?",
      ["survey_sheet"],
    );
    const raw = rows[0]?.config?.sheetId;
    return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : undefined;
  } catch (_e) {
    return undefined;
  }
}

/** Accepts a bare id or a full Google Sheets URL. */
const normalizeSheetId = (raw: string) => {
  const m = raw.match(/\/spreadsheets\/d\/([A-Za-z0-9-_]+)/);
  return (m ? m[1] : raw).trim();
};

const handler: FnHandler = async (req) => {
  let bodySheetId: string | undefined;
  const body = req.body;
  if (typeof body?.sheetId === "string" && body.sheetId.trim() !== "") bodySheetId = body.sheetId.trim();

  const raw = bodySheetId ?? (await sheetIdFromConfig()) ?? process.env.SHEET_ID;
  if (!raw) {
    return empty("No survey spreadsheet is configured", SETUP_DETAILS);
  }
  const spreadsheetId = normalizeSheetId(raw);

  let tabs: { name: string; gid: string }[] = [];
  try {
    tabs = await discoverTabs(spreadsheetId);
  } catch (_e) {
    return empty("The spreadsheet is not publicly readable", SETUP_DETAILS);
  }
  if (tabs.length === 0) {
    return empty("The spreadsheet is not publicly readable", SETUP_DETAILS);
  }

  const findTab = (name: string) => tabs.find((t) => t.name.trim().toLowerCase() === name)?.gid;

  const [surveyValues, milestoneValues, ragValues, okrValues] = await Promise.all([
    findTab("survey") ? fetchTabValues(spreadsheetId, findTab("survey")!) : Promise.resolve(undefined),
    findTab("milestones") ? fetchTabValues(spreadsheetId, findTab("milestones")!) : Promise.resolve(undefined),
    findTab("rag") ? fetchTabValues(spreadsheetId, findTab("rag")!) : Promise.resolve(undefined),
    findTab("okrs") ? fetchTabValues(spreadsheetId, findTab("okrs")!) : Promise.resolve(undefined),
  ]);

  const survey = buildSurvey(rowsToObjects<SurveyRow>(surveyValues));
  const milestones = buildMilestones(rowsToObjects<MilestoneRow>(milestoneValues));
  const rag = buildRag(rowsToObjects<RagRow>(ragValues));
  const okrs = buildOkrs(rowsToObjects<OkrRow>(okrValues));

  const quarters = [...new Set([
    ...Object.keys(survey),
    ...Object.keys(rag),
    ...okrs.map((o) => o.quarter).filter((q): q is string => Boolean(q)),
  ])].sort();

  if (!surveyValues && !milestoneValues && !ragValues && !okrValues) {
    return json({
      configured: false,
      error: "No matching tabs were found in the spreadsheet",
      details: `Tabs found: ${tabs.map((t) => t.name).join(", ")}. Expected tabs named survey, milestones, rag or okrs.`,
      quarters: [],
      survey: {},
      milestones: [],
      rag: {},
      okrs: [],
      tabsFound: tabs.map((t) => t.name),
    });
  }

  return json({
    configured: true,
    refreshedAt: new Date().toISOString(),
    quarters,
    survey,
    milestones,
    rag,
    okrs,
    tabsRead: {
      survey: Boolean(surveyValues),
      milestones: Boolean(milestoneValues),
      rag: Boolean(ragValues),
      okrs: Boolean(okrValues),
    },
  });
};

export default handler;
