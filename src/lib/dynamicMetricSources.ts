/**
 * Kinds of live (dynamic) source a metric can read from, and the values each one exposes.
 * A metric stores `source_key` as "<kind>" or "<kind>:<item>", where the item is one thing
 * configured in Settings → Dynamic sources (a Figma library, a GA4 property, a GitHub report).
 * Keep the kind and field keys stable — they are stored on the metric row.
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
    key: "code_adoption",
    label: "Code adoption (GitHub)",
    description: "Bloom usage in a product repo, one value per weekly report.",
    fields: [
      { key: "ds_percent", label: "Bloom elements", unit: "%" },
      { key: "native_percent", label: "Native elements", unit: "%" },
      { key: "tagged_percent", label: "Tagged custom elements", unit: "%" },
      { key: "untagged_percent", label: "Untagged custom elements", unit: "%" },
      { key: "total_files", label: "Files scanned" },
    ],
  },
  {
    key: "ga4_documentation",
    label: "GA4 documentation traffic",
    description: "Documentation site usage for the last 90 days.",
    fields: [
      { key: "activeUsers", label: "Active users" },
      { key: "newUsers", label: "New users" },
      { key: "sessions", label: "Sessions" },
      { key: "pageViews", label: "Page views" },
      { key: "engagementRate", label: "Engagement rate", unit: "%" },
    ],
  },
  {
    // Legacy: no longer configurable in Dynamic sources, kept so older metrics still read.
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
];

/** "figma:AxgxbkHN…" → { kind: "figma", item: "AxgxbkHN…" }; a bare kind has no item. */
export const parseSourceKey = (sourceKey: string) => {
  const index = sourceKey.indexOf(":");
  return index === -1
    ? { kind: sourceKey, item: "" }
    : { kind: sourceKey.slice(0, index), item: sourceKey.slice(index + 1) };
};

export const findDynamicSource = (sourceKey: string) =>
  DYNAMIC_METRIC_SOURCES.find((source) => source.key === parseSourceKey(sourceKey).kind);

export const findDynamicField = (sourceKey: string, fieldKey: string) =>
  findDynamicSource(sourceKey)?.fields.find((field) => field.key === fieldKey);
