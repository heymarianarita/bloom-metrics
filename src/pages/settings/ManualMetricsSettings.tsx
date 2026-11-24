import * as React from "react";
import { ClockCounterClockwise, Copy, DotsThree, Eraser, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import RequireRole from "@/components/auth/RequireRole";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { SelectList } from "@/components/settings/SelectList";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { DesignInputTextArea } from "@/components/ds/DesignInput";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { castCell } from "@/lib/cellValues";
import { readTableFile, SPREADSHEET_ACCEPT } from "@/lib/spreadsheetFile";
import { useManualMetrics } from "@/hooks/useManualMetrics";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import DatasetGrid from "@/components/datasets/DatasetGrid";
import CsvImportSheet from "@/components/datasets/CsvImportSheet";
import type { ImportPlan } from "@/components/datasets/importPlan";
import { inferDateOrder, type DateOrder } from "../../../server/shared/dates.ts";
import BulkCsvImportSheet, {
  BULK_NEW_DATASET,
  draftFromFile,
  type BulkFileDraft,
  type BulkFilePlan,
} from "@/components/datasets/BulkCsvImportSheet";
import { useAllDatasetColumns } from "@/hooks/useManualDatasets";
import {
  useAddDatasetColumn,
  useAddDatasetRow,
  useAddDatasetRows,
  useRenameDatasetColumn,
  useCreateDataset,
  useDatasetColumns,
  useDatasetRows,
  useDeleteDataset,
  useDuplicateDataset,
  useDeleteDatasetColumn,
  useDeleteDatasetRow,
  useClearDatasetRows,
  useDatasetStats,
  useManualDatasets,
  useReorderDatasets,
  useUpdateDataset,
  useUpdateDatasetRow,
  useDatasetImports,
  useUndoDatasetImport,
  createDatasetImport,
  ENTRY_METHODS,
  SYNCED_SOURCES,
  isSyncedDataset,
  type DatasetColumnKind,
  type DatasetImport,
  type ManualDataset,
  type ManualDatasetColumn,
  type ManualDatasetRow,
} from "@/hooks/useManualDatasets";

const slugifyMetric = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const kindOptions = [
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "rating", label: "Rating (1–5 score)" },
  { value: "text", label: "Text" },
  { value: "period", label: "Quarter (e.g. 2026-Q3)" },
];

/** A dataset's name, description and how its data is entered (the new and edit sheets). */
type DatasetDraft = { name: string; description: string; entry_method: string; entry_notes: string; one_off: boolean };
const EMPTY_DATASET_DRAFT: DatasetDraft = { name: "", description: "", entry_method: "", entry_notes: "", one_off: false };

const entryLabel = (method: string) => SYNCED_SOURCES[method] ?? ENTRY_METHODS.find((m) => m.value === method)?.label;

/**
 * One quiet line under the dataset's title: how its data gets in, the metrics that read it
 * (each opens in Metrics → All metrics), a shortcut to add one, and the steps for updating it
 * in a tooltip (edited from the dataset's details).
 */
const DatasetMeta = ({ dataset, onEdit }: { dataset: ManualDataset; onEdit: () => void }) => {
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const navigate = useNavigate();
  const usedBy = [
    ...(metrics.data ?? [])
      .filter((m) => m.dataset_id === dataset.id)
      .map((m) => ({ id: m.id, name: m.name, href: `/settings/metrics?metric=${m.id}` })),
    ...(qualitative.data ?? [])
      .filter((q) => q.dataset_id === dataset.id)
      .map((q) => ({ id: q.id, name: q.name, href: `/settings/metrics?insight=${q.id}` })),
  ];
  const addMetric = () => navigate(`/settings/metrics?new=${dataset.one_off ? "insight" : "number"}&dataset=${dataset.id}`);
  const method = entryLabel(dataset.entry_method);
  const hasSteps = Boolean(dataset.entry_notes.trim());
  const dot = <span aria-hidden="true">·</span>;
  return (
    <p className="text-[12px] text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5">
      {method && (
        <>
          <span>{method}</span>
          {dot}
        </>
      )}
      {usedBy.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="text-primary hover:underline">
              Used by {usedBy.length} {usedBy.length === 1 ? "metric" : "metrics"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px]">
            {usedBy.map((m) => (
              <DropdownMenuItem key={m.id} onSelect={() => navigate(m.href)}>
                {m.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={addMetric}>
              <Plus size={16} className="mr-2" />
              New metric from this dataset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span>Not used by any metric yet</span>
      )}
      {dot}
      <button type="button" className="text-primary hover:underline" onClick={addMetric}>
        Add metric
      </button>
      {dot}
      {hasSteps ? (
        <DesignTooltip content={<span className="whitespace-pre-line">{dataset.entry_notes}</span>} delay={0}>
          <span className="underline decoration-dotted underline-offset-2 cursor-default">How to update it</span>
        </DesignTooltip>
      ) : (
        <button type="button" className="text-primary hover:underline" onClick={onEdit}>
          Describe how it's entered
        </button>
      )}
    </p>
  );
};

const aggregationOptions = [
  { value: "sum", label: "Total of all rows" },
  { value: "avg", label: "Average of rows" },
  { value: "latest", label: "Last row entered" },
  { value: "count", label: "Number of rows" },
];

/* ─────────── Dataset editor ─────────── */

const DatasetsTab = () => {
  const { toast } = useToast();
  const datasets = useManualDatasets();
  const [datasetId, setDatasetId] = React.useState("");
  const columns = useDatasetColumns(datasetId || undefined);
  const rows = useDatasetRows(datasetId || undefined);

  const createDataset = useCreateDataset();
  const deleteDataset = useDeleteDataset();
  const duplicateDataset = useDuplicateDataset();
  const updateDataset = useUpdateDataset();
  const addColumn = useAddDatasetColumn();
  const deleteColumn = useDeleteDatasetColumn();
  const addRow = useAddDatasetRow();
  const addRows = useAddDatasetRows();
  const renameColumn = useRenameDatasetColumn();
  const updateRow = useUpdateDatasetRow();
  const deleteRow = useDeleteDatasetRow();
  const clearRows = useClearDatasetRows();
  const reorderDatasets = useReorderDatasets();

  const [datasetSheet, setDatasetSheet] = React.useState(false);
  const [editSheet, setEditSheet] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<DatasetDraft>(EMPTY_DATASET_DRAFT);
  const [columnSheet, setColumnSheet] = React.useState(false);
  const [importSheet, setImportSheet] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importSource, setImportSource] = React.useState("");
  const [importFileName, setImportFileName] = React.useState("");
  const csvFileRef = React.useRef<HTMLInputElement>(null);
  const bulkFileRef = React.useRef<HTMLInputElement>(null);
  const allColumns = useAllDatasetColumns();
  const [bulkSheet, setBulkSheet] = React.useState(false);
  const [bulkSaving, setBulkSaving] = React.useState(false);
  const [bulkDrafts, setBulkDrafts] = React.useState<BulkFileDraft[]>([]);

  const [datasetDraft, setDatasetDraft] = React.useState<DatasetDraft>(EMPTY_DATASET_DRAFT);
  const [columnDraft, setColumnDraft] = React.useState<{ label: string; kind: DatasetColumnKind }>({
    label: "",
    kind: "number",
  });

  React.useEffect(() => {
    if (!datasetId && datasets.data?.length) setDatasetId(datasets.data[0].id);
  }, [datasets.data, datasetId]);

  const activeDataset = datasets.data?.find((d) => d.id === datasetId);
  const synced = isSyncedDataset(activeDataset);
  const activeStats = useDatasetStats(datasetId ? [datasetId] : []);
  const lastUpdated = activeStats.data?.[datasetId];

  const saveDataset = async () => {
    if (!datasetDraft.name.trim()) return;
    try {
      const created = await createDataset.mutateAsync(datasetDraft);
      setDatasetId(created.id);
      setDatasetSheet(false);
      setDatasetDraft(EMPTY_DATASET_DRAFT);
      toast({ title: "Dataset created" });
    } catch (err) {
      toast({ title: "Could not create dataset", description: String(err), variant: "destructive" });
    }
  };

  const duplicate = async (includeRows: boolean) => {
    if (!activeDataset) return;
    try {
      const copy = await duplicateDataset.mutateAsync({ source: activeDataset, includeRows });
      setDatasetId(copy.id);
      toast({
        title: `Duplicated as “${copy.name}”`,
        description: includeRows ? "All rows were copied." : "Columns only — no rows were copied.",
      });
    } catch (err) {
      toast({ title: "Could not duplicate dataset", description: String(err), variant: "destructive" });
    }
  };

  const saveEditedDataset = async () => {
    if (!activeDataset || !editDraft.name.trim()) return;
    try {
      await updateDataset.mutateAsync({ id: activeDataset.id, ...editDraft });
      setEditSheet(false);
      toast({ title: "Dataset updated" });
    } catch (err) {
      toast({ title: "Could not update dataset", description: String(err), variant: "destructive" });
    }
  };

  const saveColumn = async () => {
    if (!columnDraft.label.trim() || !datasetId) return;
    try {
      await addColumn.mutateAsync({
        dataset_id: datasetId,
        label: columnDraft.label,
        kind: columnDraft.kind,
        sort_order: columns.data?.length ?? 0,
      });
      setColumnSheet(false);
      setColumnDraft({ label: "", kind: "number" });
    } catch (err) {
      toast({ title: "Could not add column", description: String(err), variant: "destructive" });
    }
  };

  const castValue = (column: ManualDatasetColumn, value: string, dateOrder: DateOrder | null = null) =>
    castCell(column.kind, value, dateOrder);

  /** Month-first or day-first per file column, worked out from all of its values. */
  const dateOrdersOf = (body: string[][], width: number) =>
    Array.from({ length: width }, (_, i) => inferDateOrder(body.map((row) => row[i] ?? "")).order);

  const metrics = useManualMetrics();
  const metricUseFor = React.useCallback(
    (id: string) => {
      const own = (metrics.data ?? []).filter((m) => m.dataset_id === id);
      return {
        period: own.map((m) => m.period_column).filter(Boolean),
        filters: own.flatMap((m) => m.filter_columns ?? []),
      };
    },
    [metrics.data],
  );
  const metricUse = React.useMemo(() => metricUseFor(datasetId), [metricUseFor, datasetId]);

  const imports = useDatasetImports(datasetId || undefined);
  const undoImport = useUndoDatasetImport();
  const [historySheet, setHistorySheet] = React.useState(false);

  const undo = async (entry: DatasetImport) => {
    try {
      await undoImport.mutateAsync(entry);
      toast({ title: "Import undone", description: `Removed the ${entry.row_count} rows from ${entry.file_name || "the file"}.` });
    } catch (err) {
      toast({ title: "Could not undo the import", description: String(err), variant: "destructive" });
    }
  };

  /** Records the import, creates its new columns, then writes its rows tagged with the import's id. */
  const handleCsvImport = async (plan: ImportPlan) => {
    if (!datasetId) return;
    setImporting(true);
    let entry: DatasetImport | null = null;
    try {
      const id = await createDatasetImport({
        dataset_id: datasetId,
        file_name: importFileName,
        row_count: plan.rows.length,
        created_columns: plan.newColumns.map((c) => c.key),
      });
      entry = {
        id,
        dataset_id: datasetId,
        file_name: importFileName,
        row_count: plan.rows.length,
        created_columns: plan.newColumns.map((c) => c.key),
        undone_at: null,
        created_at: new Date().toISOString(),
      };
      let order = columns.data?.length ?? 0;
      for (const column of plan.newColumns) {
        await addColumn.mutateAsync({ dataset_id: datasetId, label: column.label, kind: column.kind, sort_order: order });
        order += 1;
      }
      await addRows.mutateAsync({
        dataset_id: datasetId,
        rows: plan.rows,
        startOrder: rows.data?.length ?? 0,
        import_id: id,
      });

      setImportSheet(false);
      const done = entry;
      toast({
        title: `Added ${plan.rows.length} rows to ${activeDataset?.name ?? "the dataset"}`,
        description: "Undo it here, or later from the dataset's menu → Import history.",
        action: (
          <ToastAction altText="Undo import" onClick={() => void undo(done)}>
            Undo
          </ToastAction>
        ),
      });
    } catch (err) {
      // Leave nothing half-imported behind, not even the import's entry in Import history.
      if (entry) {
        const failed = entry;
        await undoImport
          .mutateAsync(failed)
          .then(() => supabase.from("dataset_imports").delete().eq("id", failed.id))
          .catch(() => undefined);
      }
      toast({ title: "Could not import the file", description: `Nothing was added. ${String(err)}`, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleCsvFile = async (file: File) => {
    try {
      const { text, sheetName } = await readTableFile(file);
      if (!text.trim()) {
        toast({ title: "That file looks empty", variant: "destructive" });
        return;
      }
      setImportSource(text);
      setImportFileName(sheetName ? `${file.name} (${sheetName})` : file.name);
      setImportSheet(true);
    } catch (err) {
      toast({ title: "Could not read the file", description: String(err), variant: "destructive" });
    }
  };

  const csvFileInput = (
    <input
      ref={csvFileRef}
      type="file"
      accept={SPREADSHEET_ACCEPT}
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void handleCsvFile(file);
        event.target.value = "";
      }}
    />
  );

  const handleBulkFiles = async (files: File[]) => {
    try {
      const drafts = await Promise.all(files.map((file) => draftFromFile(file)));
      const usable = drafts.filter((draft) => draft.text.trim().length > 0);
      if (!usable.length) {
        toast({ title: "Those files look empty", variant: "destructive" });
        return;
      }
      setBulkDrafts((prev) => [...prev, ...usable]);
      setBulkSheet(true);
    } catch (err) {
      toast({ title: "Could not read the files", description: String(err), variant: "destructive" });
    }
  };

  const bulkFileInput = (
    <input
      ref={bulkFileRef}
      type="file"
      multiple
      accept={SPREADSHEET_ACCEPT}
      className="hidden"
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length) void handleBulkFiles(files);
        event.target.value = "";
      }}
    />
  );

  /** Applies every file plan: creates datasets and columns as needed, then writes rows. */
  const saveBulkImport = async (plans: BulkFilePlan[]) => {
    setBulkSaving(true);
    try {
      let created = 0;
      let updated = 0;
      let importedRows = 0;
      let lastDatasetId = datasetId;

      for (const { draft, plan } of plans) {
        let targetId = draft.target;
        let startOrder = 0;
        let order = 0;

        if (draft.target === BULK_NEW_DATASET) {
          const dataset = await createDataset.mutateAsync({ name: draft.datasetName.trim() });
          targetId = dataset.id;
          created += 1;
        } else {
          order = (allColumns.data ?? []).filter((c) => c.dataset_id === targetId).length;
          const { count } = await supabase
            .from("manual_dataset_rows")
            .select("id", { count: "exact", head: true })
            .eq("dataset_id", targetId);
          startOrder = count ?? 0;
          updated += 1;
        }

        for (const column of plan.newColumns) {
          await addColumn.mutateAsync({ dataset_id: targetId, label: column.label, kind: column.kind, sort_order: order });
          order += 1;
        }

        if (plan.rows.length) {
          const importId = await createDatasetImport({
            dataset_id: targetId,
            file_name: draft.fileName,
            row_count: plan.rows.length,
            created_columns: plan.newColumns.map((c) => c.key),
          });
          await addRows.mutateAsync({ dataset_id: targetId, rows: plan.rows, startOrder, import_id: importId });
          importedRows += plan.rows.length;
        }
        lastDatasetId = targetId;
      }

      setBulkDrafts([]);
      setBulkSheet(false);
      setDatasetId(lastDatasetId);
      toast({
        title: `Imported ${importedRows} rows`,
        description: `${created} dataset${created === 1 ? "" : "s"} created, ${updated} updated.`,
      });
    } catch (err) {
      toast({ title: "Could not finish the import", description: String(err), variant: "destructive" });
    } finally {
      setBulkSaving(false);
    }
  };



  const handlePasteBlock = async (rowIndex: number, columnIndex: number, block: string[][]) => {
    const cols = columns.data ?? [];
    const existing = rows.data ?? [];
    const newRows: Record<string, unknown>[] = [];
    const inferred = dateOrdersOf(block, Math.max(0, ...block.map((r) => r.length)));

    for (let i = 0; i < block.length; i += 1) {
      const cells = block[i];
      const target = existing[rowIndex + i];
      const data: Record<string, unknown> = { ...(target?.data ?? {}) };
      cells.forEach((cell, j) => {
        const column = cols[columnIndex + j];
        if (!column) return;
        data[column.key] = castValue(column, cell.trim(), inferred[j]);
      });
      if (target) await updateRow.mutateAsync({ id: target.id, data });
      else newRows.push(data);
    }

    if (newRows.length) {
      await addRows.mutateAsync({
        dataset_id: datasetId,
        rows: newRows,
        startOrder: existing.length,
      });
    }
    toast({ title: `Pasted ${block.length} row${block.length === 1 ? "" : "s"}` });
  };

  if (datasets.isLoading) return <DesignLoader />;

  if ((datasets.data ?? []).length === 0) {
    return (
      <>
        <DesignCard className="p-4">
          <DesignEmptyState
            title="No datasets yet"
            body="A dataset is a table you fill in — add the columns you need, then type the rows. Metrics are built from these columns afterwards."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <DesignButton variant="filled" theme="primary" onClick={() => setDatasetSheet(true)}>
                  Create first dataset
                </DesignButton>
                <DesignButton
                  variant="outlined"
                  theme="primary"
                  icon={<UploadSimple size={16} />}
                  onClick={() => bulkFileRef.current?.click()}
                >
                  Bulk import files
                </DesignButton>
              </div>
            }
          />
        </DesignCard>

        {bulkFileInput}

      <NewDatasetSheet
          open={datasetSheet}
          onOpenChange={setDatasetSheet}
          draft={datasetDraft}
          setDraft={setDatasetDraft}
          onSave={saveDataset}
          saving={createDataset.isPending}
        />

        <BulkCsvImportSheet
          open={bulkSheet}
          onOpenChange={(open) => {
            setBulkSheet(open);
            if (!open) setBulkDrafts([]);
          }}
          drafts={bulkDrafts}
          setDrafts={setBulkDrafts}
          datasets={datasets.data ?? []}
          allColumns={allColumns.data ?? []}
          metricUseFor={metricUseFor}
          saving={bulkSaving}
          onAddFiles={() => bulkFileRef.current?.click()}
          onSave={saveBulkImport}
        />
      </>
    );
  }

  const openEdit = () => {
    if (!activeDataset) return;
    setEditDraft({
      name: activeDataset.name,
      description: activeDataset.description ?? "",
      entry_method: activeDataset.entry_method ?? "",
      entry_notes: activeDataset.entry_notes ?? "",
      one_off: Boolean(activeDataset.one_off),
    });
    setEditSheet(true);
  };

  return (
    <>
      {bulkFileInput}
      <SettingsLayout
        fillMain
        list={
      <SelectList
        title="Datasets"
        items={(datasets.data ?? []).map((d) => ({ id: d.id, label: d.name }))}
        selectedId={datasetId}
        onSelect={setDatasetId}
        onReorder={async (ids) => {
          try {
            await reorderDatasets.mutateAsync(ids);
          } catch (err) {
            toast({ title: "Could not reorder", description: String(err), variant: "destructive" });
            throw err;
          }
        }}
        actions={[
          { label: "New dataset", icon: <Plus size={16} />, onClick: () => setDatasetSheet(true) },
          { label: "Bulk import files", icon: <UploadSimple size={16} />, onClick: () => bulkFileRef.current?.click() },
        ]}
      />
        }
        main={
      <DesignCard className="p-4 min-w-0 xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-medium text-foreground">{activeDataset?.name}</h2>
              {activeDataset?.one_off && (
                <DesignBadge theme="highlight" styling="light">
                  One-off
                </DesignBadge>
              )}
              {lastUpdated && (
                <DesignBadge theme="muted" styling="light">
                  {lastUpdated.updatedAt ? `Updated ${formatDate(lastUpdated.updatedAt)}` : "No data yet"}
                </DesignBadge>
              )}
            </div>
            {activeDataset?.description && (
              <p className="text-[14px] text-muted-foreground mt-1">{activeDataset.description}</p>
            )}
            {activeDataset && <DatasetMeta dataset={activeDataset} onEdit={openEdit} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {csvFileInput}
            {!synced && (
            <DesignButton
              variant="outlined"
              theme="primary"
              size="medium"
              icon={<UploadSimple size={16} />}
              disabled={!datasetId}
              onClick={() => csvFileRef.current?.click()}
            >
              Import CSV or Excel
            </DesignButton>
            )}
            {activeDataset && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Dataset actions"
                    className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-foreground transition-colors hover:bg-[rgba(21,25,26,0.06)] active:bg-[rgba(21,25,26,0.04)]"
                  >
                    <DotsThree size={20} weight="bold" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {!synced && (
                  <DropdownMenuItem
                    onSelect={() => {
                      openEdit();
                    }}
                  >
                    <PencilSimple size={16} className="mr-2" />
                    Edit details
                  </DropdownMenuItem>
                  )}
                  {!synced && (
                  <DropdownMenuItem onSelect={() => setHistorySheet(true)}>
                    <ClockCounterClockwise size={16} className="mr-2" />
                    Import history
                  </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => duplicate(true)}>
                    <Copy size={16} className="mr-2" />
                    Duplicate with data
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => duplicate(false)}>
                    <Copy size={16} className="mr-2" />
                    Duplicate structure only
                  </DropdownMenuItem>
                  {!synced && (
                  <>
                  <DropdownMenuItem
                    onSelect={() => {
                      if (
                        !confirm(
                          `Remove every row from “${activeDataset.name}”? The columns stay in place.`,
                        )
                      )
                        return;
                      clearRows.mutate(activeDataset.id, {
                        onSuccess: () =>
                          toast({ title: "Data cleared", description: "The columns are still there." }),
                        onError: (error) =>
                          toast({ title: "Could not clear data", description: error.message }),
                      });
                    }}
                  >
                    <Eraser size={16} className="mr-2" />
                    Clear all data
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => {
                      if (!confirm(`Delete “${activeDataset.name}” and all of its rows?`)) return;
                      deleteDataset.mutate(activeDataset.id);
                      setDatasetId("");
                    }}
                  >
                    <Trash size={16} className="mr-2" />
                    Delete dataset
                  </DropdownMenuItem>
                  </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {synced && (
          <p className="text-[14px] text-muted-foreground mt-3">
            Read-only: this data is synced automatically. {activeDataset?.entry_notes}
          </p>
        )}

        <DesignSpacer size="medium" />

        {(columns.data ?? []).length === 0 ? (
          <DesignEmptyState
            title="No columns yet"
            body="Add at least one column before entering data. A period column lets metrics chart values over quarters."
            action={
              <DesignButton variant="filled" theme="primary" onClick={() => setColumnSheet(true)}>
                Add first column
              </DesignButton>
            }
          />
        ) : (
          <>
            <DatasetGrid
              readOnly={synced}
              columns={columns.data ?? []}
              rows={rows.data ?? []}
              onCellChange={(row, column, value) =>
                updateRow.mutate({
                  id: row.id,
                  data: { ...(row.data ?? {}), [column.key]: castValue(column, value) },
                })
              }
              onRenameColumn={(column, label) => renameColumn.mutate({ id: column.id, label })}
              onChangeColumnKind={(column, kind) =>
                renameColumn.mutate({ id: column.id, label: column.label, kind })
              }
              onDeleteColumn={(column) => {
                if (!confirm(`Delete the “${column.label}” column and its values?`)) return;
                deleteColumn.mutate(column.id);
              }}
              onAddColumn={() => setColumnSheet(true)}
              onAddRow={() => addRow.mutate({ dataset_id: datasetId, sort_order: rows.data?.length ?? 0 })}
              onDeleteRow={(row) => deleteRow.mutate(row.id)}
              onPasteBlock={handlePasteBlock}
            />
          </>
        )}
      </DesignCard>
        }
      />

      <NewDatasetSheet
        open={datasetSheet}
        onOpenChange={setDatasetSheet}
        draft={datasetDraft}
        setDraft={setDatasetDraft}
        onSave={saveDataset}
        saving={createDataset.isPending}
      />

      <NewDatasetSheet
        open={editSheet}
        onOpenChange={setEditSheet}
        draft={editDraft}
        setDraft={setEditDraft}
        onSave={saveEditedDataset}
        saving={updateDataset.isPending}
        title="Edit dataset"
        cta="Save changes"
      />

      <CsvImportSheet
        open={importSheet}
        onOpenChange={setImportSheet}
        datasetName={activeDataset?.name ?? "the dataset"}
        columns={columns.data ?? []}
        metricUse={metricUse}
        importing={importing}
        source={importSource}
        fileName={importFileName}
        onImport={handleCsvImport}
      />

      <ImportHistorySheet
        open={historySheet}
        onOpenChange={setHistorySheet}
        datasetName={activeDataset?.name ?? ""}
        imports={imports.data ?? []}
        undoingId={undoImport.isPending ? undoImport.variables?.id : undefined}
        onUndo={(entry) => {
          if (
            !confirm(
              `Remove the ${entry.row_count} rows added from “${entry.file_name || "this file"}”, including any edits made to them since? Columns the import created go too, unless other rows use them.`,
            )
          )
            return;
          void undo(entry);
        }}
      />

      <BulkCsvImportSheet
        open={bulkSheet}
        onOpenChange={(open) => {
          setBulkSheet(open);
          if (!open) setBulkDrafts([]);
        }}
        drafts={bulkDrafts}
        setDrafts={setBulkDrafts}
        datasets={datasets.data ?? []}
        allColumns={allColumns.data ?? []}
        metricUseFor={metricUseFor}
        saving={bulkSaving}
        onAddFiles={() => bulkFileRef.current?.click()}
        onSave={saveBulkImport}
      />




      <DesignSideSheet
        open={columnSheet}
        onOpenChange={setColumnSheet}
        title="Add column"
        footer={
          <div className="flex justify-end gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => setColumnSheet(false)}>
              Cancel
            </DesignButton>
            <DesignButton variant="filled" theme="primary" isLoading={addColumn.isPending} onClick={saveColumn}>
              Add column
            </DesignButton>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <DesignInputText
            label="Column name"
            value={columnDraft.label}
            onChange={(e) => setColumnDraft({ ...columnDraft, label: e.target.value })}
          />
          <DesignInputSelect
            label="Type"
            value={columnDraft.kind}
            onChange={(kind) => setColumnDraft({ ...columnDraft, kind: kind as DatasetColumnKind })}
            options={kindOptions}
          />
        </div>
      </DesignSideSheet>
    </>
  );
};

/** Every CSV import into the dataset, newest first, each of which can be undone. */
const ImportHistorySheet = ({
  open,
  onOpenChange,
  datasetName,
  imports,
  undoingId,
  onUndo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetName: string;
  imports: DatasetImport[];
  undoingId?: string;
  onUndo: (entry: DatasetImport) => void;
}) => (
  <DesignSideSheet open={open} onOpenChange={onOpenChange} title="Import history">
    <div className="p-4 space-y-3">
      <p className="text-[14px] text-muted-foreground">
        CSV imports into {datasetName}. Undoing one removes exactly the rows it added; they stay listed in Data history →
        Change history.
      </p>
      {imports.length === 0 ? (
        <DesignEmptyState
          title="No imports yet"
          body="Imports made from now on show up here, so you can undo one if something went wrong."
        />
      ) : (
        imports.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 rounded-[6px] border border-border p-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-[500] text-foreground">{entry.file_name || "Imported file"}</p>
              <p className="text-[12px] text-muted-foreground">
                {formatDateTime(entry.created_at)} · {entry.row_count} rows
                {entry.created_columns.length > 0 &&
                  ` · ${entry.created_columns.length} new column${entry.created_columns.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {entry.undone_at ? (
              <DesignBadge theme="muted" styling="light">
                Undone {formatDate(entry.undone_at)}
              </DesignBadge>
            ) : (
              <DesignButton
                className="shrink-0 whitespace-nowrap"
                variant="outlined"
                theme="primary"
                size="small"
                isLoading={undoingId === entry.id}
                onClick={() => onUndo(entry)}
              >
                Undo import
              </DesignButton>
            )}
          </div>
        ))
      )}
    </div>
  </DesignSideSheet>
);

const NewDatasetSheet = ({
  open,
  onOpenChange,
  draft,
  setDraft,
  onSave,
  saving,
  title = "New dataset",
  cta = "Create dataset",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: DatasetDraft;
  setDraft: (draft: DatasetDraft) => void;
  onSave: () => void;
  saving: boolean;
  title?: string;
  cta?: string;
}) => (
  <DesignSideSheet
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    footer={
      <div className="flex justify-end gap-2">
        <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
          Cancel
        </DesignButton>
        <DesignButton variant="filled" theme="primary" isLoading={saving} onClick={onSave}>
          {cta}
        </DesignButton>
      </div>
    }
  >
    <div className="p-4 space-y-4">
      <DesignInputText
        label="Name"
        placeholder="Design system survey"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <DesignInputText
        label="Description"
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
      />
      <DesignInputSelect
        label="How it's entered"
        placeholder="Pick one"
        value={draft.entry_method}
        onChange={(entry_method) => setDraft({ ...draft, entry_method })}
        options={ENTRY_METHODS.map((m) => ({ value: m.value, label: m.label }))}
      />
      <DesignInputTextArea
        label="Steps to update it"
        placeholder="Export the quarterly survey responses from Google Forms as CSV, then use Import CSV here. Owner: design ops."
        value={draft.entry_notes}
        onChange={(e) => setDraft({ ...draft, entry_notes: e.target.value })}
      />
      <label className="flex items-start gap-3 cursor-pointer">
        <DesignCheckbox checked={draft.one_off} onCheckedChange={(on) => setDraft({ ...draft, one_off: Boolean(on) })} />
        <span className="pt-0.5">
          <span className="block text-sm text-foreground">One-off questions</span>
          <span className="block text-[12px] text-muted-foreground">
            Questions asked once, not tracked over time. Their qualitative metrics show in a view's “One-off questions” section, only
            for the period they were asked.
          </span>
        </span>
      </label>
    </div>
  </DesignSideSheet>
);

/* ─────────── Page ─────────── */

const ManualMetricsSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <DatasetsTab />
    </AppShell>
  </RequireRole>
);

export default ManualMetricsSettings;
