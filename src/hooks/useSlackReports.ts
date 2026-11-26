import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReportMetric } from "../../server/slackReports/metrics.ts";

/** A report posted to a Slack channel (Settings → Slack reports): one-off, or every quarter. */
export interface SlackReport {
  id: string;
  /** The message title; the quarter is added after it. */
  name: string;
  channel: string;
  metric_ids: string[];
  include_summary: boolean;
  include_impact: boolean;
  intro: string;
  mode: "once" | "quarterly";
  /** The quarter a one-off report is about. */
  quarter: string | null;
  /** When a one-off report goes out (ISO), if it's scheduled. */
  scheduled_at: string | null;
  sent_at: string | null;
  /** The reviewed summary, for `summary_quarter` only. */
  summary: string | null;
  summary_quarter: string | null;
  summary_by_ai: boolean;
  /** One-off: scheduled. Quarterly: on schedule. */
  enabled: boolean;
  /** Days after the quarter ends (1 = the first day of the next quarter). */
  send_day: number;
  /** Hour of that day, UTC. */
  send_hour: number;
  last_sent_quarter: string | null;
  last_run: { at: string; quarter: string | null; status: "sent" | "failed" | null; message: string } | null;
  next_send: { quarter: string | null; at: string } | null;
}

export type SlackReportInput = Omit<SlackReport, "id" | "sent_at" | "last_sent_quarter" | "last_run" | "next_send"> & { id?: string };

export type SlackReportContent = Pick<SlackReport, "name" | "metric_ids" | "include_impact">;

export interface SlackReportValues {
  quarter: string;
  previousQuarter: string;
  impact: ReportMetric[];
  metrics: ReportMetric[];
}

const KEY = ["slack-reports"];

/** The function's own error message, which the client only gives as a generic one. */
const invoke = async <T>(body?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("slack-reports", body ? { method: "POST", body } : { method: "GET" });
  if (error) {
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
};

export const useSlackReports = () =>
  useQuery({
    queryKey: KEY,
    queryFn: () => invoke<{ slackConnected: boolean; quarters: string[]; reports: SlackReport[] }>(),
  });

/** The metrics' values for the live preview; cheap, so it follows every change. */
export const useSlackReportValues = (content: SlackReportContent, quarter: string, enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, "values", quarter, content.include_impact, content.metric_ids],
    queryFn: () => invoke<SlackReportValues>({ action: "values", content, quarter }),
    enabled: enabled && Boolean(quarter),
    placeholderData: keepPreviousData,
  });

export const useWriteSlackSummary = () =>
  useMutation({
    mutationFn: (input: { content: SlackReportContent; quarter: string }) =>
      invoke<{ summary: string | null; note: string | null }>({ action: "summary", ...input }),
  });

export const useSaveSlackReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (report: SlackReportInput) => invoke<{ report: SlackReport }>({ action: "save", report }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteSlackReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoke({ action: "delete", id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useSendSlackReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; quarter?: string }) => invoke<{ message: string }>({ action: "send", ...input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};
