import * as React from "react";
import { ClipboardText, Trash, Table as TableIcon } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignChip } from "@/components/ds/DesignChip";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { Link } from "react-router-dom";
import PastePerformanceDialog from "./PastePerformanceDialog";
import { useSession, useCanEdit } from "@/hooks/useAuth";
import {
  usePerformanceEntries,
  useDeletePerformanceQuarter,
  type PerformanceEntry,
} from "@/hooks/usePerformanceEntries";
import { normalizeRag } from "@/lib/performancePaste";

const RAG_THEME: Record<string, "success" | "highlight" | "error" | "muted"> = {
  green: "success",
  amber: "highlight",
  red: "error",
};

const RagCell = ({ value }: { value: string }) => {
  const normalized = normalizeRag(value);
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <DesignBadge theme={RAG_THEME[normalized] ?? "muted"} styling="light">
      {value}
    </DesignBadge>
  );
};

const PerformanceEntriesPanel = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { data, isLoading, error } = usePerformanceEntries();
  const { user } = useSession();
  const { data: isAdmin } = useCanEdit(user);
  const canEdit = !readOnly && Boolean(isAdmin);
  const removeQuarter = useDeletePerformanceQuarter();
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(null);

  const entries = data ?? [];
  const quarters = React.useMemo(
    () => Array.from(new Set(entries.map((e) => e.quarter))).sort((a, b) => b.localeCompare(a)),
    [entries],
  );
  const activeQuarter = active && quarters.includes(active) ? active : quarters[0];
  const rows = entries.filter((e) => e.quarter === activeQuarter);

  const columns: DataTableColumn<PerformanceEntry>[] = [
    { key: "team", header: "Team & ownership", width: "1.4fr", sortable: true },
    {
      key: "intended_outcomes",
      header: "Intended outcomes",
      width: "1.8fr",
      render: (row) => <span className="whitespace-pre-wrap">{row.intended_outcomes || "—"}</span>,
    },
    {
      key: "main_deliverables",
      header: "Main deliverables in Q",
      width: "1.8fr",
      render: (row) => <span className="whitespace-pre-wrap">{row.main_deliverables || "—"}</span>,
    },
    { key: "headcount", header: "Headcount by EOQ", width: "0.8fr", sortable: true },
    { key: "discovery_rag", header: "Discovery", width: "0.8fr", render: (r) => <RagCell value={r.discovery_rag} /> },
    { key: "delivery_rag", header: "Delivery", width: "0.8fr", render: (r) => <RagCell value={r.delivery_rag} /> },
    { key: "impact_rag", header: "Impact", width: "0.8fr", render: (r) => <RagCell value={r.impact_rag} /> },
    {
      key: "comment",
      header: "Comment",
      width: "1.4fr",
      render: (row) => <span className="whitespace-pre-wrap">{row.comment || "—"}</span>,
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {quarters.map((quarter) => (
            <DesignChip
              key={quarter}
              isActive={quarter === activeQuarter}
              onClick={() => setActive(quarter)}
            >
              {quarter}
            </DesignChip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && isAdmin && (
            <Link to="/settings/performance">
              <DesignButton variant="outlined" theme="primary" icon={<ClipboardText size={16} />}>
                Manage performance data
              </DesignButton>
            </Link>
          )}
          {canEdit && activeQuarter && (
            <DesignButton
              variant="outlined"
              theme="primary"
              icon={<Trash size={16} />}
              isLoading={removeQuarter.isPending}
              onClick={() => removeQuarter.mutate(activeQuarter)}
            >
              Clear {activeQuarter}
            </DesignButton>
          )}
          {canEdit && (
            <DesignButton
              variant="filled"
              theme="primary"
              icon={<ClipboardText size={16} />}
              onClick={() => setPasteOpen(true)}
            >
              Paste from doc
            </DesignButton>
          )}
        </div>
      </div>

      <DesignSpacer size="medium" />

      {error && (
        <>
          <DesignInfoBanner
            type="error"
            title="Could not load saved performance data"
            description={(error as Error).message}
            showCloseButton={false}
          />
          <DesignSpacer size="medium" />
        </>
      )}

      {isLoading && (
        <DesignCard className="p-12 flex justify-center">
          <DesignLoader />
        </DesignCard>
      )}

      {!isLoading && rows.length === 0 && (
        <DesignCard>
          <DesignEmptyState
            icon={<TableIcon size={40} />}
            title="No performance data yet"
            body={
              canEdit
                ? "Copy the quarter's table from your Google Doc and paste it in — it will be stored here."
                : isAdmin
                  ? "Quarterly performance is managed in Settings → Team performance."
                  : "Quarterly performance data has not been published yet."
            }
            action={
              canEdit ? (
                <DesignButton variant="filled" theme="primary" onClick={() => setPasteOpen(true)}>
                  Paste from doc
                </DesignButton>
              ) : isAdmin ? (
                <Link to="/settings/performance">
                  <DesignButton variant="filled" theme="primary">
                    Manage performance data
                  </DesignButton>
                </Link>
              ) : undefined
            }
          />
        </DesignCard>
      )}

      {!isLoading && rows.length > 0 && (
        <DesignDataTable
          title={`${activeQuarter} — ${rows.length} teams`}
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          searchPlaceholder="Search teams"
          pageSize={25}
        />
      )}

      {canEdit && (
      <PastePerformanceDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        defaultQuarter={activeQuarter ?? undefined}
      />
      )}
    </>
  );
};

export default PerformanceEntriesPanel;
