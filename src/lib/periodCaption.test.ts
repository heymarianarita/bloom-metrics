import { describe, expect, it } from "vitest";
import { emptyBreakdownCopy, filterNote, periodCaption, withFilterNote } from "./periodCaption";

const ALL = "__all__";

describe("periodCaption", () => {
  it("shows only the period when every filter is All", () => {
    expect(periodCaption("2026-Q4", { Role: ALL, Team: ALL })).toBe("2026-Q4");
    expect(periodCaption(ALL, {})).toBe("Latest period");
  });

  it("says which filter is applied", () => {
    expect(periodCaption("2026-Q4", { Role: "Product Designer", Team: ALL })).toBe(
      "2026-Q4 · filtered to Product Designer",
    );
  });

  it("lists every applied filter, and skips the column this section breaks down by", () => {
    expect(periodCaption("2026-Q4", { Role: "Product Designer", Team: "Order" }, ["Role"])).toBe(
      "2026-Q4 · filtered to Order",
    );
    expect(filterNote({ Role: "Product Designer", Team: "Order" })).toBe("filtered to Product Designer and Order");
  });

  it("says which filter has no answers in the selected period", () => {
    expect(emptyBreakdownCopy("role", "2026-Q4", { Team: "A-Team", Role: "Web Engineer" }, ["Role"], "2026-Q1")).toEqual({
      title: "No answers in 2026-Q4",
      body: "A-Team has no answers in 2026-Q4. Their latest answers are in 2026-Q1.",
    });
    expect(emptyBreakdownCopy("role", "2026-Q4", { Role: ALL })).toEqual({
      title: "No breakdown yet",
      body: "No values split by role for the selected period.",
    });
  });

  it("appends the note to another label", () => {
    expect(withFilterNote("Quarterly", { Role: "Product Designer" })).toBe("Quarterly · filtered to Product Designer");
    expect(withFilterNote("Quarterly", { Role: ALL })).toBe("Quarterly");
  });
});