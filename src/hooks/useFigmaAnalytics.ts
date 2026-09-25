import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FigmaComponentRow {
  key: string;
  name: string;
  page: string;
  documented: boolean;
  updatedAt: string | null;
  inserts: number | null;
  detaches: number | null;
  usages: number | null;
  teamsUsing: number | null;
  /** Number of variants rolled up into this component (1 for standalone). */
  variantCount?: number;
}

export interface FigmaStyleRow {
  key: string;
  name: string;
  type: string;
  documented: boolean;
}

export interface FigmaPageRow {
  name: string;
  componentCount: number;
}

export interface FigmaAnalyticsResponse {
  configured?: boolean;
  error?: string;
  details?: string;
  file: { key: string; name: string; lastModified: string | null; version: string | null };
  range: { startDate: string | null; endDate: string | null };
  pages: FigmaPageRow[];
  summary: {
    componentCount: number;
    styleCount: number;
    documentedCount: number;
    documentationCoverage: number;
    totalInserts: number | null;
    totalDetaches: number | null;
    totalUsages: number | null;
    detachRate: number | null;
  };
  analyticsAvailable: boolean;
  analyticsNote: string | null;
  components: FigmaComponentRow[];
  styles: FigmaStyleRow[];
}

export const FIGMA_FILE_KEY_STORAGE = "bloom-metrics.figma-file-key";
export const FIGMA_EXCLUDED_PAGES_STORAGE = "bloom-metrics.figma-excluded-pages";

export interface FigmaLibrary {
  key: string;
  name: string;
  /** Library pages left out of adoption figures, managed in Settings. */
  excludedPages?: string[];
}

/** Fallback libraries used before any are configured in Settings. */
export const FIGMA_LIBRARIES: FigmaLibrary[] = [
  { key: "AxgxbkHNzhVbyMBdB1wMuM", name: "Bloom Design System Library" },
  { key: "aqKiVM9OcIQEDDaOliQLar", name: "Marketplace Kit" },
  { key: "16F5fJBPOVvV3cKsoFgCXb", name: "Vinted Go Kit" },
];

/** Default Bloom design system library file. */
export const DEFAULT_FIGMA_FILE_KEY = FIGMA_LIBRARIES[0].key;

/** Libraries configured in Settings → Dynamic sources, with the fallback list as default. */
export function useFigmaLibraries() {
  return useQuery<FigmaLibrary[]>({
    queryKey: ["figma-libraries"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_source_configs")
        .select("config")
        .eq("source_key", "figma")
        .maybeSingle();
      if (error) throw new Error(error.message);
      const raw = (
        data?.config as {
          libraries?: { fileKey?: string; name?: string; excludedPages?: string[] }[];
        } | null
      )?.libraries;
      const libraries = (raw ?? [])
        .filter((l) => typeof l?.fileKey === "string" && l.fileKey.length > 0)
        .map((l) => ({
          key: l.fileKey as string,
          name: l.name || (l.fileKey as string),
          excludedPages: Array.isArray(l.excludedPages) ? l.excludedPages : [],
        }));
      return libraries.length ? libraries : FIGMA_LIBRARIES;
    },
  });
}

/** Asks the backend for a library's real Figma file name. */
export async function fetchFigmaFileName(fileKey: string) {
  const { data, error } = await supabase.functions.invoke("figma-file-name", {
    body: { fileKey },
  });
  if (error) throw new Error(error.message);
  const payload = data as { name?: string; error?: string; details?: string };
  if (payload?.error) throw new Error([payload.error, payload.details].filter(Boolean).join(": "));
  return payload?.name ?? fileKey;
}

export function getStoredFigmaFileKey() {
  try {
    const stored = localStorage.getItem(FIGMA_FILE_KEY_STORAGE);
    return stored && stored.length > 0 ? stored : DEFAULT_FIGMA_FILE_KEY;
  } catch {
    return DEFAULT_FIGMA_FILE_KEY;
  }
}


export function setStoredFigmaFileKey(key: string) {
  try {
    localStorage.setItem(FIGMA_FILE_KEY_STORAGE, key);
  } catch {
    /* ignore */
  }
}

export function getStoredExcludedPages(fileKey: string): string[] {
  try {
    const raw = localStorage.getItem(`${FIGMA_EXCLUDED_PAGES_STORAGE}:${fileKey}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setStoredExcludedPages(fileKey: string, pages: string[]) {
  try {
    localStorage.setItem(
      `${FIGMA_EXCLUDED_PAGES_STORAGE}:${fileKey}`,
      JSON.stringify(pages),
    );
  } catch {
    /* ignore */
  }
}

export interface FigmaAnalyticsRange {
  startDate?: string;
  endDate?: string;
}

/** Last Figma response is kept on this device so repeat visits show instantly while fresh data loads. */
const cacheKey = (fileKey: string, start?: string, end?: string) =>
  `figma-analytics:v1:${fileKey}:${start ?? ""}:${end ?? ""}`;

const readCache = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const { savedAt, data } = JSON.parse(raw) as { savedAt: number; data: FigmaAnalyticsResponse };
    return { savedAt, data };
  } catch {
    return undefined;
  }
};

const writeCache = (key: string, data: FigmaAnalyticsResponse) => {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Storage full — drop older Figma entries and try once more.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("figma-analytics:") && k !== key)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {
      /* too large to keep; skip */
    }
  }
};

export function useFigmaAnalytics(fileKey: string, range: FigmaAnalyticsRange = {}) {
  const { startDate, endDate } = range;
  const key = cacheKey(fileKey, startDate, endDate);
  const cached = fileKey ? readCache(key) : undefined;
  return useQuery<FigmaAnalyticsResponse>({
    queryKey: ["figma-analytics", fileKey, startDate ?? "", endDate ?? ""],
    enabled: Boolean(fileKey),
    staleTime: 5 * 60 * 1000,
    initialData: cached?.data,
    // Treat saved data as stale so it refreshes in the background.
    initialDataUpdatedAt: cached ? 0 : undefined,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("figma-analytics", {
        body: { fileKey, startDate, endDate },
      });
      if (error) throw new Error(error.message);
      const payload = data as { configured?: boolean; error?: string; details?: string };
      // Not configured is a normal setup state, not a failure — the page shows guidance.
      if (payload?.configured === false) {
        return data as FigmaAnalyticsResponse;
      }
      if (payload?.error) {
        throw new Error(payload.error);
      }
      writeCache(key, data as FigmaAnalyticsResponse);
      return data as FigmaAnalyticsResponse;
    },
  });
}
