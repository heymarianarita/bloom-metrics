import type { DatasetColumnKind, ManualDatasetColumn } from "@/hooks/useManualDatasets";

/**
 * "Add from GetDX": turns GetDX study responses into rows for any dataset. Each dataset
 * remembers the studies and question → column choices of its last add, so the next one needs no
 * choices. Pure, so the sheet and the tests share it; writing happens in the sheet.
 */

export interface DxStudy {
  id: string;
  name: string;
  createdAt: string;
  responses: number;
  lastResponse: string;
}

export interface DxQuestion {
  id: string;
  studyId: string;
  type: string;
  prompt: string;
  position: number;
}

export interface DxResponse {
  id: string;
  studyId: string;
  respondedAt: string;
  email: string;
  team: string;
  role: string;
  level: string;
  answers: Record<string, string>;
}

export interface DxStudyData {
  studies: Omit<DxStudy, "responses">[];
  questions: DxQuestion[];
  responses: DxResponse[];
}

/** What a dataset took from GetDX last time: its studies, and each question's column (or "skip"), by `promptKey`. */
export interface DatasetLink {
  studies: string[];
  questions: Record<string, string>;
}

export const SKIP = "skip";

/** The GetDX source's saved settings (data_source_configs, source_key "getdx"). */
export interface GetdxConfig {
  /** By dataset id. */
  datasets: Record<string, DatasetLink>;
}

type LegacyMemory = Record<string, "skip" | { datasetId: string; column: string }>;

export const readGetdxConfig = (saved: Record<string, unknown> | undefined): GetdxConfig => {
  if (saved?.datasets) return { datasets: saved.datasets as Record<string, DatasetLink> };
  // Saved by the earlier version: one main dataset with picked studies, plus one-off datasets.
  const datasets: Record<string, DatasetLink> = {};
  const studies = Array.isArray(saved?.studies) ? (saved.studies as unknown[]).map(String) : [];
  const main = typeof saved?.studyDataset === "string" ? saved.studyDataset : undefined;
  const link = (id: string) => (datasets[id] ??= { studies, questions: {} });
  for (const [key, target] of Object.entries((saved?.questions as LegacyMemory | undefined) ?? {})) {
    if (target === "skip") {
      if (main) link(main).questions[key] = SKIP;
    } else link(target.datasetId).questions[key] = target.column;
  }
  for (const [id, oneOff] of Object.entries((saved?.oneOffs as Record<string, DatasetLink> | undefined) ?? {})) {
    datasets[id] = { studies: oneOff.studies, questions: { ...datasets[id]?.questions, ...oneOff.questions } };
  }
  if (main) link(main);
  return { datasets };
};

/** The same question across studies: compared without case, spacing or curly quotes. */
export const promptKey = (prompt: string) =>
  prompt.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

/** Studies asked together share a name up to an audience suffix: "Survey (2026 Q4) [Design]". */
export const roundName = (studyName: string) => studyName.replace(/\s*\[[^\]]*\]\s*$/, "").trim();

/** Listed first when picking studies. */
export const isLikelyBloomStudy = (name: string) => /bloom|design system/i.test(name);

/** Where a question's answers go: an existing column, a new one, or nowhere. */
export type QuestionTarget = { to: "skip" } | { to: "column"; column: string } | { to: "new" };

export interface DistinctQuestion {
  key: string;
  prompt: string;
  type: string;
  questionIds: string[];
  /** The first study that asks it. */
  studyId: string;
}

/** Each question once, however many of the studies ask it: study by study, in the order each asks them. */
export const distinctQuestions = (questions: DxQuestion[]): DistinctQuestion[] => {
  const ordered = [...questions].sort((a, b) => a.studyId.localeCompare(b.studyId) || a.position - b.position);
  const byKey = new Map<string, DistinctQuestion>();
  for (const q of ordered) {
    const key = promptKey(q.prompt);
    const found = byKey.get(key);
    if (found) found.questionIds.push(q.id);
    else byKey.set(key, { key, prompt: q.prompt, type: q.type, questionIds: [q.id], studyId: q.studyId });
  }
  return [...byKey.values()];
};

export interface Round {
  name: string;
  studyIds: string[];
  /** The day of the round's last response: one collection date for the whole round. */
  lastResponse: string;
}

export const roundsOf = (studies: DxStudyData["studies"]): Round[] => {
  const byName = new Map<string, Round>();
  for (const s of studies) {
    const name = roundName(s.name);
    const round = byName.get(name) ?? { name, studyIds: [], lastResponse: "" };
    round.studyIds.push(s.id);
    if (s.lastResponse > round.lastResponse) round.lastResponse = s.lastResponse;
    byName.set(name, round);
  }
  return [...byName.values()].sort((a, b) => b.lastResponse.localeCompare(a.lastResponse));
};

/** Columns filled from the respondent rather than from an answer, by their usual keys. */
export const respondentColumns = (columns: Pick<ManualDatasetColumn, "key" | "kind">[]) => {
  const has = (key: string) => columns.find((c) => c.key === key)?.key;
  return {
    email: has("email") ?? columns.find((c) => c.kind === "email")?.key,
    team: has("team"),
    role: has("role"),
    level: has("level"),
    date: has("collection_date") ?? columns.find((c) => c.kind === "date")?.key,
  };
};

/** Who answered and when, added to a dataset that doesn't record it yet. */
const RESPONDENT_COLUMNS: NewColumn[] = [
  { key: "email", label: "Email", kind: "text" },
  { key: "team", label: "Team", kind: "text" },
  { key: "level", label: "Level", kind: "text" },
  { key: "role", label: "Role", kind: "text" },
  { key: "collection_date", label: "Collection date", kind: "date" },
];

/** The Bloom survey's questions, as asked since 2025, and the "Impact data" columns they fill. */
const KNOWN_QUESTIONS: [fragment: string, column: string][] = [
  ["how satisfied are you with bloom", "satisfaction_csat"],
  ["how does bloom affect your work speed", "perceived_efficiency_score"],
  ["how easy is it to find our design system", "discoverability_score"],
  ["how confident are you in your ability to use bloom", "user_confidence_score"],
  ["design-to-development handoff time", "design_to_development_handoff_time_score"],
  ["what have you appreciated most about using bloom", "working_well"],
  ["if you could change one thing about bloom", "needs_improvement"],
];

export const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/**
 * Where a question goes without asking: the dataset's last choice, a column named like the
 * question, or a known Bloom survey question. `undefined` when the dataset hasn't seen it.
 */
export const matchedTarget = (question: DistinctQuestion, columns: ManualDatasetColumn[], link?: DatasetLink): QuestionTarget | undefined => {
  const remembered = link?.questions[question.key];
  if (remembered === SKIP) return { to: "skip" };
  if (remembered && columns.some((c) => c.key === remembered)) return { to: "column", column: remembered };
  const same = columns.find((c) => promptKey(c.label) === question.key);
  if (same) return { to: "column", column: same.key };
  const known = KNOWN_QUESTIONS.find(([fragment]) => question.key.includes(fragment));
  if (known && columns.some((c) => c.key === known[1])) return { to: "column", column: known[1] };
  return undefined;
};

/**
 * Every question's starting target. Questions the dataset hasn't seen become new columns, unless
 * it already holds some of these questions: then they're likely asked once and left out.
 */
export const startingTargets = (questions: DistinctQuestion[], columns: ManualDatasetColumn[], link?: DatasetLink) => {
  const matched = questions.map((q) => [q.key, matchedTarget(q, columns, link)] as const);
  const tracksSome = matched.some(([, t]) => t?.to === "column");
  return {
    targets: Object.fromEntries(matched.map(([key, t]) => [key, t ?? (tracksSome ? { to: "skip" } : { to: "new" })])) as Record<string, QuestionTarget>,
    unseen: new Set(matched.filter(([, t]) => !t).map(([key]) => key)),
  };
};

/** Marks a row as coming from a GetDX response, so the next add doesn't add it again. Not a column. */
export const RESPONSE_ID_KEY = "getdx_response_id";

/** Rows imported from an export (before adding from GetDX existed) are matched by email within this many days of the study's last response. */
const MATCH_WINDOW_DAYS = 45;

const addDays = (isoDay: string, days: number) => {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export interface NewColumn {
  key: string;
  label: string;
  kind: DatasetColumnKind;
}

/** What to do with GetDX's answers to a question for responses already in the dataset. */
export type DuplicateChoice = "keep" | "replace" | "column";

/** How a question's GetDX answers compare with the dataset, for the responses already in it. */
export interface QuestionConflict {
  questionKey: string;
  column: string;
  /** Rows whose value differs from GetDX's. */
  differ: number;
  /** Rows with no value where GetDX has one. */
  missing: number;
  example?: { email: string; before: unknown; after: unknown };
}

export interface RowUpdate {
  rowId: string;
  set: Record<string, unknown>;
  /** The values replaced, so the change can be undone (null: there was no value). */
  before: Record<string, unknown>;
}

export interface AddPlan {
  newColumns: NewColumn[];
  rows: Record<string, unknown>[];
  /** Responses already in the dataset. */
  skipped: number;
  /** Question key → the column its answers fill. */
  columns: Record<string, string>;
  /** Questions whose answers for responses already in the dataset aren't the same as GetDX's. */
  conflicts: QuestionConflict[];
  /** Changes to rows already in the dataset, from the duplicate choices. */
  updates: RowUpdate[];
}

/** A column created by this add starts filled in for responses already there; otherwise nothing changes unless asked. */
export const defaultDuplicateChoice = (conflict: QuestionConflict, newColumns: Pick<NewColumn, "key">[]): DuplicateChoice =>
  conflict.differ === 0 && newColumns.some((c) => c.key === conflict.column) ? "replace" : "keep";

const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
const sameValue = (a: unknown, b: unknown) => {
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a ?? "").trim() === String(b ?? "").trim();
};

const answerValue = (type: string, value: string | undefined) => {
  const text = (value ?? "").trim();
  if (type === "rating_scale") {
    const n = Number(text);
    return text && Number.isFinite(n) ? n : null;
  }
  return text;
};

/**
 * The rows to add to the dataset. A response already in it (same GetDX response, or same email
 * around the time of the study) isn't added again: where its answers differ, `duplicates` says per
 * question whether to keep the dataset's, replace them, or put GetDX's in a new column beside them.
 * A response with no answer to the chosen questions is left out.
 */
export const planAdd = (input: {
  data: DxStudyData;
  targets: Record<string, QuestionTarget>;
  /** Collection date per round name. */
  roundDates: Record<string, string>;
  columns: ManualDatasetColumn[];
  rows: { id?: string; data: Record<string, unknown> | null }[];
  /** By question key; `defaultDuplicateChoice` when left out. */
  duplicates?: Record<string, DuplicateChoice>;
}): AddPlan => {
  const { data, targets, roundDates, columns, duplicates = {} } = input;
  const questions = distinctQuestions(data.questions);
  const typeOf = new Map(questions.map((q) => [q.key, q.type]));
  const keyOfQuestion = new Map(data.questions.map((q) => [q.id, promptKey(q.prompt)]));
  const studies = new Map(data.studies.map((s) => [s.id, s]));

  const existingWho = respondentColumns(columns);
  const has: Record<string, string | undefined> = { ...existingWho, collection_date: existingWho.date };
  // A dataset that doesn't say who answered gets all of it; one that does only needs a date.
  const newColumns = existingWho.email ? RESPONDENT_COLUMNS.filter((c) => c.key === "collection_date" && !has.collection_date) : RESPONDENT_COLUMNS.filter((c) => !has[c.key]);
  const plan: AddPlan = { newColumns, rows: [], skipped: 0, columns: {}, conflicts: [], updates: [] };
  const taken = () => new Set([...columns.map((c) => c.key), ...plan.newColumns.map((c) => c.key)]);
  const freeKey = (base: string) => {
    const used = taken();
    let key = base;
    for (let n = 2; used.has(key); n++) key = `${base}_${n}`;
    return key;
  };

  for (const q of questions) {
    const target = targets[q.key];
    if (!target || target.to === "skip") continue;
    if (target.to === "column") {
      plan.columns[q.key] = target.column;
      continue;
    }
    const key = freeKey(slugify(q.prompt) || `question_${q.questionIds[0]}`);
    plan.newColumns.push({ key, label: q.prompt, kind: q.type === "rating_scale" ? "rating" : "text" });
    plan.columns[q.key] = key;
  }
  if (!Object.keys(plan.columns).length) return { ...plan, newColumns: [] };

  const who = respondentColumns([...columns, ...plan.newColumns]);
  const existing = input.rows.map((r) => ({ id: r.id, data: r.data ?? {} }));
  const byResponseId = new Map(existing.filter((r) => r.data[RESPONSE_ID_KEY]).map((r) => [String(r.data[RESPONSE_ID_KEY]), r]));
  const byEmail = new Map<string, typeof existing>();
  if (who.email && who.date) {
    for (const r of existing) {
      const email = String(r.data[who.email] ?? "").trim().toLowerCase();
      if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), r]);
    }
  }

  /** Responses already in the dataset, with the row they're in and GetDX's answers by question. */
  const matches: { row: (typeof existing)[number]; email: string; answers: Map<string, unknown> }[] = [];

  for (const response of data.responses) {
    const study = studies.get(response.studyId);
    if (!study) continue;
    const answers = new Map(
      Object.entries(response.answers)
        .map(([questionId, value]) => [keyOfQuestion.get(questionId) ?? "", value] as const)
        .filter(([key]) => plan.columns[key])
        .map(([key, value]) => [key, answerValue(typeOf.get(key) ?? "", value)] as const),
    );
    if (![...answers.values()].some((v) => !isEmpty(v))) continue;

    const until = study.lastResponse ? addDays(study.lastResponse, MATCH_WINDOW_DAYS) : "9999-12-31";
    const match =
      byResponseId.get(response.id) ??
      (byEmail.get(response.email) ?? []).find((r) => {
        const d = String(r.data[who.date!] ?? "");
        return d >= study.createdAt && d <= until;
      });
    if (match) {
      plan.skipped += 1;
      matches.push({ row: match, email: response.email, answers });
      continue;
    }

    const values = [...answers].map(([key, value]) => [plan.columns[key], value] as const);
    const row: Record<string, unknown> = { [RESPONSE_ID_KEY]: response.id };
    if (who.email) row[who.email] = response.email;
    if (who.team) row[who.team] = response.team;
    if (who.role) row[who.role] = response.role;
    if (who.level) row[who.level] = response.level;
    if (who.date) row[who.date] = roundDates[roundName(study.name)] || study.lastResponse || response.respondedAt;
    for (const [column, value] of values) row[column] = value;
    plan.rows.push(row);
  }

  // Responses already there: compare each question's answer with the row's value.
  const updates = new Map<string, RowUpdate>();
  const labelOf = (key: string) => [...columns, ...plan.newColumns].find((c) => c.key === key)?.label ?? key;
  for (const q of questions) {
    const column = plan.columns[q.key];
    if (!column) continue;
    const conflict: QuestionConflict = { questionKey: q.key, column, differ: 0, missing: 0 };
    const changed: { row: (typeof existing)[number]; value: unknown }[] = [];
    for (const m of matches) {
      const after = m.answers.get(q.key);
      if (isEmpty(after)) continue;
      const before = m.row.data[column];
      if (isEmpty(before)) conflict.missing += 1;
      else if (!sameValue(before, after)) {
        conflict.differ += 1;
        conflict.example ??= { email: m.email, before, after };
      } else continue;
      changed.push({ row: m.row, value: after });
    }
    if (!changed.length) continue;
    plan.conflicts.push(conflict);

    const choice = duplicates[q.key] ?? defaultDuplicateChoice(conflict, plan.newColumns);
    if (choice === "keep") continue;
    let into = column;
    if (choice === "column") {
      const source = [...columns, ...plan.newColumns].find((c) => c.key === column);
      into = freeKey(`${column}_getdx`);
      plan.newColumns.push({ key: into, label: `${labelOf(column)} (GetDX)`, kind: source?.kind ?? "text" });
    }
    for (const { row, value } of changed) {
      if (!row.id) continue;
      const update = updates.get(row.id) ?? { rowId: row.id, set: {}, before: {} };
      update.set[into] = value;
      update.before[into] = row.data[into] ?? null;
      updates.set(row.id, update);
    }
  }
  plan.updates = [...updates.values()];
  return plan;
};

/** What the dataset remembers for next time, once new columns have their keys. */
export const linkAfterAdd = (studies: string[], targets: Record<string, QuestionTarget>, plan: AddPlan, previous?: DatasetLink): DatasetLink => {
  const questions = { ...previous?.questions };
  for (const [key, target] of Object.entries(targets)) {
    if (target.to === "skip") questions[key] = SKIP;
    else if (plan.columns[key]) questions[key] = plan.columns[key];
  }
  return { studies, questions };
};
