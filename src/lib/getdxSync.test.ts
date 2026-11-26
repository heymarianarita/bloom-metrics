import { describe, expect, it } from "vitest";
import type { ManualDatasetColumn } from "@/hooks/useManualDatasets";
import {
  RESPONSE_ID_KEY,
  SKIP,
  distinctQuestions,
  linkAfterAdd,
  matchedTarget,
  planAdd,
  readGetdxConfig,
  roundsOf,
  startingTargets,
  type DxStudyData,
  type QuestionTarget,
} from "./getdxSync";

const col = (dataset_id: string, key: string, label: string, kind: ManualDatasetColumn["kind"] = "text"): ManualDatasetColumn => ({
  id: `${dataset_id}:${key}`,
  dataset_id,
  key,
  label,
  kind,
  sort_order: 0,
});

const impact = [
  col("impact", "email", "Email"),
  col("impact", "role", "Role"),
  col("impact", "team", "Team"),
  col("impact", "collection_date", "Collection date", "date"),
  col("impact", "satisfaction_csat", "Satisfaction (CSAT)", "rating"),
  col("impact", "working_well", "Working well"),
];
const oneOff = [col("oneoff", "email", "Email"), col("oneoff", "collection_date", "Collection date", "date"), col("oneoff", "docs", "How often do you read the docs?")];

const data: DxStudyData = {
  studies: [
    { id: "1", name: "Bloom survey (2027 Q1) [Design]", createdAt: "2027-02-10", lastResponse: "2027-02-14" },
    { id: "2", name: "Bloom survey (2027 Q1) [Engineering]", createdAt: "2027-02-10", lastResponse: "2027-02-16" },
  ],
  questions: [
    { id: "10", studyId: "1", type: "rating_scale", prompt: "How satisfied are you with Bloom, Vinted’s design system?", position: 0 },
    { id: "11", studyId: "1", type: "long_text", prompt: "What have you appreciated most about using Bloom?", position: 1 },
    { id: "12", studyId: "1", type: "long_text", prompt: "How often do you read the docs?", position: 2 },
    { id: "13", studyId: "1", type: "long_text", prompt: "What should we build next?", position: 3 },
    { id: "20", studyId: "2", type: "rating_scale", prompt: "How satisfied are you with Bloom, Vinted's design system?", position: 0 },
    { id: "21", studyId: "2", type: "long_text", prompt: "What have you appreciated most about using Bloom?", position: 1 },
  ],
  responses: [
    { id: "r1", studyId: "1", respondedAt: "2027-02-11", email: "ana@vinted.com", team: "Team A", role: "Product Designer", level: "IC3", answers: { "10": "4", "11": "Tokens", "12": "Weekly", "13": "" } },
    { id: "r2", studyId: "2", respondedAt: "2027-02-12", email: "ben@vinted.com", team: "Team B", role: "Web Engineer", level: "IC2", answers: { "20": "5", "21": "" } },
    { id: "r3", studyId: "2", respondedAt: "2027-02-16", email: "cy@vinted.com", team: "Team B", role: "Web Engineer", level: "IC4", answers: { "20": "3" } },
  ],
};

const questions = distinctQuestions(data.questions);
const [satisfied, appreciated, docs, next] = questions;
const roundDates = { "Bloom survey (2027 Q1)": "2027-02-20" };

describe("distinctQuestions", () => {
  it("treats the same prompt in several studies as one question, ignoring curly quotes", () => {
    expect(questions).toHaveLength(4);
    expect(questions[0].questionIds).toEqual(["10", "20"]);
  });
});

describe("roundsOf", () => {
  it("groups studies that differ only by their [audience] and dates the round by its last response", () => {
    expect(roundsOf(data.studies)).toEqual([{ name: "Bloom survey (2027 Q1)", studyIds: ["1", "2"], lastResponse: "2027-02-16" }]);
  });
});

describe("matchedTarget", () => {
  it("sends the Bloom survey's known questions to their Impact data columns", () => {
    expect(matchedTarget(satisfied, impact)).toEqual({ to: "column", column: "satisfaction_csat" });
    expect(matchedTarget(appreciated, impact)).toEqual({ to: "column", column: "working_well" });
  });

  it("matches a column named like the question, and follows the dataset's last choice", () => {
    expect(matchedTarget(docs, oneOff)).toEqual({ to: "column", column: "docs" });
    expect(matchedTarget(satisfied, impact, { studies: [], questions: { [satisfied.key]: SKIP } })).toEqual({ to: "skip" });
    expect(matchedTarget(next, impact)).toBeUndefined();
  });
});

describe("startingTargets", () => {
  it("leaves unseen questions out of a dataset that already holds some of them", () => {
    const { targets, unseen } = startingTargets(questions, impact);
    expect(targets[next.key]).toEqual({ to: "skip" });
    expect([...unseen]).toEqual([docs.key, next.key]);
  });

  it("makes every question a new column in a dataset that holds none of them", () => {
    const { targets } = startingTargets(questions, []);
    expect(Object.values(targets).every((t) => t.to === "new")).toBe(true);
  });
});

describe("planAdd", () => {
  const targets: Record<string, QuestionTarget> = {
    [satisfied.key]: { to: "column", column: "satisfaction_csat" },
    [appreciated.key]: { to: "column", column: "working_well" },
    [docs.key]: { to: "skip" },
    [next.key]: { to: "skip" },
  };

  it("builds rows with the respondent, the round's date and numeric ratings", () => {
    const plan = planAdd({ data, targets, roundDates, columns: impact, rows: [] });
    expect(plan.newColumns).toEqual([]);
    expect(plan.rows[0]).toEqual({
      [RESPONSE_ID_KEY]: "r1",
      email: "ana@vinted.com",
      team: "Team A",
      role: "Product Designer",
      collection_date: "2027-02-20",
      satisfaction_csat: 4,
      working_well: "Tokens",
    });
    expect(plan.rows).toHaveLength(3);
  });

  it("skips responses already added, or imported from an export around the study's dates", () => {
    const rows = [
      { data: { [RESPONSE_ID_KEY]: "r1" } },
      { data: { email: "BEN@vinted.com", collection_date: "2027-03-01" } },
      { data: { email: "cy@vinted.com", collection_date: "2026-11-23" } },
    ];
    const plan = planAdd({ data, targets, roundDates, columns: impact, rows });
    expect(plan.skipped).toBe(2);
    expect(plan.rows.map((r) => r[RESPONSE_ID_KEY])).toEqual(["r3"]);
  });

  it("gives an empty dataset who answered and when, plus a column per question, leaving out empty answers", () => {
    const plan = planAdd({ data, targets: { [next.key]: { to: "new" }, [docs.key]: { to: "new" } }, roundDates, columns: [], rows: [] });
    expect(plan.newColumns.map((c) => c.key)).toEqual(["email", "team", "level", "role", "collection_date", "how_often_do_you_read_the_docs", "what_should_we_build_next"]);
    expect(plan.rows).toEqual([
      { [RESPONSE_ID_KEY]: "r1", email: "ana@vinted.com", team: "Team A", level: "IC3", role: "Product Designer", collection_date: "2027-02-20", how_often_do_you_read_the_docs: "Weekly", what_should_we_build_next: "" },
    ]);
  });

  describe("responses already in the dataset", () => {
    const rows = [
      { id: "a", data: { [RESPONSE_ID_KEY]: "r1", satisfaction_csat: 3, working_well: "Tokens" } },
      { id: "b", data: { email: "ben@vinted.com", collection_date: "2027-02-20", satisfaction_csat: "5" } },
      { id: "c", data: { email: "cy@vinted.com", collection_date: "2027-02-20" } },
    ];

    it("flags the questions whose answers differ or are missing, and keeps what's there by default", () => {
      const plan = planAdd({ data, targets, roundDates, columns: impact, rows });
      expect(plan.skipped).toBe(3);
      expect(plan.rows).toEqual([]);
      expect(plan.conflicts).toEqual([
        { questionKey: satisfied.key, column: "satisfaction_csat", differ: 1, missing: 1, example: { email: "ana@vinted.com", before: 3, after: 4 } },
      ]);
      expect(plan.updates).toEqual([]);
    });

    it("replaces the answers in place, remembering the old values", () => {
      const plan = planAdd({ data, targets, roundDates, columns: impact, rows, duplicates: { [satisfied.key]: "replace" } });
      expect(plan.newColumns).toEqual([]);
      expect(plan.updates).toEqual([
        { rowId: "a", set: { satisfaction_csat: 4 }, before: { satisfaction_csat: 3 } },
        { rowId: "c", set: { satisfaction_csat: 3 }, before: { satisfaction_csat: null } },
      ]);
    });

    it("fills a question added as a new column in for responses already there, unless asked not to", () => {
      const asNew = { ...targets, [docs.key]: { to: "new" } as QuestionTarget };
      const plan = planAdd({ data, targets: asNew, roundDates, columns: impact, rows });
      expect(plan.updates).toContainEqual({ rowId: "a", set: { how_often_do_you_read_the_docs: "Weekly" }, before: { how_often_do_you_read_the_docs: null } });
      const left = planAdd({ data, targets: asNew, roundDates, columns: impact, rows, duplicates: { [docs.key]: "keep" } });
      expect(left.updates.some((u) => "how_often_do_you_read_the_docs" in u.set)).toBe(false);
    });

    it("puts GetDX's answers in a new column beside the dataset's", () => {
      const plan = planAdd({ data, targets, roundDates, columns: impact, rows, duplicates: { [satisfied.key]: "column" } });
      expect(plan.newColumns).toEqual([{ key: "satisfaction_csat_getdx", label: "Satisfaction (CSAT) (GetDX)", kind: "rating" }]);
      expect(plan.updates.map((u) => [u.rowId, u.set])).toEqual([
        ["a", { satisfaction_csat_getdx: 4 }],
        ["c", { satisfaction_csat_getdx: 3 }],
      ]);
    });
  });

  it("adds no columns when no question is chosen", () => {
    expect(planAdd({ data, targets: {}, roundDates, columns: [], rows: [] }).newColumns).toEqual([]);
  });
});

describe("linkAfterAdd", () => {
  it("remembers the studies, each question's column, including new ones, and the questions left out", () => {
    const plan = { newColumns: [], rows: [], skipped: 0, columns: { [satisfied.key]: "satisfied" }, conflicts: [], updates: [] };
    expect(linkAfterAdd(["1"], { [satisfied.key]: { to: "new" }, [next.key]: { to: "skip" } }, plan)).toEqual({
      studies: ["1"],
      questions: { [satisfied.key]: "satisfied", [next.key]: SKIP },
    });
  });
});

describe("readGetdxConfig", () => {
  it("turns the earlier main-dataset and one-off settings into one link per dataset", () => {
    const config = readGetdxConfig({
      studyDataset: "impact",
      studies: ["1"],
      questions: { a: { datasetId: "impact", column: "x" }, b: { datasetId: "oneoff", column: "y" }, c: "skip" },
    });
    expect(config.datasets).toEqual({
      impact: { studies: ["1"], questions: { a: "x", c: SKIP } },
      oneoff: { studies: ["1"], questions: { b: "y" } },
    });
  });
});
