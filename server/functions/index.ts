import type { FnHandler } from "./types.ts";
import figmaAnalytics from "./figma-analytics.ts";
import figmaFileName from "./figma-file-name.ts";
import figmaSnapshot from "./figma-snapshot.ts";
import ga4Analytics from "./ga4-analytics.ts";
import getdxTeams from "./getdx-teams.ts";
import jiraGoals from "./jira-goals.ts";
import performanceSheet from "./performance-sheet.ts";
import sheetsAnalytics from "./sheets-analytics.ts";

export const FUNCTIONS: Record<string, FnHandler> = {
  "figma-analytics": figmaAnalytics,
  "figma-file-name": figmaFileName,
  "figma-snapshot": figmaSnapshot,
  "ga4-analytics": ga4Analytics,
  "getdx-teams": getdxTeams,
  "jira-goals": jiraGoals,
  "performance-sheet": performanceSheet,
  "sheets-analytics": sheetsAnalytics,
};
