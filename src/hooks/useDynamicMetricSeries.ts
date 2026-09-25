import * as React from "react";
import { useFigmaAnalytics, useFigmaLibraries } from "@/hooks/useFigmaAnalytics";
import { useSheetsAnalytics } from "@/hooks/useSheetsAnalytics";
import { useGa4Analytics } from "@/hooks/useGa4Analytics";

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

/** Reads one value out of a connected live source and turns it into periods + values. */
export const useDynamicMetricSeries = (sourceKey?: string, fieldKey?: string): DynamicSeries => {
  const libraries = useFigmaLibraries();
  const figmaKey = libraries.data?.[0]?.key ?? "";
  const figma = useFigmaAnalytics(sourceKey === "figma" ? figmaKey : "");
  const sheets = useSheetsAnalytics();
  const ga4 = useGa4Analytics();

  return React.useMemo<DynamicSeries>(() => {
    if (!sourceKey || !fieldKey) {
      return { points: [], configured: false, isLoading: false };
    }

    if (sourceKey === "figma") {
      const data = figma.data;
      const summary = data?.summary as Record<string, number | null> | undefined;
      const value = summary?.[fieldKey];
      const period = data?.range?.endDate ?? "Latest";
      return {
        points: value === null || value === undefined ? [] : [{ period, value: Number(value), rows: 1 }],
        configured: data?.configured !== false,
        isLoading: figma.isLoading || libraries.isLoading,
        error: figma.error ? String(figma.error) : undefined,
      };
    }

    if (sourceKey === "survey_sheet") {
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

    if (sourceKey === "ga4_documentation") {
      const data = ga4.data;
      const period = data?.range?.endDate ?? "Latest";
      const total = (data?.properties ?? []).reduce((sum, property) => {
        const totals = property.totals as unknown as Record<string, number> | undefined;
        return sum + (totals?.[fieldKey] ?? 0);
      }, 0);
      return {
        points: (data?.properties ?? []).length ? [{ period, value: total, rows: data?.properties.length ?? 0 }] : [],
        configured: data?.configured !== false,
        isLoading: ga4.isLoading,
        error: ga4.error ? String(ga4.error) : undefined,
      };
    }

    return { points: [], configured: false, isLoading: false };
  }, [sourceKey, fieldKey, figma.data, figma.isLoading, figma.error, libraries.isLoading, sheets.data, sheets.isLoading, sheets.error, ga4.data, ga4.isLoading, ga4.error]);
};
