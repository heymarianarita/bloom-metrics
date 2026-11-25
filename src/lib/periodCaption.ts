const ALL = "__all__";

/** Filter values that actually narrow the numbers, ignoring "All …" and a column this section breaks down by. */
export const appliedFilterValues = (segments: Record<string, string>, skipLabels: string[] = []): string[] =>
  Object.entries(segments)
    .filter(([label, value]) => Boolean(value) && value !== ALL && !skipLabels.includes(label))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);

/** "filtered to Product Designer" — empty when nothing is narrowed. */
export const filterNote = (segments: Record<string, string>, skipLabels: string[] = []): string => {
  const applied = appliedFilterValues(segments, skipLabels);
  if (applied.length === 0) return "";
  if (applied.length === 1) return `filtered to ${applied[0]}`;
  if (applied.length === 2) return `filtered to ${applied[0]} and ${applied[1]}`;
  return `filtered to ${applied.slice(0, -1).join(", ")}, and ${applied[applied.length - 1]}`;
};

/** A label with the active filters appended, e.g. "Quarterly · filtered to Product Designer". */
export const withFilterNote = (label: string, segments: Record<string, string>, skipLabels: string[] = []): string => {
  const note = filterNote(segments, skipLabels);
  return note ? `${label} · ${note}` : label;
};

/** The period beside a section, noting the filters that narrow it. */
export const periodCaption = (period: string, segments: Record<string, string> = {}, skipLabels: string[] = []): string =>
  withFilterNote(!period || period === ALL ? "Latest period" : period, segments, skipLabels);

/** Empty breakdown copy. When a filter removed every row, say who has no answers in this period. */
export const emptyBreakdownCopy = (
  splitBy: string,
  period: string,
  segments: Record<string, string> = {},
  skipLabels: string[] = [],
  latestOtherPeriod?: string,
): { title: string; body: string } => {
  const applied = appliedFilterValues(segments, skipLabels);
  if (applied.length === 0) {
    return {
      title: "No breakdown yet",
      body: `No values split by ${splitBy} for the selected period.`,
    };
  }
  const who =
    applied.length === 1
      ? applied[0]
      : applied.length === 2
        ? `${applied[0]} and ${applied[1]}`
        : `${applied.slice(0, -1).join(", ")}, and ${applied[applied.length - 1]}`;
  const shown = !period || period === ALL ? "the latest period" : period;
  const verb = applied.length === 1 ? "has" : "have";
  const latest = latestOtherPeriod ? ` Their latest answers are in ${latestOtherPeriod}.` : "";
  return {
    title: `No answers in ${shown}`,
    body: `${who} ${verb} no answers in ${shown}.${latest}`,
  };
};
