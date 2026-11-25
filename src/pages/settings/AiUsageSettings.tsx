import { useQuery } from "@tanstack/react-query";
import { Sparkle } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/formatDate";
import { formatUsd } from "@/lib/formatMoney";

interface FeatureRow {
  feature: string;
  label: string;
  description: string;
  calls: number;
  costUsd: number;
  monthCostUsd: number;
  lastAt: string | null;
}

interface RecentRow {
  id: string;
  label: string;
  detail: string;
  model: string;
  costUsd: number;
  createdAt: string;
}

interface AiUsage {
  ok: true;
  monthStart: string;
  totalCostUsd: number;
  monthCostUsd: number;
  calls: number;
  features: FeatureRow[];
  recent: RecentRow[];
}

const loadUsage = async (): Promise<AiUsage> => {
  const { data, error } = await supabase.functions.invoke("ai-usage");
  const body = data as (Partial<AiUsage> & { error?: string }) | null;
  if (error || !body?.ok || !body.features || !body.monthStart) {
    throw new Error(body?.error || "Couldn't load AI usage.");
  }
  return body as AiUsage;
};

const featureColumns: DataTableColumn<FeatureRow>[] = [
  {
    key: "label",
    header: "Feature",
    width: "2fr",
    cellTooltip: false,
    render: (row) => (
      <div className="py-1">
        <p className="text-sm font-medium text-foreground">{row.label}</p>
        {row.description ? <p className="text-xs text-muted-foreground">{row.description}</p> : null}
      </div>
    ),
  },
  {
    key: "calls",
    header: "Calls",
    width: "100px",
    render: (row) => row.calls.toLocaleString("en-GB"),
  },
  { key: "costUsd", header: "All time", width: "120px", render: (row) => formatUsd(row.costUsd) },
  { key: "monthCostUsd", header: "This month", width: "120px", render: (row) => formatUsd(row.monthCostUsd) },
  {
    key: "lastAt",
    header: "Last used",
    width: "180px",
    render: (row) => (row.lastAt ? formatDateTime(row.lastAt) : "—"),
  },
];

const recentColumns: DataTableColumn<RecentRow>[] = [
  { key: "createdAt", header: "When", width: "180px", render: (row) => formatDateTime(row.createdAt) },
  { key: "label", header: "Feature", width: "1fr" },
  { key: "detail", header: "Detail", width: "1.5fr", render: (row) => row.detail || "—" },
  { key: "model", header: "Model", width: "140px" },
  { key: "costUsd", header: "Cost", width: "120px", render: (row) => formatUsd(row.costUsd) },
];

const AiUsage = () => {
  const usage = useQuery({ queryKey: ["ai-usage"], queryFn: loadUsage });
  const data = usage.data;

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="AI usage"
          subtitle="What each AI feature has spent, at Anthropic's public token rates. This is not the invoice. The chat and metric descriptions are counted from now on. Earlier qualitative runs are included as one total for themes, tagging and summaries."
        />
        <DesignSpacer size="medium" />

        {usage.isLoading ? (
          <DesignLoader />
        ) : usage.isError || !data ? (
          <DesignEmptyState
            title="Couldn't load AI usage"
            body={usage.error instanceof Error ? usage.error.message : "Try again in a moment."}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DesignStatCard label="All time" value={formatUsd(data.totalCostUsd)} />
              <DesignStatCard label="This month" value={formatUsd(data.monthCostUsd)} note={`Since ${data.monthStart}`} />
              <DesignStatCard label="Calls" value={data.calls.toLocaleString("en-GB")} />
            </div>

            <DesignSpacer size="medium" />
            <DesignCard className="p-4">
              <h2 className="text-lg font-semibold text-foreground">By feature</h2>
              <DesignSpacer size="small" />
              <DesignDataTable
                columns={featureColumns}
                data={data.features}
                rowKey={(row) => row.feature}
                hideToolbar
                pageSize={20}
              />
            </DesignCard>

            <DesignSpacer size="medium" />
            <DesignCard className="p-4">
              <h2 className="text-lg font-semibold text-foreground">Recent calls</h2>
              <DesignSpacer size="small" />
              <DesignDataTable
                columns={recentColumns}
                data={data.recent}
                rowKey={(row) => row.id}
                searchPlaceholder="Search calls"
                pageSize={20}
                emptyTitle="No AI calls recorded yet"
                emptyBody="Costs show up here after the next theme run, chat question or generated description."
                emptyIcon={<Sparkle size={28} />}
              />
            </DesignCard>
          </>
        )}
      </AppShell>
    </RequireRole>
  );
};

export default AiUsage;
