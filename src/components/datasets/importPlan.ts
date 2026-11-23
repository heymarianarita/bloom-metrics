import { slugify, type DatasetColumnKind, type ManualDatasetColumn } from "@/hooks/useManualDatasets";
import { castCell, readNumber, unreadableNumbers } from "@/lib/cellValues";
import { inferDateOrder, looksLikeDates, normalizeDateColumn, type DateOrder } from "../../../server/shared/dates.ts";

export const IGNORE = "__ignore__";
export const NEW_COLUMN = "__new__";

/** What the person picked in the import sheet. Index i is the file's column i. */
export interface ImportChoices {
  mapping: string[];
  /** Type of each new column (only read where mapping[i] is NEW_COLUMN). */
  newKinds: (DatasetColumnKind | null)[];
  /** Month-first or day-first, for date columns the file itself can't tell. */
  dateOrders: (DateOrder | null)[];
  /** Dataset column key → the same value for every row, for columns the file doesn't have. */
  fixed: Record<string, string>;
  /** Per file column: an answer as written → what to save instead (e.g. "Not sure" → "3", or "" to leave it empty). */
  overrides?: Record<number, Record<string, string>>;
}

/** One distinct answer of a number or rating column, and what it's saved as. */
export interface AnswerCleanup {
  raw: string;
  count: number;
  saved: number | null;
  /** The label after the score, e.g. "Very satisfied" in "5 - Very satisfied". */
  label: string;
  /** Neither the answer itself nor a choice made for it gives a number. */
  unreadable: boolean;
  overridden: boolean;
  /** What was typed for it, when overridden. */
  override?: string;
}

/** Which dataset columns the dataset's metrics read. */
export interface MetricUse {
  period: string[];
  filters: string[];
}

export interface PlannedColumn {
  key: string;
  label: string;
  kind: DatasetColumnKind;
  isNew: boolean;
  /** File column it's filled from, or null when it gets the same value for every row. */
  fileIndex: number | null;
}

export interface ImportPlan {
  /** Every dataset column the import fills, in the dataset's order, new ones last. */
  columns: PlannedColumn[];
  newColumns: { key: string; label: string; kind: DatasetColumnKind }[];
  /** Exactly what is saved, one object per row. */
  rows: Record<string, unknown>[];
  ignoredHeaders: string[];
  /** Number or rating cells that can't be read and are saved empty. */
  unreadable: { label: string; count: number; examples: string[] }[];
  /** Two file columns going into the same dataset column. */
  duplicates: { label: string; headers: string[] }[];
  /** New columns whose name matches a column the dataset already has. */
  clashes: { header: string; existing: string }[];
  /** File columns with dates that could be read either way, waiting for a choice. */
  ambiguousDates: number[];
  /** Columns metrics group by that this import leaves empty: the rows wouldn't show on charts. */
  missingPeriod: string[];
  /** Columns metrics filter by that this import leaves empty. */
  missingFilters: string[];
}

const valuesAt = (body: string[][], index: number) => body.map((row) => (row[index] ?? "").trim());

/** A type for a new column, from all of its values. */
export const guessKind = (values: string[]): DatasetColumnKind => {
  const filled = values.filter(Boolean);
  if (!filled.length) return "text";
  if (looksLikeDates(filled.slice(0, 20))) return "date";
  const numbers = filled.map(readNumber);
  if (numbers.some((n) => n === null)) return "text";
  return numbers.every((n) => Number.isInteger(n) && n! >= 1 && n! <= 5) ? "rating" : "number";
};

/** The dataset column each file column matches by name, or IGNORE. */
export const autoMatch = (header: string, columns: ManualDatasetColumn[]) => {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(header);
  const hit = columns.find((column) => norm(column.label) === target || norm(column.key) === target);
  return hit?.key ?? IGNORE;
};

export const planImport = (
  columns: ManualDatasetColumn[],
  header: string[],
  body: string[][],
  choices: ImportChoices,
  use: MetricUse = { period: [], filters: [] },
): ImportPlan => {
  const labelOf = (index: number) => header[index] || `Column ${index + 1}`;
  const existingKeys = new Set(columns.map((c) => c.key));

  const fromFile = new Map<string, number[]>();
  const newColumns: ImportPlan["newColumns"] = [];
  const newByIndex = new Map<number, PlannedColumn>();
  const clashes: ImportPlan["clashes"] = [];
  const ignoredHeaders: string[] = [];

  header.forEach((_, index) => {
    const choice = choices.mapping[index] ?? IGNORE;
    if (choice === IGNORE) {
      ignoredHeaders.push(labelOf(index));
      return;
    }
    if (choice === NEW_COLUMN) {
      const label = labelOf(index).trim();
      const key = slugify(label) || `col_${index}`;
      const clash = columns.find((c) => c.key === key);
      if (clash) {
        clashes.push({ header: label, existing: clash.label });
        return;
      }
      const kind = choices.newKinds[index] ?? guessKind(valuesAt(body, index));
      fromFile.set(key, [...(fromFile.get(key) ?? []), index]);
      if (!newColumns.some((c) => c.key === key)) newColumns.push({ key, label, kind });
      newByIndex.set(index, { key, label, kind, isNew: true, fileIndex: index });
      return;
    }
    if (existingKeys.has(choice)) fromFile.set(choice, [...(fromFile.get(choice) ?? []), index]);
  });

  const duplicates = [...fromFile.entries()]
    .filter(([, indexes]) => indexes.length > 1)
    .map(([key, indexes]) => ({
      label: columns.find((c) => c.key === key)?.label ?? newByIndex.get(indexes[0])?.label ?? key,
      headers: indexes.map(labelOf),
    }));

  const planned: PlannedColumn[] = [];
  for (const column of columns) {
    const indexes = fromFile.get(column.key);
    if (indexes) planned.push({ key: column.key, label: column.label, kind: column.kind, isNew: false, fileIndex: indexes[0] });
    else if ((choices.fixed[column.key] ?? "").trim())
      planned.push({ key: column.key, label: column.label, kind: column.kind, isNew: false, fileIndex: null });
  }
  for (const column of newColumns) planned.push(newByIndex.get(fromFile.get(column.key)![0])!);

  const ambiguousDates: number[] = [];
  const orders = new Map<number, DateOrder | null>();
  for (const column of planned) {
    if (column.fileIndex === null || column.kind !== "date") continue;
    const values = valuesAt(body, column.fileIndex);
    const picked = choices.dateOrders[column.fileIndex] ?? null;
    if (!picked && normalizeDateColumn(values).ambiguous) ambiguousDates.push(column.fileIndex);
    orders.set(column.fileIndex, picked ?? inferDateOrder(values).order);
  }

  const overrideFor = (fileIndex: number | null, raw: string) =>
    fileIndex === null ? undefined : choices.overrides?.[fileIndex]?.[raw.trim()];

  const rows = body.map((cells) => {
    const data: Record<string, unknown> = {};
    for (const column of planned) {
      const raw = column.fileIndex === null ? choices.fixed[column.key] : (cells[column.fileIndex] ?? "");
      const value = overrideFor(column.fileIndex, raw) ?? raw;
      data[column.key] = castCell(column.kind, value, column.fileIndex === null ? null : orders.get(column.fileIndex));
    }
    return data;
  });

  const unreadable = planned
    .filter((c) => c.kind === "number" || c.kind === "rating")
    .map((c) => {
      const values = c.fileIndex === null ? [choices.fixed[c.key]] : valuesAt(body, c.fileIndex);
      const bad = unreadableNumbers(values.filter((v) => overrideFor(c.fileIndex, v) === undefined));
      return { label: c.label, count: bad.length, examples: [...new Set(bad)].slice(0, 3) };
    })
    .filter((u) => u.count > 0);

  const filledKeys = new Set(planned.map((c) => c.key));
  const missing = (keys: string[]) =>
    [...new Set(keys)]
      .filter((key) => existingKeys.has(key) && !filledKeys.has(key))
      .map((key) => columns.find((c) => c.key === key)!.label);

  return {
    columns: planned,
    newColumns,
    rows,
    ignoredHeaders,
    unreadable,
    duplicates,
    clashes,
    ambiguousDates,
    missingPeriod: missing(use.period),
    missingFilters: missing(use.filters.filter((key) => !use.period.includes(key))),
  };
};

/**
 * The distinct answers of each number or rating column filled from the file, highest score
 * first and unreadable ones last, for the clean-up step.
 */
export const answerCleanups = (
  plan: ImportPlan,
  body: string[][],
  overrides: ImportChoices["overrides"] = {},
): { column: PlannedColumn; answers: AnswerCleanup[] }[] =>
  plan.columns
    .filter((c) => c.fileIndex !== null && (c.kind === "number" || c.kind === "rating"))
    .map((column) => {
      const counts = new Map<string, number>();
      for (const raw of valuesAt(body, column.fileIndex!)) if (raw) counts.set(raw, (counts.get(raw) ?? 0) + 1);
      const answers = [...counts.entries()].map(([raw, count]): AnswerCleanup => {
        const override = overrides[column.fileIndex!]?.[raw];
        const saved = readNumber(override ?? raw);
        const label = raw.replace(/^\s*-?\d+(?:[.,]\d+)?\s*(?:[-–—:=)]\s*)?/, "").trim();
        return {
          raw,
          count,
          saved: override === "" ? null : saved,
          label: label === raw ? "" : label,
          unreadable: override === undefined && saved === null,
          overridden: override !== undefined,
          override,
        };
      });
      answers.sort((a, b) => Number(a.unreadable) - Number(b.unreadable) || (b.saved ?? -Infinity) - (a.saved ?? -Infinity));
      return { column, answers };
    });

/** Why the import can't go ahead yet, in the order the person should fix things. */
export const blockers = (plan: ImportPlan, rowCount: number) => {
  const reasons: string[] = [];
  if (!rowCount) reasons.push("The file has no rows to import.");
  for (const c of plan.clashes)
    reasons.push(`The dataset already has a “${c.existing}” column. Pick it for “${c.header}” instead of creating a new one.`);
  for (const d of plan.duplicates)
    reasons.push(`${d.headers.join(" and ")} both go into “${d.label}”. Pick one, and ignore the other.`);
  if (!plan.columns.length && !plan.clashes.length) reasons.push("Match at least one column.");
  if (plan.ambiguousDates.length) reasons.push("Pick how the dates are written.");
  return reasons;
};
