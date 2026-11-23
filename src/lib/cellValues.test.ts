import { describe, expect, it } from "vitest";
import { castCell, readNumber, unreadableNumbers } from "./cellValues";

describe("readNumber", () => {
  it("reads plain numbers", () => {
    expect(readNumber("4")).toBe(4);
    expect(readNumber("4.5")).toBe(4.5);
    expect(readNumber("4,5")).toBe(4.5);
    expect(readNumber("1,234")).toBe(1234);
    expect(readNumber("1 234")).toBe(1234);
    expect(readNumber("-2")).toBe(-2);
    expect(readNumber("40%")).toBe(40);
  });

  it("reads survey scores written with their label", () => {
    expect(readNumber("5 - Very satisfied")).toBe(5);
    expect(readNumber("3 – Neutral")).toBe(3);
    expect(readNumber("4: Satisfied")).toBe(4);
    expect(readNumber("2) Somewhat difficult")).toBe(2);
    expect(readNumber("1 Greatly slows me down")).toBe(1);
  });

  it("returns null for empty cells and text without a leading score", () => {
    expect(readNumber("")).toBeNull();
    expect(readNumber("   ")).toBeNull();
    expect(readNumber("Very satisfied")).toBeNull();
    expect(readNumber("n/a")).toBeNull();
    expect(readNumber("2024-12-02")).toBeNull();
  });
});

describe("castCell", () => {
  it("saves unreadable ratings empty instead of 0", () => {
    expect(castCell("rating", "Very satisfied")).toBeNull();
    expect(castCell("rating", "5 - Very satisfied")).toBe(5);
  });

  it("keeps text as written and normalises dates", () => {
    expect(castCell("text", "  Web Engineer ")).toBe("Web Engineer");
    expect(castCell("date", "3/26/2025")).toBe("2025-03-26");
  });

  it("lists the cells a number column can't read", () => {
    expect(unreadableNumbers(["5 - Very satisfied", "", "Neutral", "4"])).toEqual(["Neutral"]);
  });
});
