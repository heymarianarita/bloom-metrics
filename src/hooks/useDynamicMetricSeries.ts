import * as React from "react";
import { useFigmaAnalytics, useFigmaLibraries } from "@/hooks/useFigmaAnalytics";
import { useSheetsAnalytics } from "@/hooks/useSheetsAnalytics";
import { useGa4Analytics } from "@/hooks/useGa4Analytics";
import { useCodeAdoption } from "@/hooks/useCodeAdoption";
import { useDataSourceConfigs } from "@/hooks/useDataSources";
import { DYNAMIC_METRIC_SOURCES, parseSourceKey, type DynamicMetricField } from "@/lib/dynamicMetricSources";

export interface MetricPoint {
  period: string;
  value: number;
  rows: number;
}

export interface DynamicSeries {
  points: MetricPoint[];
  configured: boolean;
  isLoading: boolean;
  error?: string;
}

/** Live values without a date of their own are read "as of today" (YYYY-MM-DD). */
const today = () => new Date().toISOString().slice(0, 10);

/** A report file path as the server names its repo: "path/to/checkout-web-report.json" → "checkout-web". */
const repoOf = (path: string) => (path.split("/").pop() ?? path).replace(/(-report)?\.json$/, "");

export interface DynamicSourceOption {
  /** Stored on the metric as `source_key`. */
  value: string;
  label: string;
  fields: DynamicMetricField[];
}

const fieldsOf = (kind: string) => DYNAMIC_METRIC_SOURCES.find((s) => s.key === kind)?.fields ?? [];

/**
 * What a metric can read live: one option per library, property or report configured in
 * Settings → Dynamic sources, so the list always matches what's set up there.
 */
export const useDynamicSourceOptions = () => {
  const configs = useDataSourceConfigs();
  const libraries = useFigmaLibraries();

  const options = React.useMemo<DynamicSourceOption[]>(() => {
    const config = (key: string) =>
      ((configs.data ?? []).find((c) => c.source_key === key)?.config ?? {}) as Record<string, unknown>;

    const figma = (libraries.data ?? []).map((library) => ({
      value: `figma:${library.key}`,
      label: `Figma · ${library.name}`,
      fields: fieldsOf("figma"),
    }));

    const reports = Array.isArray(config("code_adoption").reports)
      ? (config("code_adoption").reports as { path?: string }[])
      : [];
    const code = [...new Set(reports.filter((r) => r.path).map((r) => repoOf(r.path!)))].map((repo) => ({
      value: `code_adoption:${repo}`,
      label: `Code adoption · ${repo}`,
      fields: fieldsOf("code_adoption"),
    }));

    const properties = Array.isArray(config("ga4_documentation").properties)
      ? (config("ga4_documentation").properties as { id?: string; name?: string }[]).filter((p) => p.id)
      : [];
    const ga4 = properties.map((p) => ({
      value: `ga4_documentation:${p.id}`,
      label: `Google Analytics · ${p.name || p.id}`,
      fields: fieldsOf("ga4_documentation"),
    }));
    if (properties.length > 1) {
      ga4.unshift({
        value: "ga4_documentation",
        label: "Google Analytics · All properties",
        fields: fieldsOf("ga4_documentation"),
      });
    }

    return [...figma, ...code, ...ga4];
  }, [configs.data, libraries.data]);

  return { options, isLoading: configs.isLoading || libraries.isLoading };
};

/** Human name of a stored source key, e.g. "Figma · Bloom Design System Library". */
export const useDynamicSourceLabel = (sourceKey: string) => {
  const { options } = useDynamicSourceOptions();
  const { kind } = parseSourceKey(sourceKey);
  return (
    options.find((o) => o.value === sourceKey)?.label ??
    DYNAMIC_METRIC_SOURCES.find((s) => s.key === kind)?.label ??
    "the connected source"
  );
};

/** Reads one value out of a connected live source and turns it into periods + values. */
export const useDynamicMetricSeries = (sourceKey?: string, fieldKey?: string): DynamicSeries => {
  const { kind, item } = parseSourceKey(sourceKey ?? "");
  const libraries = useFigmaLibraries();
  // Older metrics stored plain "figma": read the first library, as they always did.
  const figmaKey = kind === "figma" ? item || libraries.data?.[0]?.key || "" : "";
  const figma = useFigmaAnalytics(figmaKey);
  const sheets = useSheetsAnalytics();
  const ga4 = useGa4Analytics({}, undefined, { enabled: kind === "ga4_documentation" });
  const code = useCodeAdoption();

  return React.useMemo<DynamicSeries>(() => {
    if (!kind || !fieldKey) {
      return { points: [], configured: false, isLoading: false };
    }

    if (kind === "figma") {
      const data = figma.data;
      const summary = data?.summary as Record<string, number | null> | undefined;
      const value = summary?.[fieldKey];
      const period = data?.range?.endDate ?? today();
      return {
        points: value === null || value === undefined ? [] : [{ period, value: Number(value), rows: 1 }],
        configured: data?.configured !== false,
        isLoading: figma.isLoading || libraries.isLoading,
        error: figma.error ? String(figma.error) : undefined,
      };
    }

    if (kind === "code_adoption") {
      const repo = (code.data?.repos ?? []).find((r) => r.repo === item);
      // One point per weekly report.
      const points = (repo?.snapshots ?? [])
        .map((snapshot) => {
          const value = (snapshot as unknown as Record<string, number | null>)[fieldKey];
          return value === null || value === undefined
            ? null
            : { period: snapshot.generated_at.slice(0, 10), value: Number(value), rows: 1 };
        })
        .filter(Boolean) as MetricPoint[];
      return {
        points,
        configured: code.data?.configured !== false,
        isLoading: code.isLoading,
        error: code.error ? String(code.error) : undefined,
      };
    }

    if (kind === "survey_sheet") {
      const data = sheets.data;
      const points = Object.entries(data?.survey ?? {})
        .map(([period, quarter]) => {
          const value = (quarter.all as Record<string, number | undefined>)[fieldKey];
          return value === undefined ? null : { period, value: Number(value), rows: 1 };
        })
        .filter(Boolean) as MetricPoint[];
      return {
        points,
        configured: data?.configured !== false,
        isLoading: sheets.isLoading,
        error: sheets.error ? String(sheets.error) : undefined,
      };
    }

    if (kind === "ga4_documentation") {
      const data = ga4.data;
      const period = data?.range?.endDate ?? today();
      // One property, or all of them added up when the metric isn't tied to one.
      const properties = (data?.properties ?? []).filter((p) => !item || String(p.id) === item);
      const total = properties.reduce((sum, property) => {
        const totals = property.totals as unknown as Record<string, number> | undefined;
        return sum + (totals?.[fieldKey] ?? 0);
      }, 0);
      return {
        points: properties.length ? [{ period, value: total, rows: properties.length }] : [],
        configured: data?.configured !== false,
        isLoading: ga4.isLoading,
        error: ga4.error ? String(ga4.error) : undefined,
      };
    }

    return { points: [], configured: false, isLoading: false };
  }, [kind, item, fieldKey, figma.data, figma.isLoading, figma.error, libraries.isLoading, code.data, code.isLoading, code.error, sheets.data, sheets.isLoading, sheets.error, ga4.data, ga4.isLoading, ga4.error]);
};
