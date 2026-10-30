import * as React from "react";
import { Copy, DotsThree, Eraser, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
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
import { SelectList } from "@/components/settings/SelectList";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { DesignInputTextArea } from "@/components/ds/DesignInput";
import { formatDate } from "@/lib/formatDate";
import { useManualMetrics } from "@/hooks/useManualMetrics";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import DatasetGrid from "@/components/datasets/DatasetGrid";
import CsvImportSheet, { CSV_IGNORE, CSV_NEW_COLUMN, looksNumeric } from "@/components/datasets/CsvImportSheet";
import { inferDateOrder, looksLikeDates, toIsoDate, type DateOrder } from "../../../server/shared/dates.ts";
import BulkCsvImportSheet, {
  BULK_IGNORE,
  BULK_NEW_COLUMN,
  BULK_NEW_DATASET,
  draftFromFile,
  type BulkFileDraft,
  type BulkFilePlan,
} from "@/components/datasets/BulkCsvImportSheet";
import { slugify, useAllDatasetColumns } from "@/hooks/useManualDatasets";
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
  ENTRY_METHODS,
  type DatasetColumnKind,
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
type DatasetDraft = { name: string; description: string; entry_method: string; entry_notes: string };
const EMPTY_DATASET_DRAFT: DatasetDraft = { name: "", description: "", entry_method: "", entry_notes: "" };

const entryLabel = (method: string) => ENTRY_METHODS.find((m) => m.value === method)?.label;

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
  const addMetric = () => navigate(`/settings/metrics?new=number&dataset=${dataset.id}`);
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

  /** Numbers become numbers; dates become YYYY-MM-DD when their order is known (or can only be read one way). */
  const castValue = (column: ManualDatasetColumn, value: string, dateOrder: DateOrder | null = null) =>
    column.kind === "number" || column.kind === "rating"
      ? value.trim() === "" ? null : Number(value) || 0
      : column.kind === "date"
        ? toIsoDate(value, dateOrder) ?? value
        : value;

  /** Month-first or day-first per file column, worked out from all of its values. */
  const dateOrdersOf = (body: string[][], width: number) =>
    Array.from({ length: width }, (_, i) => inferDateOrder(body.map((row) => row[i] ?? "")).order);

  const handleCsvImport = async ({
    mapping,
    header,
    body,
    dateOrders,
  }: {
    mapping: string[];
    header: string[];
    body: string[][];
    /** Chosen in the import sheet for columns whose date order can't be told. */
    dateOrders: (DateOrder | null)[];
  }) => {
    if (!datasetId) return;
    setImporting(true);
    try {
      const existingColumns = [...(columns.data ?? [])];
      const keyByIndex: (string | null)[] = [];

      for (let index = 0; index < mapping.length; index += 1) {
        const choice = mapping[index];
        if (!choice || choice === CSV_IGNORE) {
          keyByIndex.push(null);
          continue;
        }
        if (choice === CSV_NEW_COLUMN) {
          const label = (header[index] || `Column ${index + 1}`).trim();
          const sample = body.slice(0, 20).map((row) => (row[index] ?? "").trim()).filter(Boolean);
          const kind: DatasetColumnKind = looksLikeDates(sample) ? "date" : looksNumeric(sample) ? "number" : "text";
          await addColumn.mutateAsync({
            dataset_id: datasetId,
            label,
            kind,
            sort_order: existingColumns.length,
          });
          const key = slugify(label) || `col_${index}`;
          existingColumns.push({
            id: key,
            dataset_id: datasetId,
            key,
            label,
            kind,
            sort_order: existingColumns.length,
          });
          keyByIndex.push(key);
          continue;
        }
        keyByIndex.push(choice);
      }

      const kindByKey = new Map(existingColumns.map((column) => [column.key, column]));
      const inferred = dateOrdersOf(body, mapping.length);
      const newRows = body.map((cells) => {
        const data: Record<string, unknown> = {};
        keyByIndex.forEach((key, index) => {
          if (!key) return;
          const column = kindByKey.get(key);
          const raw = (cells[index] ?? "").trim();
          data[key] = column ? castValue(column, raw, dateOrders[index] ?? inferred[index]) : raw;
        });
        return data;
      });

      if (newRows.length) {
        await addRows.mutateAsync({
          dataset_id: datasetId,
          rows: newRows,
          startOrder: rows.data?.length ?? 0,
        });
      }

      setImportSheet(false);
      toast({ title: `Imported ${newRows.length} rows` });
    } catch (err) {
      toast({ title: "Could not import the file", description: String(err), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast({ title: "That file looks empty", variant: "destructive" });
        return;
      }
      setImportSource(text);
      setImportFileName(file.name);
      setImportSheet(true);
    } catch (err) {
      toast({ title: "Could not read the file", description: String(err), variant: "destructive" });
    }
  };

  const csvFileInput = (
    <input
      ref={csvFileRef}
      type="file"
      accept=".csv,.tsv,text/csv,text/plain"
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
      accept=".csv,.tsv,text/csv,text/plain"
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

      for (const plan of plans) {
        let targetId = plan.target;
        let existing: ManualDatasetColumn[] = [];
        let startOrder = 0;

        if (plan.target === BULK_NEW_DATASET) {
          const dataset = await createDataset.mutateAsync({ name: plan.datasetName.trim() });
          targetId = dataset.id;
          created += 1;
        } else {
          existing = (allColumns.data ?? []).filter((c) => c.dataset_id === targetId);
          const { count } = await supabase
            .from("manual_dataset_rows")
            .select("id", { count: "exact", head: true })
            .eq("dataset_id", targetId);
          startOrder = count ?? 0;
          updated += 1;
        }

        const keyByIndex: (string | null)[] = [];
        const kindByKey = new Map(existing.map((column) => [column.key, column]));
        let order = existing.length;

        for (let index = 0; index < plan.mapping.length; index += 1) {
          const entry = plan.mapping[index];
          if (!entry || entry.choice === BULK_IGNORE) {
            keyByIndex.push(null);
            continue;
          }
          if (entry.choice === BULK_NEW_COLUMN) {
            const label = (entry.label || plan.header[index] || `Column ${index + 1}`).trim();
            const key = slugify(label) || `col_${index}`;
            if (!kindByKey.has(key)) {
              const sample = plan.body
                .slice(0, 20)
                .map((row) => (row[index] ?? "").trim())
                .filter(Boolean);
              const kind: DatasetColumnKind = looksLikeDates(sample) ? "date" : looksNumeric(sample) ? "number" : "text";
              await addColumn.mutateAsync({
                dataset_id: targetId,
                label,
                kind,
                sort_order: order,
              });
              order += 1;
              kindByKey.set(key, {
                id: key,
                dataset_id: targetId,
                key,
                label,
                kind,
                sort_order: order,
              });
            }
            keyByIndex.push(key);
            continue;
          }
          keyByIndex.push(entry.choice);
        }

        const inferred = dateOrdersOf(plan.body, plan.mapping.length);
        const newRows = plan.body.map((cells) => {
          const data: Record<string, unknown> = {};
          keyByIndex.forEach((key, index) => {
            if (!key) return;
            const column = kindByKey.get(key);
            const raw = (cells[index] ?? "").trim();
            data[key] = column ? castValue(column, raw, inferred[index]) : raw;
          });
          return data;
        });

        if (newRows.length) {
          await addRows.mutateAsync({ dataset_id: targetId, rows: newRows, startOrder });
          importedRows += newRows.length;
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
                  Bulk import CSV files
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
          { label: "Bulk import CSV files", icon: <UploadSimple size={16} />, onClick: () => bulkFileRef.current?.click() },
        ]}
      />
        }
        main={
      <DesignCard className="p-4 min-w-0 xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-medium text-foreground">{activeDataset?.name}</h2>
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
            <DesignButton
              variant="outlined"
              theme="primary"
              size="medium"
              icon={<UploadSimple size={16} />}
              disabled={!datasetId}
              onClick={() => csvFileRef.current?.click()}
            >
              Import CSV
            </DesignButton>
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
                  <DropdownMenuItem
                    onSelect={() => {
                      openEdit();
                    }}
                  >
                    <PencilSimple size={16} className="mr-2" />
                    Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => duplicate(true)}>
                    <Copy size={16} className="mr-2" />
                    Duplicate with data
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => duplicate(false)}>
                    <Copy size={16} className="mr-2" />
                    Duplicate structure only
                  </DropdownMenuItem>
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

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
        columns={columns.data ?? []}
        importing={importing}
        source={importSource}
        fileName={importFileName}
        onImport={handleCsvImport}
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
