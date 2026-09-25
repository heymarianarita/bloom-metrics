import * as React from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignCell } from "@/components/ds/DesignCell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSyncRuns, type SyncRun } from "@/hooks/useDataSources";

interface ChangeLogRow {
  id: string;
  table_name: string;
  action: string;
  changed_at: string;
  changed_by: string | null;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
}

/** Every table that holds recorded data, exportable as CSV. */
const EXPORTABLE = [
  { table: "performance_entries", label: "Performance entries", mode: "Manual" },
  { table: "manual_metric_values", label: "Manual metric values", mode: "Manual" },
  { table: "manual_metrics", label: "Manual metric definitions", mode: "Manual" },
  { table: "ai_template_metrics", label: "AI template metrics", mode: "Manual" },
  { table: "ai_template_definitions", label: "AI templates", mode: "Manual" },
  { table: "figma_adoption_snapshots", label: "Figma adoption snapshots", mode: "Dynamic" },
  { table: "ga4_report_snapshots", label: "GA4 report snapshots", mode: "Dynamic" },
  { table: "sync_runs", label: "Sync runs", mode: "Dynamic" },
  { table: "data_source_configs", label: "Data source configuration", mode: "Config" },
  { table: "data_change_log", label: "Change history", mode: "History" },
] as const;

const toCsv = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))].join("\n");
};

const download = (name: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const HistorySettings = () => {
  const { toast } = useToast();
  const runs = useSyncRuns(200);
  const [busy, setBusy] = React.useState<string | null>(null);
  const changes = useQuery({
    queryKey: ["data-change-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_change_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ChangeLogRow[];
    },
  });

  const exportTable = async (table: string, label: string) => {
    setBusy(table);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(table as any) as any).select("*");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) {
        toast({ title: "Nothing to export", description: `${label} has no rows yet.` });
        return;
      }
      download(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportAll = async () => {
    for (const entry of EXPORTABLE) {
      // eslint-disable-next-line no-await-in-loop
      await exportTable(entry.table, entry.label);
    }
  };

  const columns: DataTableColumn<SyncRun>[] = [
    { key: "ran_at", header: "When", render: (row) => new Date(row.ran_at).toLocaleString() },
    { key: "source", header: "Source", render: (row) => row.source_key },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <DesignBadge theme={row.status === "success" ? "success" : "error"} styling="light">
          {row.status}
        </DesignBadge>
      ),
    },
    { key: "rows", header: "Rows", render: (row) => (row.row_count ?? "—").toString() },
    { key: "triggered_by", header: "Trigger", render: (row) => row.triggered_by },
    { key: "message", header: "Message", render: (row) => row.message || "—" },
  ];

  const changeColumns: DataTableColumn<ChangeLogRow>[] = [
    { key: "changed_at", header: "When", render: (row) => new Date(row.changed_at).toLocaleString() },
    { key: "table_name", header: "Data", render: (row) => row.table_name },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <DesignBadge
          theme={row.action === "removed" ? "error" : row.action === "added" ? "success" : "muted"}
          styling="light"
        >
          {row.action}
        </DesignBadge>
      ),
    },
    {
      key: "summary",
      header: "Details",
      render: (row) => {
        const data = row.new_data ?? row.old_data ?? {};
        const label = (data.quarter ?? data.name ?? data.period ?? data.source_key ?? data.team) as string | undefined;
        return label ?? "—";
      },
    },
  ];

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="Data history"
          subtitle="Everything the tool records lives in one database. Export any table as CSV, and review sync runs."
          primaryAction={
            <DesignButton
              variant="filled"
              theme="primary"
              size="medium"
              icon={<DownloadSimple size={16} />}
              onClick={exportAll}
            >
              Export everything
            </DesignButton>
          }
        />
        <DesignSpacer size="medium" />

        <DesignCard className="p-2">
          {EXPORTABLE.map((entry) => (
            <DesignCell
              key={entry.table}
              title={entry.label}
              subtitle={entry.table}
              suffix={
                <div className="flex items-center gap-2">
                  <DesignBadge
                    theme={entry.mode === "Dynamic" ? "primary" : entry.mode === "Manual" ? "muted" : "highlight"}
                    styling="light"
                  >
                    {entry.mode}
                  </DesignBadge>
                  <DesignButton
                    variant="outlined"
                    theme="primary"
                    size="small"
                    icon={<DownloadSimple size={14} />}
                    isLoading={busy === entry.table}
                    onClick={() => exportTable(entry.table, entry.label)}
                  >
                    CSV
                  </DesignButton>
                </div>
              }
            />
          ))}
        </DesignCard>

        <DesignSpacer size="medium" />

        <DesignCard className="p-4">
          <h2 className="text-[18px] font-[580] text-foreground">Sync runs</h2>
          <DesignSpacer size="small" />
          {(runs.data ?? []).length === 0 ? (
            <DesignEmptyState
              title="No sync runs recorded yet"
              body="Automated sources write a run here every time they fetch data."
            />
          ) : (
            <DesignDataTable
              columns={columns}
              data={runs.data ?? []}
              rowKey={(row) => row.id}
              searchPlaceholder="Search runs"
            />
          )}
        </DesignCard>

        <DesignSpacer size="medium" />

        <DesignCard className="p-4">
          <h2 className="text-[18px] font-[580] text-foreground">Change history</h2>
          <p className="text-[14px] text-muted-foreground">
            Every add, edit and delete across the tool's data, kept permanently.
          </p>
          <DesignSpacer size="small" />
          {(changes.data ?? []).length === 0 ? (
            <DesignEmptyState
              title="No changes recorded yet"
              body="As soon as data is entered or edited, it shows up here."
            />
          ) : (
            <DesignDataTable
              columns={changeColumns}
              data={changes.data ?? []}
              rowKey={(row) => row.id}
              searchPlaceholder="Search changes"
            />
          )}
        </DesignCard>
      </AppShell>
    </RequireRole>
  );
};

export default HistorySettings;
