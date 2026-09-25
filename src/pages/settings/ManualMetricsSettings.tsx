import * as React from "react";
import { Copy, DotsThree, Eraser, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignNote } from "@/components/ds/DesignNote";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DatasetGrid from "@/components/datasets/DatasetGrid";
import CsvImportSheet, { CSV_IGNORE, CSV_NEW_COLUMN, looksNumeric } from "@/components/datasets/CsvImportSheet";
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
  useManualDatasets,
  useUpdateDataset,
  useUpdateDatasetRow,
  type DatasetColumnKind,
  type ManualDatasetColumn,
  type ManualDatasetRow,
} from "@/hooks/useManualDatasets";

const slugifyMetric = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const kindOptions = [
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "text", label: "Text" },
  { value: "period", label: "Quarter (e.g. 2026-Q3)" },
];

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

  const [datasetSheet, setDatasetSheet] = React.useState(false);
  const [editSheet, setEditSheet] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState({ name: "", description: "" });
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

  const [datasetDraft, setDatasetDraft] = React.useState({ name: "", description: "" });
  const [columnDraft, setColumnDraft] = React.useState<{ label: string; kind: DatasetColumnKind }>({
    label: "",
    kind: "number",
  });

  React.useEffect(() => {
    if (!datasetId && datasets.data?.length) setDatasetId(datasets.data[0].id);
  }, [datasets.data, datasetId]);

  const activeDataset = datasets.data?.find((d) => d.id === datasetId);

  const saveDataset = async () => {
    if (!datasetDraft.name.trim()) return;
    try {
      const created = await createDataset.mutateAsync(datasetDraft);
      setDatasetId(created.id);
      setDatasetSheet(false);
      setDatasetDraft({ name: "", description: "" });
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

  const castValue = (column: ManualDatasetColumn, value: string) =>
    column.kind === "number" ? (value.trim() === "" ? null : Number(value) || 0) : value;

  const handleCsvImport = async ({
    mapping,
    header,
    body,
  }: {
    mapping: string[];
    header: string[];
    body: string[][];
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
          const kind: DatasetColumnKind = looksNumeric(sample) ? "number" : "text";
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
      const newRows = body.map((cells) => {
        const data: Record<string, unknown> = {};
        keyByIndex.forEach((key, index) => {
          if (!key) return;
          const column = kindByKey.get(key);
          const raw = (cells[index] ?? "").trim();
          data[key] = column ? castValue(column, raw) : raw;
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
              const kind: DatasetColumnKind = looksNumeric(sample) ? "number" : "text";
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

        const newRows = plan.body.map((cells) => {
          const data: Record<string, unknown> = {};
          keyByIndex.forEach((key, index) => {
            if (!key) return;
            const column = kindByKey.get(key);
            const raw = (cells[index] ?? "").trim();
            data[key] = column ? castValue(column, raw) : raw;
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

    for (let i = 0; i < block.length; i += 1) {
      const cells = block[i];
      const target = existing[rowIndex + i];
      const data: Record<string, unknown> = { ...(target?.data ?? {}) };
      cells.forEach((cell, j) => {
        const column = cols[columnIndex + j];
        if (!column) return;
        data[column.key] = castValue(column, cell.trim());
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

  return (
    <>
      <DesignCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[280px]">
            <DesignInputSelect
              label="Dataset"
              size="medium"
              value={datasetId}
              onChange={setDatasetId}
              options={(datasets.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>
          <DesignButton
            variant="outlined"
            theme="primary"
            size="medium"
            icon={<Plus size={16} />}
            onClick={() => setDatasetSheet(true)}
          >
            New dataset
          </DesignButton>
          <DesignButton
            variant="outlined"
            theme="primary"
            size="medium"
            icon={<Plus size={16} />}
            onClick={() => setColumnSheet(true)}
          >
            Add column
          </DesignButton>
          <DesignButton
            variant="filled"
            theme="primary"
            size="medium"
            icon={<Plus size={16} />}
            disabled={(columns.data ?? []).length === 0}
            onClick={() => addRow.mutate({ dataset_id: datasetId, sort_order: rows.data?.length ?? 0 })}
          >
            Add row
          </DesignButton>
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
          {bulkFileInput}
          <DesignButton
            variant="outlined"
            theme="primary"
            size="medium"
            icon={<UploadSimple size={16} />}
            onClick={() => bulkFileRef.current?.click()}
          >
            Bulk import
          </DesignButton>


          {activeDataset && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Dataset actions"
                  className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border text-foreground transition-colors hover:bg-[rgba(21,25,26,0.06)] active:bg-[rgba(21,25,26,0.04)]"
                >
                  <DotsThree size={20} weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem
                  onSelect={() => {
                    setEditDraft({
                      name: activeDataset.name,
                      description: activeDataset.description ?? "",
                    });
                    setEditSheet(true);
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

        {activeDataset?.description && (
          <>
            <DesignSpacer size="small" />
            <DesignNote text={activeDataset.description} />
          </>
        )}

        <DesignSpacer size="small" />

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
            <DesignNote text="Click any cell to edit. Use arrow keys, Tab and Enter to move around, and paste a block straight from a spreadsheet to fill several rows at once." />
            <DesignSpacer size="small" />
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
  draft: { name: string; description: string };
  setDraft: (draft: { name: string; description: string }) => void;
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
    </div>
  </DesignSideSheet>
);

/* ─────────── Page ─────────── */

const ManualMetricsSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <DesignPageHeader
        title="Datasets"
        subtitle="Enter your data here. Metrics that read from these columns are configured in Settings → Metrics."
      />
      <DesignSpacer size="medium" />
      <DatasetsTab />
    </AppShell>
  </RequireRole>
);

export default ManualMetricsSettings;
