import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { cellText, pickSheet, rowsToCsv } from "./spreadsheetFile";

describe("cellText", () => {
  it("writes dates as YYYY-MM-DD, with a time only when there is one", () => {
    expect(cellText(new Date(Date.UTC(2026, 10, 20)))).toBe("2026-11-20");
    expect(cellText(new Date(Date.UTC(2026, 10, 20, 9, 5)))).toBe("2026-11-20 09:05");
  });

  it("keeps numbers and leaves empty cells empty", () => {
    expect(cellText(5)).toBe("5");
    expect(cellText(4.5)).toBe("4.5");
    expect(cellText(null)).toBe("");
  });
});

describe("rowsToCsv", () => {
  it("round-trips through the CSV parser, commas, quotes and line breaks included", () => {
    const rows = [
      ["How satisfied are you with Bloom, Vinted's design system?", "What works well?"],
      ["5 - Very satisfied", 'Docs are "great".\nStorybook too.'],
      [3, null],
    ];
    expect(parseCsv(rowsToCsv(rows))).toEqual([
      ["How satisfied are you with Bloom, Vinted's design system?", "What works well?"],
      ["5 - Very satisfied", 'Docs are "great".\nStorybook too.'],
      ["3", ""],
    ]);
  });
});

describe("pickSheet", () => {
  it("skips Numbers' export summary and empty sheets, and takes the biggest", () => {
    const { sheet, withData } = pickSheet([
      { name: "Export Summary", rows: [["Table"], ["Responses"], ["Notes"], ["Other"]] },
      { name: "Notes", rows: [["a"], ["b"]] },
      { name: "Empty", rows: [[null, ""]] },
      { name: "Responses - Table 1", rows: [["Role"], ["Designer"], ["Engineer"]] },
    ]);
    expect(sheet?.name).toBe("Responses - Table 1");
    expect(withData).toBe(2);
  });
});
