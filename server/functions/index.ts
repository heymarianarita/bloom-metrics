import type { FnHandler } from "./types.ts";
import aiUsage from "./ai-usage.ts";
import codeAdoption from "./code-adoption.ts";
import figmaAnalytics from "./figma-analytics.ts";
import figmaFileName from "./figma-file-name.ts";
import figmaSnapshot from "./figma-snapshot.ts";
import ga4Analytics from "./ga4-analytics.ts";
import getdxStudies from "./getdx-studies.ts";
import getdxTeams from "./getdx-teams.ts";
import grafana from "./grafana.ts";
import jiraGoals from "./jira-goals.ts";
import metricDescription from "./metric-description.ts";
import performanceSheet from "./performance-sheet.ts";
import qualitative from "./qualitative.ts";
import sheetsAnalytics from "./sheets-analytics.ts";

export const FUNCTIONS: Record<string, FnHandler> = {
  "ai-usage": aiUsage,
  "code-adoption": codeAdoption,
  "figma-analytics": figmaAnalytics,
  "figma-file-name": figmaFileName,
  "figma-snapshot": figmaSnapshot,
  "ga4-analytics": ga4Analytics,
  "getdx-studies": getdxStudies,
  "getdx-teams": getdxTeams,
  grafana,
  "jira-goals": jiraGoals,
  "metric-description": metricDescription,
  "performance-sheet": performanceSheet,
  qualitative,
  "sheets-analytics": sheetsAnalytics,
};
