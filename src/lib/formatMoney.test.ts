import { describe, expect, it } from "vitest";
import { formatUsd } from "./formatMoney";

describe("formatUsd", () => {
  it("groups whole dollars and keeps two decimal places", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(12.3)).toBe("$12.30");
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });

  it("keeps four decimal places under one cent", () => {
    expect(formatUsd(0.0042)).toBe("$0.0042");
  });
});
