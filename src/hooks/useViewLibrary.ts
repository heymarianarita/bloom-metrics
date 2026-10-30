import * as React from "react";
import { byTabOrder, useManualMetrics } from "@/hooks/useManualMetrics";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { useDataSourceConfigs } from "@/hooks/useDataSources";
import { metricGroupId, useMetricGroups } from "@/hooks/useMetricGroups";
import { CODE_SECTIONS, widgetMetrics, type NewWidget, type ViewItem, type WidgetKind } from "@/hooks/useViewItems";
import { reportRepo } from "../../server/shared/codeAdoptionCharts.ts";

/** What a metric in the library is. */
export type LibraryKind = "number" | "qualitative" | "code" | "figma";

/** Everything a view can show, defined in Metrics → All metrics and Dynamic sources. */
export interface LibraryEntry {
  kind: LibraryKind;
  ref: string;
  section: string;
  title: string;
  /** Group or source it comes from. */
  detail: string;
}

export const KIND_LABELS: Record<LibraryKind, string> = {
  number: "Quantitative",
  qualitative: "Qualitative",
  code: "Code adoption",
  figma: "Figma",
};

export const KIND_BADGE: Record<LibraryKind, "primary" | "dark" | "highlight" | "muted"> = {
  number: "primary",
  qualitative: "highlight",
  code: "dark",
  figma: "muted",
};

export const entryKey = (e: Pick<LibraryEntry, "kind" | "ref" | "section">) => `${e.kind}:${e.ref}:${e.section ?? ""}`;

export const WIDGET_LABELS: Record<WidgetKind, string> = {
  card: "Numbers grid",
  trend: "Trend chart",
  breakdown: "Breakdown",
  distribution: "Score distribution",
  themes: "Qualitative themes",
  code: "Code adoption",
  figma: "Figma",
  text: "Text",
};

/** Whether a widget shows this library entry. */
export const widgetShows = (item: ViewItem, entry: Pick<LibraryEntry, "kind" | "ref" | "section">) => {
  switch (entry.kind) {
    case "number":
      return widgetMetrics(item).includes(entry.ref);
    case "qualitative":
      return item.kind === "themes" && item.ref === entry.ref;
    case "code":
      return item.kind === "code" && item.ref === entry.ref && item.section === entry.section;
    case "figma":
      return item.kind === "figma";
  }
};

/** The section a library entry becomes when it's dropped into a view: a number starts as a card. */
export const defaultWidget = (entry: LibraryEntry): NewWidget =>
  entry.kind === "number"
    ? { kind: "card", ref: entry.ref, options: { metrics: [entry.ref] } }
    : entry.kind === "qualitative"
      ? { kind: "themes", ref: entry.ref }
      : entry.kind === "code"
        ? { kind: "code", ref: entry.ref, section: entry.section }
        : { kind: "figma" };

export const useViewLibrary = () => {
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const configs = useDataSourceConfigs();
  const groups = useMetricGroups();

  const entries = React.useMemo<LibraryEntry[]>(() => {
    const all = groups.data ?? [];
    const groupLabel = (id: string) => {
      const g = all.find((x) => x.id === id);
      const parent = g?.parent_id ? all.find((x) => x.id === g.parent_id) : undefined;
      return g ? (parent ? `${parent.name} › ${g.name}` : g.name) : "No group";
    };
    const config = (key: string) =>
      ((configs.data ?? []).find((c) => c.source_key === key)?.config ?? {}) as Record<string, unknown>;
    const reports = Array.isArray(config("code_adoption").reports)
      ? (config("code_adoption").reports as { path?: string; repository?: string }[])
      : [];
    const figmaLibraries = Array.isArray(config("figma").libraries) ? (config("figma").libraries as unknown[]).length : 0;
    return [
      ...[...(metrics.data ?? [])]
        .filter((m) => !m.archived)
        .sort(byTabOrder)
        .map((m) => ({ kind: "number" as const, ref: m.id, section: "", title: m.name, detail: groupLabel(metricGroupId(all, m)) })),
      ...(qualitative.data ?? []).map((q) => ({
        kind: "qualitative" as const,
        ref: q.id,
        section: "",
        title: q.name,
        detail: `${q.group_name} · “${q.text_column}”`,
      })),
      ...reports
        .filter((r) => r.path)
        .flatMap((r) =>
          CODE_SECTIONS.map((s) => ({
            kind: "code" as const,
            ref: r.path!,
            section: s.value,
            title: `${s.label} · ${reportRepo(r.path!)}`,
            detail: `GitHub report${r.repository ? ` in ${r.repository}` : ""}`,
          })),
        ),
      ...(figmaLibraries > 0
        ? [{
            kind: "figma" as const,
            ref: "",
            section: "",
            title: "Figma component analytics",
            detail: `${figmaLibraries} ${figmaLibraries === 1 ? "library" : "libraries"}, with its own date controls`,
          }]
        : []),
    ];
  }, [metrics.data, qualitative.data, configs.data, groups.data]);

  const byKey = React.useMemo(() => new Map(entries.map((e) => [entryKey(e), e])), [entries]);
  return { entries, find: (e: Pick<LibraryEntry, "kind" | "ref" | "section">) => byKey.get(entryKey(e)), isLoading: metrics.isLoading };
};
