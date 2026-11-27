import { supabase } from "@/integrations/supabase/client";

/**
 * A one-sentence description written by AI from a metric's settings, for when it's saved
 * without one. Resolves to "" when it can't be written (no AI key, request failed), so saving
 * goes ahead either way.
 */
export async function writeMetricDescription(
  kind: "quantitative" | "qualitative",
  details: Record<string, string | undefined>,
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("metric-description", { body: { kind, details } });
    const body = data as { ok?: boolean; description?: string } | null;
    return !error && body?.ok ? (body.description ?? "").trim() : "";
  } catch {
    return "";
  }
}
