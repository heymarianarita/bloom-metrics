import type { FnHandler } from "./types.ts";

/**
 * Performance spreadsheet reader — KEYLESS.
 *
 * No service account, no API key. The sheet must be shared as
 * "Anyone with the link -> Viewer". We then:
 *   1. read the htmlview page to discover every tab (name + gid),
 *   2. download each tab as CSV via the public export endpoint.
 *
 * One tab = one quarter.
 */


function json(body: unknown, status = 200) {
  return { status, body };
}

const cleanNumber = (raw: string) => {
  const stripped = raw.replace(/[%,\s]/g, "").replace(/[€$£]/g, "");
  if (stripped === "" || Number.isNaN(Number(stripped))) return undefined;
  return Number(stripped);
};

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
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`,
    { redirect: "follow" },
  );
  if (!res.ok) throw new Error(`htmlview returned ${res.status}`);
  const html = await res.text();

  const tabs: { name: string; gid: string }[] = [];
  const seen = new Set<string>();

  // Tab strip buttons: <li id="sheet-button-123456" ...>Name</li>
  const liRe = /id="sheet-button-(\d+)"[^>]*>(?:<[^>]+>)*([^<]*)/g;
  for (const m of html.matchAll(liRe)) {
    const gid = m[1];
    const name = decodeEntities(m[2]).trim();
    if (name && !seen.has(gid)) { seen.add(gid); tabs.push({ name, gid }); }
  }

  // Fallback: bootstrap JSON blobs containing {"name":"...","gid":...}
  if (tabs.length === 0) {
    const jsonRe = /\{"[^{}]*?name":"([^"]+)"[^{}]*?"gid":"?(\d+)/g;
    for (const m of html.matchAll(jsonRe)) {
      const [, name, gid] = m;
      if (!seen.has(gid)) { seen.add(gid); tabs.push({ name: decodeEntities(name).trim(), gid }); }
    }
  }

  return tabs;
}

const handler: FnHandler = async () => {
  // Kept out of the code: the sheet is link-shared, so its id is effectively a read key.
  const spreadsheetId = process.env.PERFORMANCE_SHEET_ID?.trim();
  if (!spreadsheetId) {
    return json({
      configured: false,
      quarters: [],
      error: "Performance sheet is not configured",
      details: "Set PERFORMANCE_SHEET_ID to the Google Sheet id.",
    });
  }

  try {
    let tabs: { name: string; gid: string }[] = [];
    try {
      tabs = await discoverTabs(spreadsheetId);
    } catch (_e) {
      return json({
        configured: false,
        quarters: [],
        error: "The spreadsheet is not publicly readable",
        details:
          "Open the sheet -> Share -> General access -> 'Anyone with the link' -> Viewer. No API key or service account is needed once that is set.",
      });
    }

    if (tabs.length === 0) {
      return json({
        configured: false,
        quarters: [],
        error: "The spreadsheet is not publicly readable",
        details:
          "Open the sheet -> Share -> General access -> 'Anyone with the link' -> Viewer. No API key or service account is needed once that is set.",
      });
    }

    const quarters = await Promise.all(
      tabs.map(async ({ name, gid }) => {
        const csvRes = await fetch(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
          { redirect: "follow" },
        );
        const values = csvRes.ok ? parseCsv(await csvRes.text()) : [];

        const headerRow = (values[0] ?? []).map((h) => (h ?? "").trim());
        const bodyRows = values
          .slice(1)
          .filter((row) => row.some((cell) => (cell ?? "").trim().length > 0))
          .map((row) => headerRow.map((_, c) => (row[c] ?? "").trim()));

        const numericColumns = headerRow
          .map((_, c) => c)
          .filter((c) => {
            const cells = bodyRows.map((r) => r[c]).filter((v) => v !== "");
            return cells.length > 0 && cells.every((v) => cleanNumber(v) !== undefined);
          });

        return {
          quarter: name,
          headers: headerRow,
          rows: bodyRows,
          numericColumns,
          rowCount: bodyRows.length,
        };
      }),
    );

    return json({
      configured: true,
      spreadsheetTitle: null,
      refreshedAt: new Date().toISOString(),
      quarters: quarters.filter((q) => q.headers.length > 0),
    });
  } catch (err) {
    return json(
      {
        configured: true,
        quarters: [],
        error: "Performance sheet request failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
};

export default handler;
