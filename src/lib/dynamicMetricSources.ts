/**
 * Live (dynamic) sources a metric can read from, and the values each one exposes.
 * Keep the field keys stable — they are stored on the metric row.
 */
export interface DynamicMetricField {
  key: string;
  label: string;
  unit?: string;
}

export interface DynamicMetricSource {
  key: string;
  label: string;
  description: string;
  fields: DynamicMetricField[];
}

export const DYNAMIC_METRIC_SOURCES: DynamicMetricSource[] = [
  {
    key: "figma",
    label: "Figma component analytics",
    description: "Design library adoption, refreshed from Figma.",
    fields: [
      { key: "totalInserts", label: "Component inserts" },
      { key: "totalDetaches", label: "Component detaches" },
      { key: "totalUsages", label: "Component usages" },
      { key: "detachRate", label: "Detach rate", unit: "%" },
      { key: "componentCount", label: "Components in library" },
    ],
  },
  {
    key: "survey_sheet",
    label: "Survey sheet",
    description: "Quarterly survey scores read from the shared sheet.",
    fields: [
      { key: "csat", label: "CSAT" },
      { key: "efficiency", label: "Efficiency" },
      { key: "discoverability", label: "Discoverability" },
      { key: "confidence", label: "Confidence" },
      { key: "handoff", label: "Handoff" },
      { key: "zhUmux", label: "Zeroheight UMUX" },
      { key: "sbUmux", label: "Storybook UMUX" },
    ],
  },
  {
    key: "ga4_documentation",
    label: "Google Analytics documentation traffic",
    description: "Documentation site usage for the selected range.",
    fields: [
      { key: "activeUsers", label: "Active users" },
      { key: "newUsers", label: "New users" },
      { key: "sessions", label: "Sessions" },
      { key: "pageViews", label: "Page views" },
      { key: "engagementRate", label: "Engagement rate", unit: "%" },
    ],
  },
];

export const findDynamicSource = (key: string) =>
  DYNAMIC_METRIC_SOURCES.find((source) => source.key === key);

export const findDynamicField = (sourceKey: string, fieldKey: string) =>
  findDynamicSource(sourceKey)?.fields.find((field) => field.key === fieldKey);
