import { describe, expect, it } from "vitest";
import { framesToTable, mergeRows, parseGrafanaInput, type Frame } from "../../server/shared/grafana.ts";

const esQuery = {
  refId: "A",
  datasource: { type: "elasticsearch", uid: "es-logs" },
  query: "service:scanner AND type:run",
  metrics: [{ id: "1", type: "raw_data", settings: { size: "500" } }],
  bucketAggs: [],
  timeField: "@timestamp",
};

describe("parseGrafanaInput", () => {
  it("reads the query from an Explore address", () => {
    const panes = { x1: { datasource: "es-logs", queries: [esQuery], range: { from: "now-1h", to: "now" } } };
    const url = `https://grafana.example.com/explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(panes))}&orgId=1`;
    const parsed = parseGrafanaInput(url);
    expect(parsed).toEqual({
      url: "https://grafana.example.com",
      query: { datasource: esQuery.datasource, query: esQuery.query, metrics: esQuery.metrics, bucketAggs: [], timeField: "@timestamp" },
    });
  });

  it("uses the pane's data source when the query has none, and reads old addresses", () => {
    const { datasource: _ds, ...noSource } = esQuery;
    const left = ["now-6h", "now", "es-logs", noSource];
    const parsed = parseGrafanaInput(`https://g.example.com/explore?left=${encodeURIComponent(JSON.stringify(left))}`);
    expect("query" in parsed && parsed.query.datasource).toEqual({ uid: "es-logs" });
  });

  it("reads the query inspector's request JSON", () => {
    const parsed = parseGrafanaInput(JSON.stringify({ from: "1", to: "2", queries: [esQuery] }));
    expect("query" in parsed && parsed.url).toBeNull();
    expect("query" in parsed && parsed.query.query).toBe(esQuery.query);
  });

  it("explains why a short link can't be used", () => {
    expect(parseGrafanaInput("https://grafana.example.com/goto/abc123?orgId=1")).toEqual({
      error: expect.stringContaining("Short links"),
    });
  });
});

describe("framesToTable", () => {
  it("turns a raw documents frame into one row per document, with days for times", () => {
    const frame: Frame = {
      schema: {
        fields: [
          { name: "@timestamp", type: "time" },
          { name: "run_id", type: "string" },
          { name: "swiftui_usages", type: "number" },
          { name: "generated_at", type: "string" },
          { name: "_id", type: "string" },
        ],
      },
      data: {
        values: [
          [Date.UTC(2026, 10, 24, 23, 10), Date.UTC(2026, 10, 25, 23, 5)],
          ["101", "102"],
          [1800, 1812],
          ["2026-11-24T23:10:00Z", "2026-11-25T23:05:00Z"],
          ["a1", "a2"],
        ],
      },
    };
    const { columns, rows } = framesToTable([frame]);
    expect(columns).toEqual([
      { key: "timestamp", label: "@timestamp", kind: "date" },
      { key: "run_id", label: "run_id", kind: "text" },
      { key: "swiftui_usages", label: "swiftui_usages", kind: "number" },
      { key: "generated_at", label: "generated_at", kind: "text" },
    ]);
    expect(rows[1]).toEqual({ timestamp: "2026-11-25", run_id: "102", swiftui_usages: 1812, generated_at: "2026-11-25T23:05:00Z" });
  });

  it("names Elasticsearch series without labels by their frame", () => {
    const frame = (name: string, value: number): Frame => ({
      schema: { name, meta: { type: "timeseries-multi" }, fields: [{ name: "Time", type: "time" }, { name: "Value", type: "number" }] },
      data: { values: [[Date.UTC(2026, 10, 25)], [value]] },
    });
    expect(framesToTable([frame("team-a", 459), frame("team-b", 12)]).rows).toEqual([
      { series: "team-a", time: "2026-11-25", value: 459 },
      { series: "team-b", time: "2026-11-25", value: 12 },
    ]);
  });

  it("joins time series on time and labels, one column per value", () => {
    const day = Date.UTC(2026, 10, 25);
    const series = (team: string, name: string, value: number): Frame => ({
      schema: { fields: [{ name: "Time", type: "time" }, { name, type: "number", labels: { team_name: team } }] },
      data: { values: [[day], [value]] },
    });
    const { columns, rows } = framesToTable([
      series("checkout", "bloom", 40),
      series("checkout", "native", 10),
      series("search", "bloom", 7),
    ]);
    expect(columns.map((c) => `${c.key}:${c.kind}`)).toEqual(["time:date", "team_name:text", "bloom:number", "native:number"]);
    expect(rows).toEqual([
      { time: "2026-11-25", team_name: "checkout", bloom: 40, native: 10 },
      { time: "2026-11-25", team_name: "search", bloom: 7 },
    ]);
  });
});

describe("mergeRows", () => {
  const stored = [
    { day: "2026-08-01", n: 1 },
    { day: "2026-08-28", n: 2 },
    { day: "2026-11-25", n: 3 },
  ];

  it("keeps days Grafana no longer has and replaces the days it fetched", () => {
    const fetched = [
      { day: "2026-08-28", n: 99 },
      { day: "2026-11-25", n: 30 },
      { day: "2026-11-26", n: 40 },
    ];
    const out = mergeRows(stored, fetched, { dateColumn: "day", firstDay: "2026-08-28", today: "2026-11-26" });
    expect(out.rows).toEqual([
      { day: "2026-08-01", n: 1 },
      { day: "2026-08-28", n: 2 },
      { day: "2026-11-25", n: 30 },
      { day: "2026-11-26", n: 40 },
    ]);
    expect(out.added).toBe(2);
  });

  it("saves undated results as one snapshot per day", () => {
    const first = mergeRows([], [{ team: "a", n: 1 }], { dateColumn: null, firstDay: "2026-08-28", today: "2026-11-25" });
    const again = mergeRows(first.rows, [{ team: "a", n: 2 }], { dateColumn: null, firstDay: "2026-08-28", today: "2026-11-25" });
    const next = mergeRows(again.rows, [{ team: "a", n: 3 }], { dateColumn: null, firstDay: "2026-08-29", today: "2026-11-26" });
    expect(next.rows).toEqual([
      { team: "a", n: 2, synced: "2026-11-25" },
      { team: "a", n: 3, synced: "2026-11-26" },
    ]);
  });
});
