import type { DatasetColumnKind } from "@/hooks/useManualDatasets";
import { toIsoDate, type DateOrder } from "../../server/shared/dates.ts";

const PLAIN = /^-?\d+(?:[.,]\d+)?%?$/;
const THOUSANDS = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
/** A score followed by its label: "5 - Very satisfied", "4: Satisfied", "3) Neutral", "2 Unhappy". */
const LABELLED = /^(-?\d+(?:[.,]\d+)?)\s*(?:[-–—:=)]\s*|\s+)\D/;

/**
 * The number in a cell, or null when there isn't one. Survey exports often write a score
 * with its label ("5 - Very satisfied"); the leading number is the score.
 */
export const readNumber = (raw: string): number | null => {
  const value = raw.trim().replace(/\s+(?=\d)/g, "");
  if (!value) return null;
  if (THOUSANDS.test(value)) return Number(value.replace(/,/g, ""));
  if (PLAIN.test(value)) return Number(value.replace("%", "").replace(",", "."));
  const labelled = raw.trim().match(LABELLED);
  return labelled ? Number(labelled[1].replace(",", ".")) : null;
};

/**
 * What a typed, pasted or imported cell is saved as. Numbers and ratings that can't be read
 * are saved empty, never as 0, so they don't pull averages down.
 */
export const castCell = (kind: DatasetColumnKind, raw: string, dateOrder: DateOrder | null = null) => {
  const value = raw.trim();
  if (kind === "number" || kind === "rating") return readNumber(value);
  if (kind === "date") return value ? (toIsoDate(value, dateOrder) ?? value) : "";
  return value;
};

/** Non-empty cells a number or rating column can't read (they'd be saved empty). */
export const unreadableNumbers = (values: string[]) => values.filter((v) => v.trim() !== "" && readNumber(v) === null);
