import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Ga4Totals {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  pageViews: number;
  engagementDurationSeconds: number;
  engagementRate: number;
  avgEngagementPerSession: number;
  /** Newer export fields — absent on older snapshots. */
  totalUsers?: number;
  engagedSessions?: number;
  avgSessionDurationSeconds?: number;
  sessionsPerUser?: number;
}

export interface Ga4TopPage {
  path: string;
  title: string;
  pageViews: number;
  activeUsers: number;
  /** Same page in the previous period — absent on older snapshots. */
  previousPageViews?: number;
  previousActiveUsers?: number;
}

export interface Ga4DailyPoint {
  date: string;
  activeUsers: number;
  totalUsers: number;
  sessions: number;
  engagedSessions: number;
  pageViews: number;
  engagementDurationSeconds: number;
}

export interface Ga4PeriodReport {
  range: { startDate: string; endDate: string };
  previousRange: { startDate: string; endDate: string };
  totals: Ga4Totals;
  previousTotals: Ga4Totals;
  /** Same period one year earlier — absent on older snapshots. */
  yearAgoRange?: { startDate: string; endDate: string };
  yearAgoTotals?: Ga4Totals;
  /** Pages with current and previous views, used for the movers list. */
  pages?: Ga4TopPage[];
}


export interface Ga4Property {
  id: string;
  label: string;
  totals?: Ga4Totals;
  periods?: Record<string, Ga4PeriodReport>;
  daily?: Ga4DailyPoint[];
  topPages?: Ga4TopPage[];
  error?: string;
}

export interface Ga4Response {
  ok: boolean;
  configured: boolean;
  mode?: "live" | "snapshot";
  status?: "snapshot_needed";
  error?: string;
  details?: string;
  source?: string;
  refreshedAt?: string;
  range: { startDate: string; endDate: string };
  properties: Ga4Property[];
}

/** Documentation platforms, each with its own GA4 property. */
export const GA4_DOC_PLATFORMS = [
  { key: "zeroheight", label: "Zeroheight" },
  { key: "storybook", label: "Storybook" },
  { key: "android", label: "Android docs" },
  { key: "ios", label: "iOS docs" },
] as const;

export interface Ga4Range {
  startDate?: string;
  endDate?: string;
}

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export const getDefaultGa4Range = (): Required<Ga4Range> => ({
  startDate: toISODate(daysAgo(90)),
  endDate: toISODate(new Date()),
});

const parseFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "GA4 request failed";
  const maybeContext = error as { context?: Response; message?: string };
  const text = maybeContext.context ? await maybeContext.context.text() : maybeContext.message ?? fallback;

  try {
    const parsed = JSON.parse(text) as { error?: string; details?: string };
    if (parsed.error && parsed.details) return `${parsed.error}: ${parsed.details}`;
    if (parsed.error) return parsed.error;
  } catch {
    /* use plain text fallback */
  }

  return text || fallback;
};

export function useGa4Analytics(
  range: Ga4Range = {},
  properties?: { id: string; label: string }[],
  options?: { enabled?: boolean },
) {
  const defaultRange = getDefaultGa4Range();
  const startDate = range.startDate ?? defaultRange.startDate;
  const endDate = range.endDate ?? defaultRange.endDate;
  return useQuery<Ga4Response>({
    queryKey: ["ga4-analytics", startDate ?? "", endDate ?? "", properties?.map((p) => p.id).join(",") ?? ""],
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ga4-analytics", {
        body: { startDate, endDate, properties },
      });
      if (error) {
        throw new Error(await parseFunctionError(error));
      }
      if ((data as { error?: string; status?: string })?.error && (data as { status?: string })?.status !== "snapshot_needed") {
        const response = data as { error: string; details?: string };
        throw new Error(response.details ? `${response.error}: ${response.details}` : response.error);
      }
      return await withConfiguredLabels(data as Ga4Response);
    },
  });
}

/** Configured property names and order (Settings → Dynamic sources) win over the raw feed. */
async function fetchConfiguredGa4Names(): Promise<{ names: Record<string, string>; order: string[] }> {
  const { data } = await supabase
    .from("data_source_configs")
    .select("config")
    .eq("source_key", "ga4_documentation")
    .maybeSingle();
  const list = ((data?.config as { properties?: { id?: string; name?: string }[] } | null)?.properties ?? []);
  const names: Record<string, string> = {};
  const order: string[] = [];
  list.forEach((p) => {
    if (!p?.id) return;
    order.push(String(p.id));
    if (p.name) names[String(p.id)] = p.name;
  });
  return { names, order };
}

async function withConfiguredLabels(response: Ga4Response): Promise<Ga4Response> {
  if (!response?.properties?.length) return response;
  try {
    const { names, order } = await fetchConfiguredGa4Names();
    const rank = (id: unknown) => {
      const index = order.indexOf(String(id));
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    const properties = response.properties
      .map((p) => ({ ...p, label: names[String(p.id)] || p.label }))
      .sort((a, b) => rank(a.id) - rank(b.id));
    return { ...response, properties };
  } catch {
    return response;
  }
}


/** URL-safe slug for a GA4 property, used for documentation sub-tabs. */
export const ga4PropertySlug = (property: { id?: string; label?: string }) => {
  const id = (property.id ?? "").trim();
  if (id) return id;
  return (property.label ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/** Reads property names from the latest Google Analytics snapshot. */
export async function fetchGa4PropertyLabels(): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke("ga4-analytics", { body: {} });
  if (error) throw new Error(await parseFunctionError(error));
  const response = await withConfiguredLabels(data as Ga4Response);
  const labels: Record<string, string> = {};
  (response?.properties ?? []).forEach((p) => {
    if (p?.id && p.label) labels[String(p.id)] = p.label;
  });
  return labels;
}

/** Looks up one GA4 property name, or null when no data has arrived for it yet. */
export async function fetchGa4PropertyName(propertyId: string): Promise<string | null> {
  const labels = await fetchGa4PropertyLabels();
  return labels[String(propertyId)] ?? null;
}
