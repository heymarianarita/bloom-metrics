import { describe, expect, it } from "vitest";
import { recentPeriods } from "../../server/shared/periods.ts";

describe("recentPeriods", () => {
  const now = Date.UTC(2026, 10, 24);

  it("counts back from the current quarter across years", () => {
    expect(recentPeriods("quarterly", 5, now)).toEqual(["2026-Q4", "2026-Q3", "2026-Q2", "2026-Q1", "2025-Q4"]);
  });

  it("works for months and half-years", () => {
    expect(recentPeriods("monthly", 3, now)).toEqual(["2026-11", "2026-10", "2026-09"]);
    expect(recentPeriods("semiannual", 3, now)).toEqual(["2026-H2", "2026-H1", "2025-H2"]);
  });
});
