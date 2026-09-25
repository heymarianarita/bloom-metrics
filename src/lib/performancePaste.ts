/**
 * Parses a performance table copied out of a Google Doc.
 *
 * A Doc table pasted into a plain textarea arrives as one line per row with
 * cells separated by tabs. Cells that contain their own line breaks produce
 * extra lines with no tabs — those are folded back into the previous row's
 * last cell.
 */

export const PERFORMANCE_FIELDS = [
  { key: "team", label: "Team & ownership" },
  { key: "intended_outcomes", label: "Intended outcomes" },
  { key: "main_deliverables", label: "Main deliverables in Q" },
  { key: "headcount", label: "Headcount by EOQ" },
  { key: "discovery_rag", label: "Discovery (R-A-G)" },
  { key: "delivery_rag", label: "Delivery (R-A-G)" },
  { key: "impact_rag", label: "Impact (R-A-G)" },
  { key: "comment", label: "Comment" },
] as const;

export type PerformanceField = (typeof PERFORMANCE_FIELDS)[number]["key"];

const HEADER_HINTS = ["team", "intended", "deliverable", "headcount", "discovery", "delivery", "impact", "comment"];

/** Splits pasted text into a grid of cells. */
export function parsePastedTable(text: string): string[][] {
  const lines = text.replace(/\r/g, "").split("\n");
  const rows: string[][] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;
    const cells = line.split("\t");
    if (cells.length > 1 || rows.length === 0) {
      rows.push(cells.map((c) => c.trim()));
    } else {
      // continuation of the previous row's last cell
      const prev = rows[rows.length - 1];
      prev[prev.length - 1] = `${prev[prev.length - 1]}\n${line.trim()}`.trim();
    }
  }

  // Drop rows that ended up completely empty
  return rows.filter((r) => r.some((c) => c !== ""));
}

/** True when the row looks like the table's header row rather than data. */
export function looksLikeHeader(row: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  const hits = HEADER_HINTS.filter((h) => joined.includes(h)).length;
  return hits >= 3;
}

/** Maps a grid to entry drafts using positional column order. */
export function gridToEntries(
  grid: string[][],
  order: (PerformanceField | "")[],
): Record<PerformanceField, string>[] {
  return grid.map((cells) => {
    const entry = Object.fromEntries(
      PERFORMANCE_FIELDS.map((f) => [f.key, ""]),
    ) as Record<PerformanceField, string>;
    order.forEach((field, index) => {
      if (field) entry[field] = (cells[index] ?? "").trim();
    });
    return entry;
  });
}

/** Default column order — the sheet's own column sequence. */
export const DEFAULT_ORDER: PerformanceField[] = PERFORMANCE_FIELDS.map((f) => f.key);

const RAG_MAP: Record<string, "red" | "amber" | "green"> = {
  r: "red", red: "red", "off track": "red",
  a: "amber", amber: "amber", yellow: "amber", "at risk": "amber",
  g: "green", green: "green", "on track": "green",
};

export const normalizeRag = (raw: string) => {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("\u{1F534}")) return "red";
  if (value.includes("\u{1F7E1}") || value.includes("\u{1F7E0}")) return "amber";
  if (value.includes("\u{1F7E2}")) return "green";
  return RAG_MAP[value.replace(/\s*\(\d+%\)/, "").trim()] ?? "";
};

/* ------------------------------------------------------------------ *
 * Google Doc "flat text" parsing
 *
 * Copying a Doc table into a plain textarea often loses the tabs: cells
 * run together into one blob. The RAG cells (🟢/🟡/🔴 with a percentage)
 * are reliable anchors — every row has exactly three in a row — so we cut
 * the blob on those triplets and classify the text in between.
 * ------------------------------------------------------------------ */

const RAG_TOKEN = /(🟢|🟡|🔴|⚪|🟠)\s*(\((\d+)%\))?/g;
const TEAM_LINE = /^[A-Za-z][\w&\-/ ]{1,40}\bteam\b:?$/i;
const HEADCOUNT_LINE = /^\d+(\.\d+)?\s*[A-Za-z][\w]{0,4}\b.*$/;
const HEADER_LINE = /(team\s*&\s*ownership|\(r-a-g\)|intended outcomes|headcount by eoq)/i;

/** True when the pasted text looks like a tab-less Doc blob. */
export function looksLikeDocBlob(text: string): boolean {
  if (text.includes("\t")) return false;
  const matches = text.match(/(🟢|🟡|🔴|⚪|🟠)/g);
  return (matches?.length ?? 0) >= 3;
}

const splitCommentAndOutcome = (prose: string): { comment: string; outcome: string } => {
  const trimmed = prose.trim();
  if (!trimmed) return { comment: "", outcome: "" };
  // Outcome starts at the last sentence boundary followed by a capital letter.
  const boundary = /[.)!?](?=[A-Z])/g;
  let lastIndex = -1;
  let m: RegExpExecArray | null;
  while ((m = boundary.exec(trimmed)) !== null) lastIndex = m.index + 1;
  if (lastIndex <= 0) return { comment: "", outcome: trimmed };
  return {
    comment: trimmed.slice(0, lastIndex).trim(),
    outcome: trimmed.slice(lastIndex).trim(),
  };
};

/** Parses a tab-less Doc paste into entry drafts. */
export function parseDocText(text: string): Record<PerformanceField, string>[] {
  // Bullets are frequently glued to the previous cell ("outcome- deliverable").
  // A dash with no space in front of it always starts a bullet, so break there.
  const clean = text.replace(/\r/g, "").replace(/(?<=\S)-\s(?=\S)/g, "\n- ");
  const anchors: { start: number; end: number; value: string }[] = [];
  RAG_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RAG_TOKEN.exec(clean)) !== null) {
    anchors.push({ start: match.index, end: match.index + match[0].length, value: match[0].trim() });
  }

  const rows: Record<PerformanceField, string>[] = [];
  const rowCount = Math.floor(anchors.length / 3);
  let team = "";
  let headcount: string[] = [];
  let cursor = 0;

  for (let i = 0; i < rowCount; i += 1) {
    const triplet = anchors.slice(i * 3, i * 3 + 3);
    const segment = clean.slice(cursor, triplet[0].start);
    cursor = triplet[2].end;

    const lines = segment.split("\n").map((l) => l.trim()).filter(Boolean);
    const prose: string[] = [];
    const deliverables: string[] = [];
    const nextHeadcount: string[] = [];
    let nextTeam = "";

    for (const line of lines) {
      if (HEADER_LINE.test(line) && !line.startsWith("-")) continue;
      if (TEAM_LINE.test(line)) {
        nextTeam = line.replace(/:$/, "");
        continue;
      }
      if (/^[-•*]\s*/.test(line)) {
        deliverables.push(line.replace(/^[-•*]\s*/, ""));
        continue;
      }
      if (HEADCOUNT_LINE.test(line) && line.length < 60 && /[A-Za-z]/.test(line)) {
        nextHeadcount.push(line);
        continue;
      }
      prose.push(line);
    }

    const { comment, outcome } = splitCommentAndOutcome(prose.join("\n"));

    // The leading prose of this segment is the previous row's comment.
    if (comment && rows.length > 0 && !rows[rows.length - 1].comment) {
      rows[rows.length - 1].comment = comment;
    }
    if (nextTeam) {
      team = nextTeam;
      headcount = [];
    }
    if (nextHeadcount.length) headcount = nextHeadcount;

    rows.push({
      team,
      intended_outcomes: outcome,
      main_deliverables: deliverables.join("\n"),
      headcount: headcount.join("\n"),
      discovery_rag: triplet[0].value,
      delivery_rag: triplet[1].value,
      impact_rag: triplet[2].value,
      comment: "",
    });
  }

  // Anything after the final triplet is the last row's comment.
  if (rows.length) {
    const tail = clean.slice(cursor).split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
    if (tail) rows[rows.length - 1].comment = tail;
  }

  // Headcount blocks often appear after the first row of a team — backfill.
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (!rows[i].headcount) {
      const sibling = rows.find((r, j) => j !== i && r.team === rows[i].team && r.headcount);
      if (sibling) rows[i].headcount = sibling.headcount;
    }
  }

  return rows;
}
