import { describe, expect, it } from "vitest";
import { inferDateOrder, looksLikeDates, normalizeDateColumn, toIsoDate } from "../../server/shared/dates.ts";

describe("dates", () => {
  it("reads the Impact survey column as month-first, including the ambiguous 12/2/2024", () => {
    const column = ["3/26/2025", "6/18/2025", "9/22/2025", "12/23/2025", "2/27/2026", "5/29/2026", "12/2/2024"];
    const out = normalizeDateColumn(column);
    expect(out.order).toBe("mdy");
    expect(out.values).toEqual(["2025-03-26", "2025-06-18", "2025-09-22", "2025-12-23", "2026-02-27", "2026-05-29", "2024-12-02"]);
    expect(out.converted).toBe(7);
    expect(out.ambiguous).toBe(false);
  });

  it("reads day-first columns", () => {
    expect(normalizeDateColumn(["26/03/2025", "02/12/2024"]).values).toEqual(["2025-03-26", "2024-12-02"]);
  });

  it("leaves a column that could be either order untouched and flags it", () => {
    const out = normalizeDateColumn(["03/04/2025", "05/06/2025"]);
    expect(out.ambiguous).toBe(true);
    expect(out.values).toEqual(["03/04/2025", "05/06/2025"]);
    expect(normalizeDateColumn(["03/04/2025"], "dmy").values).toEqual(["2025-04-03"]);
  });

  it("flags columns that mix both orders", () => {
    expect(inferDateOrder(["13/01/2025", "01/13/2025"]).conflicting).toBe(true);
  });

  it("keeps ISO dates, pads year-first ones and reads written-out months", () => {
    expect(toIsoDate("2025-12-01")).toBe("2025-12-01");
    expect(toIsoDate("2026/3/5")).toBe("2026-03-05");
    expect(toIsoDate("Mar 26, 2025")).toBe("2025-03-26");
  });

  it("rejects impossible dates and non-dates", () => {
    expect(toIsoDate("2/30/2025", "mdy")).toBeNull();
    expect(toIsoDate("Marketplace")).toBeNull();
    expect(toIsoDate("2026-Q2")).toBeNull();
  });

  it("detects date columns for new CSV columns", () => {
    expect(looksLikeDates(["3/26/2025", "6/18/2025", ""])).toBe(true);
    expect(looksLikeDates(["Web Engineer", "3/26/2025"])).toBe(false);
  });
});
