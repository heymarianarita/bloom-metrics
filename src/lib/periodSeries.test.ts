import { describe, expect, it } from "vitest";
import { periodSeries } from "../../server/shared/aggregate.ts";
import { bucketRange, sameDayCutoff } from "../../server/shared/periods.ts";

const weeks = [
  { week: "2026-07-06", inserts: 10, detaches: 1 },
  { week: "2026-07-27", inserts: 20, detaches: 1 },
  { week: "2026-09-14", inserts: 30, detaches: 2 },
  { week: "2026-10-05", inserts: 40, detaches: 4 },
  { week: "2026-10-26", inserts: 50, detaches: 1 },
];
const sum = { value_column: "inserts", period_column: "week", aggregation: "sum" };

describe("periodSeries", () => {
  it("adds up a quarter's weeks with over_time total", () => {
    const out = periodSeries(weeks, { ...sum, aggregation_options: { over_time: "total" } }, "quarterly");
    expect(out).toEqual([
      { period: "2026-Q4", value: 90, rows: 2 },
      { period: "2026-Q3", value: 60, rows: 3 },
    ]);
  });

  it("averages each date's value by default, as before", () => {
    const out = periodSeries(weeks, sum, "quarterly");
    expect(out[0]).toEqual({ period: "2026-Q4", value: 45, rows: 2 });
  });

  it("takes only the period's last date with over_time last", () => {
    const scans = [
      { scanned: "2026-07-01", bloom: 50, elements: 100 },
      { scanned: "2026-09-30", bloom: 60, elements: 100 },
    ];
    const out = periodSeries(
      scans,
      { value_column: "bloom", period_column: "scanned", aggregation: "ratio", aggregation_options: { over_time: "last", denominator_column: "elements" } },
      "quarterly",
    );
    expect(out).toEqual([{ period: "2026-Q3", value: 60, rows: 1 }]);
  });

  it("leaves out rows after a cutoff in that period only", () => {
    const cutoff = Date.UTC(2026, 6, 30, 23, 59, 59);
    const out = periodSeries(weeks, { ...sum, aggregation_options: { over_time: "total" } }, "quarterly", { "2026-Q3": cutoff });
    expect(out.find((p) => p.period === "2026-Q3")).toEqual({ period: "2026-Q3", value: 30, rows: 2 });
    expect(out.find((p) => p.period === "2026-Q4")?.value).toBe(90);
  });

  it("keeps quarter-labelled rows whole: they have no dates to cut by", () => {
    const rows = [{ quarter: "2026-Q3", inserts: 7 }];
    const out = periodSeries(rows, { value_column: "inserts", period_column: "quarter", aggregation: "sum" }, "quarterly", {
      "2026-Q3": Date.UTC(2026, 6, 30),
    });
    expect(out).toEqual([{ period: "2026-Q3", value: 7, rows: 1 }]);
  });
});

describe("sameDayCutoff", () => {
  it("cuts the previous quarter as far in as today is into the current one", () => {
    const now = Date.UTC(2026, 9, 30, 12);
    const cutoff = sameDayCutoff("2026-Q4", "2026-Q3", "quarterly", now)!;
    expect(new Date(cutoff).toISOString().slice(0, 10)).toBe("2026-07-30");
  });

  it("doesn't cut once the shown period has ended", () => {
    expect(sameDayCutoff("2026-Q3", "2026-Q2", "quarterly", Date.UTC(2026, 9, 30))).toBeNull();
  });

  it("never goes past the end of a shorter compared period", () => {
    // 31 March is day 31 of Q1's third month… February is shorter: the cut stays inside the period.
    const cutoff = sameDayCutoff("2026-03", "2026-02", "monthly", Date.UTC(2026, 2, 31, 9))!;
    expect(new Date(cutoff).toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("knows where an ISO week starts", () => {
    expect(new Date(bucketRange("2026-W44", "weekly")!.start).toISOString().slice(0, 10)).toBe("2026-10-26");
  });
});
