import { describe, expect, it } from "vitest";
import type { ManualDatasetColumn } from "@/hooks/useManualDatasets";
import { IGNORE, NEW_COLUMN, answerCleanups, blockers, guessKind, planImport, type ImportChoices } from "./importPlan";

const column = (key: string, label: string, kind: ManualDatasetColumn["kind"], sort_order = 0): ManualDatasetColumn => ({
  id: key,
  dataset_id: "impact",
  key,
  label,
  kind,
  sort_order,
});

const impact = [
  column("email", "Email", "text"),
  column("role", "Role", "text"),
  column("team", "Team", "text"),
  column("collection_date", "Collection date", "date"),
  column("perceived_efficiency_score", "Perceived efficiency score", "rating"),
];
const use = { period: ["collection_date"], filters: ["role", "team"] };

const header = ["Role", "Tenure band", "How satisfied are you with Bloom?", "How does Bloom affect your speed?"];
const body = [
  ["Web Engineer", "3-5 years", "5 - Very satisfied", "4 - Somewhat speeds me up"],
  ["iOS Engineer", "5+ years", "3 - Neutral", "Not sure"],
];

const choices = (overrides: Partial<ImportChoices> = {}): ImportChoices => ({
  mapping: ["role", IGNORE, NEW_COLUMN, "perceived_efficiency_score"],
  newKinds: [],
  dateOrders: [],
  fixed: {},
  ...overrides,
});

describe("planImport", () => {
  it("saves labelled scores as numbers, and unreadable ones empty", () => {
    const plan = planImport(impact, header, body, choices(), use);
    expect(plan.rows[0].perceived_efficiency_score).toBe(4);
    expect(plan.rows[1].perceived_efficiency_score).toBeNull();
    expect(plan.unreadable).toEqual([{ label: "Perceived efficiency score", count: 1, examples: ["Not sure"] }]);
  });

  it("creates a new column as a rating when its answers are 1–5 scores", () => {
    const plan = planImport(impact, header, body, choices(), use);
    expect(plan.newColumns).toEqual([
      { key: "how_satisfied_are_you_with_bloom", label: "How satisfied are you with Bloom?", kind: "rating" },
    ]);
    expect(plan.rows.map((r) => r.how_satisfied_are_you_with_bloom)).toEqual([5, 3]);
  });

  it("flags the collection date and team when nothing fills them", () => {
    const plan = planImport(impact, header, body, choices(), use);
    expect(plan.missingPeriod).toEqual(["Collection date"]);
    expect(plan.missingFilters).toEqual(["Team"]);
    expect(plan.ignoredHeaders).toEqual(["Tenure band"]);
  });

  it("fills a column the file doesn't have with the same value for every row", () => {
    const plan = planImport(impact, header, body, choices({ fixed: { collection_date: "2026-11-20" } }), use);
    expect(plan.rows.map((r) => r.collection_date)).toEqual(["2026-11-20", "2026-11-20"]);
    expect(plan.missingPeriod).toEqual([]);
  });

  it("blocks two file columns going into the same dataset column", () => {
    const plan = planImport(impact, header, body, choices({ mapping: ["role", "role", IGNORE, IGNORE] }), use);
    expect(blockers(plan, body.length)).toEqual(["Role and Tenure band both go into “Role”. Pick one, and ignore the other."]);
  });

  it("blocks a new column that has the name of an existing one", () => {
    const plan = planImport(impact, ["Team"], [["Spark"]], choices({ mapping: [NEW_COLUMN] }), use);
    expect(plan.newColumns).toEqual([]);
    expect(blockers(plan, 1)[0]).toContain("already has a “Team” column");
  });

  it("asks for the date order only when the dates could be read either way", () => {
    const dates = planImport(impact, ["When"], [["03/04/2025"], ["05/06/2025"]], choices({ mapping: ["collection_date"] }), use);
    expect(dates.ambiguousDates).toEqual([0]);
    const picked = planImport(
      impact,
      ["When"],
      [["03/04/2025"], ["05/06/2025"]],
      choices({ mapping: ["collection_date"], dateOrders: ["dmy"] }),
      use,
    );
    expect(picked.ambiguousDates).toEqual([]);
    expect(picked.rows[0].collection_date).toBe("2025-04-03");
  });
});

describe("answer clean-up", () => {
  it("lists each distinct answer with its score and label, unreadable ones last", () => {
    const plan = planImport(impact, header, body, choices(), use);
    const [efficiency] = answerCleanups(plan, body).filter((c) => c.column.key === "perceived_efficiency_score");
    expect(efficiency.answers).toEqual([
      { raw: "4 - Somewhat speeds me up", count: 1, saved: 4, label: "Somewhat speeds me up", unreadable: false, overridden: false },
      { raw: "Not sure", count: 1, saved: null, label: "", unreadable: true, overridden: false },
    ]);
  });

  it("saves the number picked for an unreadable answer", () => {
    const overrides = { 3: { "Not sure": "3" } };
    const plan = planImport(impact, header, body, choices({ overrides }), use);
    expect(plan.rows[1].perceived_efficiency_score).toBe(3);
    expect(plan.unreadable).toEqual([]);
    const [efficiency] = answerCleanups(plan, body, overrides).filter((c) => c.column.key === "perceived_efficiency_score");
    expect(efficiency.answers.find((a) => a.raw === "Not sure")).toMatchObject({ saved: 3, overridden: true, unreadable: false });
  });

  it("can leave an answer empty on purpose", () => {
    const plan = planImport(impact, header, body, choices({ overrides: { 3: { "Not sure": "" } } }), use);
    expect(plan.rows[1].perceived_efficiency_score).toBeNull();
    expect(plan.unreadable).toEqual([]);
  });
});

describe("guessKind", () => {
  it("tells ratings, numbers, dates and text apart", () => {
    expect(guessKind(["5 - Very satisfied", "4 - Satisfied", ""])).toBe("rating");
    expect(guessKind(["12", "140"])).toBe("number");
    expect(guessKind(["3/26/2025", "6/18/2025"])).toBe("date");
    expect(guessKind(["Love it", "4"])).toBe("text");
  });
});
