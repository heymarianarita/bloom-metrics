import { describe, expect, it } from "vitest";
import { dueQuarter, finishedQuarters, nextSend, onceStatus, reportQuarters, sendTimeFor, utcLabel } from "../../server/slackReports/schedule.ts";
import { buildMessage, describeChange, metricLine, metricSections, toSlackMrkdwn } from "../../server/slackReports/message.ts";
import type { ReportMetric } from "../../server/slackReports/metrics.ts";

const HOUR = 3_600_000;
const report = { enabled: true, send_day: 3, send_hour: 9, last_sent_quarter: null, createdAt: Date.UTC(2026, 5, 1) };

describe("slack report schedule", () => {
  it("sends a quarter's report the chosen day after it ends", () => {
    expect(utcLabel(sendTimeFor("2026-Q4", 3, 9))).toBe("2027-01-03 09:00 UTC");
    expect(utcLabel(sendTimeFor("2026-Q3", 1, 0))).toBe("2026-10-01 00:00 UTC");
  });

  it("lists finished quarters, newest first", () => {
    expect(finishedQuarters(3, Date.UTC(2026, 10, 26))).toEqual(["2026-Q3", "2026-Q2", "2026-Q1"]);
  });

  it("is due from its time until the catch-up window closes, once", () => {
    const at = Date.UTC(2026, 9, 3, 9);
    expect(dueQuarter(report, at - HOUR)).toBeNull();
    expect(dueQuarter(report, at)).toBe("2026-Q3");
    expect(dueQuarter(report, at + 47 * HOUR)).toBe("2026-Q3");
    expect(dueQuarter(report, at + 49 * HOUR)).toBeNull();
    expect(dueQuarter({ ...report, last_sent_quarter: "2026-Q3" }, at)).toBeNull();
    expect(dueQuarter({ ...report, enabled: false }, at)).toBeNull();
  });

  it("never sends a quarter that was due before the report was set up", () => {
    const at = Date.UTC(2026, 9, 3, 9);
    expect(dueQuarter({ ...report, createdAt: at + HOUR }, at + 2 * HOUR)).toBeNull();
    expect(nextSend({ ...report, createdAt: at + HOUR }, at + 2 * HOUR)).toEqual({
      quarter: "2026-Q4",
      at: Date.UTC(2027, 0, 3, 9),
    });
  });

  it("shows the pending quarter until it's sent, then the next one", () => {
    const now = Date.UTC(2026, 9, 2);
    expect(nextSend(report, now)).toEqual({ quarter: "2026-Q3", at: Date.UTC(2026, 9, 3, 9) });
    expect(nextSend({ ...report, last_sent_quarter: "2026-Q3" }, now)?.quarter).toBe("2026-Q4");
    expect(nextSend({ ...report, enabled: false }, now)).toBeNull();
  });
});

const metric = (patch: Partial<ReportMetric>): ReportMetric => ({
  id: "m1",
  name: "CSAT",
  unit: "",
  direction: "up",
  value: 4.2,
  previous: 3.9,
  rows: 120,
  ...patch,
});

describe("one-off slack reports", () => {
  it("can be about the quarter in progress or the finished ones", () => {
    expect(reportQuarters(2, Date.UTC(2026, 10, 26))).toEqual(["2026-Q4", "2026-Q3", "2026-Q2"]);
  });

  it("goes out at its time, once, and says when the time was missed", () => {
    const at = Date.UTC(2026, 11, 20, 9);
    const scheduled = { enabled: true, scheduledAt: at, sentAt: null };
    expect(onceStatus(scheduled, at - 1)).toBeNull();
    expect(onceStatus(scheduled, at + HOUR)).toBe("due");
    expect(onceStatus(scheduled, at + 3 * 24 * HOUR)).toBe("missed");
    expect(onceStatus({ ...scheduled, sentAt: at }, at + HOUR)).toBeNull();
    expect(onceStatus({ ...scheduled, enabled: false }, at + HOUR)).toBeNull();
  });
});

describe("slack report message", () => {
  it("describes changes in words, with which way is good", () => {
    expect(describeChange(metric({}), "2026-Q2")).toBe("Up 0.3 from 3.9 in 2026-Q2 (better)");
    expect(describeChange(metric({ direction: "down", unit: "%", value: 8, previous: 9.5 }), "2026-Q2")).toBe(
      "Down 1.5 from 9.5% in 2026-Q2 (better)",
    );
    expect(describeChange(metric({ direction: "none", value: 1200, previous: 1000 }), "2026-Q2")).toBe(
      "Up 200 from 1,000 in 2026-Q2",
    );
    expect(describeChange(metric({ previous: null }), "2026-Q2")).toBe("No data for 2026-Q2 to compare");
    expect(describeChange(metric({ previous: 4.2 }), "2026-Q2")).toBe("Same as 2026-Q2");
  });

  it("puts each metric on one line, with a dot for better or worse and an arrow for the way it moved", () => {
    expect(metricLine(metric({}), "2026-Q3", "2026-Q2")).toBe("🟢 *CSAT*: 4.2 (↑ 0.3 from 3.9)");
    expect(metricLine(metric({ direction: "down", unit: "%", value: 9.5, previous: 8 }), "2026-Q3", "2026-Q2")).toBe(
      "🔴 *CSAT*: 9.5% (↑ 1.5 from 8%)",
    );
    expect(metricLine(metric({ direction: "none", value: 900, previous: 1000 }), "2026-Q3", "2026-Q2")).toBe(
      "⚪ *CSAT*: 900 (↓ 100 from 1,000)",
    );
    expect(metricLine(metric({ previous: 4.2 }), "2026-Q3", "2026-Q2")).toBe("⚪ *CSAT*: 4.2 (same as 2026-Q2)");
    expect(metricLine(metric({ previous: null }), "2026-Q3", "2026-Q2")).toBe("⚪ *CSAT*: 4.2 (no 2026-Q2 data to compare)");
  });

  it("escapes names and says when a quarter has no data", () => {
    expect(metricLine(metric({ name: "Docs <beta> & co", value: null }), "2026-Q3", "2026-Q2")).toBe(
      "⚪ *Docs &lt;beta&gt; &amp; co*: no data for 2026-Q3",
    );
  });

  it("splits metric lines into sections under the length limit", () => {
    expect(metricSections(["aaaa", "bbbb", "cccc"], 9)).toEqual(["aaaa\nbbbb", "cccc"]);
  });

  it("turns Markdown from the model into Slack formatting", () => {
    expect(toSlackMrkdwn("## Summary\n- **CSAT** rose\n* Detach rate fell")).toBe("Summary\n• *CSAT* rose\n• Detach rate fell");
  });

  it("lists metrics in one section with a legend, and ends with a link button", () => {
    const metrics = Array.from({ length: 12 }, (_, i) => metric({ id: `m${i}`, name: `Metric ${i}` }));
    const { text, blocks } = buildMessage({
      name: "Bloom quarterly",
      quarter: "2026-Q3",
      previousQuarter: "2026-Q2",
      intro: "",
      metrics,
      summary: "• All good",
      appUrl: "https://metrics.example",
    });
    expect(text).toBe("Bloom quarterly: 2026-Q3");
    expect(blocks.map((b) => b.type)).toEqual(["header", "section", "context", "divider", "section", "context", "actions"]);
    expect(JSON.stringify(blocks[4]).match(/Metric \d+/g)).toHaveLength(12);
    expect(blocks.at(-1)).toMatchObject({ elements: [{ type: "button", url: "https://metrics.example/metrics/impact" }] });
  });

  it("puts the Impact section first, under its own heading", () => {
    const { blocks } = buildMessage({
      name: "Bloom quarterly",
      quarter: "2026-Q3",
      previousQuarter: "2026-Q2",
      intro: "",
      impact: [metric({ id: "i1", name: "Confidence" })],
      metrics: [metric({ id: "m1", name: "Detach rate" })],
      summary: null,
      appUrl: "https://x",
    });
    const texts = blocks.filter((b) => b.type === "section").map((b) => (b as { text: { text: string } }).text.text);
    expect(texts).toEqual(["*Impact*\n🟢 *Confidence*: 4.2 (↑ 0.3 from 3.9)", "*Other metrics*\n🟢 *Detach rate*: 4.2 (↑ 0.3 from 3.9)"]);
  });

  it("only credits AI for a summary it wrote, and leaves out an empty one", () => {
    const base = { name: "Bloom quarterly", quarter: "2026-Q3", previousQuarter: "2026-Q2", intro: "", metrics: [], appUrl: "https://x" };
    const typed = buildMessage({ ...base, summary: "Written by hand", summaryByAi: false });
    expect(typed.text).toBe("Bloom quarterly: 2026-Q3");
    expect(JSON.stringify(typed.blocks)).not.toContain("Summary written by AI");
    expect(JSON.stringify(buildMessage({ ...base, summary: "From the model" }).blocks)).toContain("Summary written by AI");
    expect(buildMessage({ ...base, summary: "  " }).blocks.filter((b) => b.type === "section")).toHaveLength(0);
  });
});
