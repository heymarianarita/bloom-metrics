/**
 * How each section of a code adoption (GitHub report) panel is drawn, chosen per report in
 * Settings → Metrics and stored on the report entry (config.reports[].charts).
 * Shared by the server (which passes it through) and the app (which draws it).
 */

export type TrendChart = "line" | "area" | "stacked_bar" | "hidden";
export type TeamsChart = "table" | "stacked_bar" | "both" | "hidden";
export type GreenhouseChart = "table" | "bar" | "hidden";

export interface CodeAdoptionCharts {
  /** "Evolution over time": the four shares per weekly scan. */
  trend: TrendChart;
  /** "Adoption by team": each team's split of UI elements. */
  teams: TeamsChart;
  /** "Greenhouse components": usages per registered component. */
  greenhouse: GreenhouseChart;
}

export const DEFAULT_CODE_ADOPTION_CHARTS: CodeAdoptionCharts = { trend: "line", teams: "table", greenhouse: "table" };

export const TREND_CHART_OPTIONS: { value: TrendChart; label: string }[] = [
  { value: "line", label: "Line chart" },
  { value: "area", label: "Stacked area chart" },
  { value: "stacked_bar", label: "100% stacked bars, one per scan" },
  { value: "hidden", label: "Don't show" },
];

export const TEAMS_CHART_OPTIONS: { value: TeamsChart; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "stacked_bar", label: "100% stacked bar per team" },
  { value: "both", label: "Stacked bars and table" },
  { value: "hidden", label: "Don't show" },
];

export const GREENHOUSE_CHART_OPTIONS: { value: GreenhouseChart; label: string }[] = [
  { value: "table", label: "Table" },
  { value: "bar", label: "Bar chart of usages" },
  { value: "hidden", label: "Don't show" },
];

const pick = <T extends string>(value: unknown, options: { value: T }[], fallback: T): T =>
  options.some((o) => o.value === value) ? (value as T) : fallback;

/** A report's saved chart settings, with defaults for anything missing or unknown. */
export const codeAdoptionChartsOf = (raw: unknown): CodeAdoptionCharts => {
  const saved = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    trend: pick(saved.trend, TREND_CHART_OPTIONS, DEFAULT_CODE_ADOPTION_CHARTS.trend),
    teams: pick(saved.teams, TEAMS_CHART_OPTIONS, DEFAULT_CODE_ADOPTION_CHARTS.teams),
    greenhouse: pick(saved.greenhouse, GREENHOUSE_CHART_OPTIONS, DEFAULT_CODE_ADOPTION_CHARTS.greenhouse),
  };
};

/** The product repo a report is about, from its file name: ".../checkout-web-report.json" → "checkout-web". */
export const reportRepo = (path: string) => (path.split("/").pop() ?? path).replace(/(-report)?\.json$/, "");
