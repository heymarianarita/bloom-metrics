import * as React from "react";
import { Trash } from "@phosphor-icons/react";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { parseCsv } from "@/lib/csv";
import { readTableFile } from "@/lib/spreadsheetFile";
import type { DatasetColumnKind, ManualDataset, ManualDatasetColumn } from "@/hooks/useManualDatasets";
import type { DateOrder } from "../../../server/shared/dates.ts";
import ColumnMatchBoard from "./ColumnMatchBoard";
import { NEW_COLUMN, autoMatch, blockers, planImport, type ImportPlan, type MetricUse } from "./importPlan";

export const BULK_NEW_DATASET = "__new_dataset__";

export interface BulkFileDraft {
  id: string;
  fileName: string;
  text: string;
  hasHeader: boolean;
  /** Existing dataset id, or BULK_NEW_DATASET to create one. */
  target: string;
  datasetName: string;
  /** Same choices as a single-file import (see ImportChoices); empty until the header is known. */
  mapping: string[];
  newKinds: (DatasetColumnKind | null)[];
  dateOrders: (DateOrder | null)[];
  fixed: Record<string, string>;
}

export interface BulkFilePlan {
  draft: BulkFileDraft;
  header: string[];
  body: string[][];
  plan: ImportPlan;
}

const nameFromFile = (fileName: string) =>
  fileName
    .replace(/\.(csv|tsv|txt|xlsx)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();

/** Reads a picked file into a draft with sensible defaults. */
export const draftFromFile = async (file: File): Promise<BulkFileDraft> => {
  const { text, sheetName } = await readTableFile(file);
  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName: sheetName ? `${file.name} (${sheetName})` : file.name,
    text,
    hasHeader: true,
    target: BULK_NEW_DATASET,
    datasetName: nameFromFile(file.name) || "Imported dataset",
    mapping: [],
    newKinds: [],
    dateOrders: [],
    fixed: {},
  };
};

const parseDraft = (draft: BulkFileDraft) => {
  const parsed = draft.text.trim() ? parseCsv(draft.text) : [];
  const header = draft.hasHeader
    ? (parsed[0] ?? [])
    : (parsed[0] ?? []).map((_, i) => `Column ${i + 1}`);
  const body = draft.hasHeader ? parsed.slice(1) : parsed;
  return { header, body };
};

/** A new dataset takes every column of the file; an existing one takes the columns whose names match. */
const initialMapping = (header: string[], columns: ManualDatasetColumn[], isNew: boolean) =>
  header.map((name) => (isNew ? NEW_COLUMN : autoMatch(name, columns)));

const NO_METRICS: MetricUse = { period: [], filters: [] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: BulkFileDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<BulkFileDraft[]>>;
  datasets: ManualDataset[];
  allColumns: ManualDatasetColumn[];
  /** Columns an existing dataset's metrics group and filter by. */
  metricUseFor: (datasetId: string) => MetricUse;
  saving?: boolean;
  onAddFiles: () => void;
  onSave: (plans: BulkFilePlan[]) => void;
}

const BulkCsvImportSheet = ({
  open,
  onOpenChange,
  drafts,
  setDrafts,
  datasets,
  allColumns,
  metricUseFor,
  saving,
  onAddFiles,
  onSave,
}: Props) => {
  const columnsFor = React.useCallback(
    (datasetId: string) =>
      datasetId === BULK_NEW_DATASET ? [] : allColumns.filter((c) => c.dataset_id === datasetId),
    [allColumns],
  );

  const update = (id: string, patch: Partial<BulkFileDraft>) =>
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));

  /** Choices start again whenever the file's columns or the destination change. */
  const resetChoices = (draft: BulkFileDraft, patch: Partial<BulkFileDraft>): Partial<BulkFileDraft> => {
    const next = { ...draft, ...patch };
    const { header } = parseDraft(next);
    return {
      ...patch,
      mapping: initialMapping(header, columnsFor(next.target), next.target === BULK_NEW_DATASET),
      newKinds: [],
      dateOrders: [],
      fixed: {},
    };
  };

  // Files just added have no choices yet.
  React.useEffect(() => {
    if (!drafts.some((d) => d.mapping.length === 0 && parseDraft(d).header.length > 0)) return;
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.mapping.length > 0) return draft;
        const { header } = parseDraft(draft);
        return { ...draft, mapping: initialMapping(header, columnsFor(draft.target), draft.target === BULK_NEW_DATASET) };
      }),
    );
  }, [drafts, columnsFor, setDrafts]);

  const plans = React.useMemo(
    () =>
      drafts.map((draft): BulkFilePlan & { reasons: string[] } => {
        const { header, body } = parseDraft(draft);
        const use = draft.target === BULK_NEW_DATASET ? NO_METRICS : metricUseFor(draft.target);
        const plan = planImport(columnsFor(draft.target), header, body, draft, use);
        return { draft, header, body, plan, reasons: blockers(plan, body.length) };
      }),
    [drafts, columnsFor, metricUseFor],
  );

  const totalRows = plans.reduce((sum, p) => sum + p.body.length, 0);
  const firstProblem = plans
    .map((p) =>
      p.draft.target === BULK_NEW_DATASET && !p.draft.datasetName.trim()
        ? `${p.draft.fileName}: give the new dataset a name.`
        : p.reasons[0] && `${p.draft.fileName}: ${p.reasons[0]}`,
    )
    .find(Boolean);
  const valid = plans.length > 0 && !firstProblem;

  const datasetOptions = [
    { value: BULK_NEW_DATASET, label: "Create a new dataset" },
    ...datasets.map((dataset) => ({ value: dataset.id, label: `Update “${dataset.name}”` })),
  ];

  const setAt = <T,>(draft: BulkFileDraft, field: "mapping" | "newKinds" | "dateOrders", index: number, value: T) => {
    const next = [...(draft[field] as T[])];
    next[index] = value;
    update(draft.id, { [field]: next });
  };

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Import several files"
      width="min(960px, 86vw)"
      minWidth="560px"
      className="sm:max-w-none"
      footer={
        <div className="flex items-center justify-end gap-3">
          {firstProblem && <p className="mr-auto min-w-0 truncate text-xs text-destructive">{firstProblem}</p>}
          <DesignButton variant="outlined" theme="primary" onClick={onAddFiles}>
            Add more files
          </DesignButton>
          <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
            Cancel
          </DesignButton>
          <DesignButton variant="filled" theme="primary" isLoading={saving} disabled={!valid} onClick={() => onSave(plans)}>
            Save all changes{totalRows ? ` (${totalRows} rows)` : ""}
          </DesignButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        <DesignNote text="For each file, choose whether it creates a new dataset or adds rows to an existing one, then match its columns. Nothing is saved until you save all changes." />

        {plans.map(({ draft, header, body, plan }, planIndex) => {
          const isNew = draft.target === BULK_NEW_DATASET;
          const target = datasets.find((d) => d.id === draft.target);
          return (
            <div key={draft.id} className="space-y-4">
              {planIndex > 0 && <DesignDivider />}
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-foreground" title={draft.fileName}>
                  <span className="font-medium">{draft.fileName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {body.length} {body.length === 1 ? "row" : "rows"}
                  </span>
                </p>
                <button
                  type="button"
                  aria-label={`Remove ${draft.fileName}`}
                  onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== draft.id))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[rgba(208,69,85,0.08)] hover:text-destructive"
                >
                  <Trash size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[260px]">
                  <DesignInputSelect
                    label="Destination"
                    size="medium"
                    value={draft.target}
                    onChange={(value) => update(draft.id, resetChoices(draft, { target: value }))}
                    options={datasetOptions}
                  />
                </div>
                {isNew && (
                  <div className="min-w-[240px] flex-1">
                    <DesignInputText
                      label="Dataset name"
                      value={draft.datasetName}
                      onChange={(e) => update(draft.id, { datasetName: e.target.value })}
                    />
                  </div>
                )}
                <label className="ml-auto flex shrink-0 items-center gap-2 pb-2 text-sm text-foreground">
                  <DesignCheckbox
                    checked={draft.hasHeader}
                    onCheckedChange={(checked) => update(draft.id, resetChoices(draft, { hasHeader: Boolean(checked) }))}
                  />
                  First row has column names
                </label>
              </div>

              {body.length === 0 ? (
                <p className="text-sm text-destructive">No rows found in this file.</p>
              ) : (
                <ColumnMatchBoard
                  datasetName={isNew ? draft.datasetName.trim() || "The new dataset" : target?.name ?? "The dataset"}
                  columns={columnsFor(draft.target)}
                  header={header}
                  body={body}
                  plan={plan}
                  metricUse={isNew ? NO_METRICS : metricUseFor(draft.target)}
                  mapping={draft.mapping}
                  onPlace={(index, to) => setAt(draft, "mapping", index, to)}
                  newKinds={draft.newKinds}
                  onNewKind={(index, kind) => setAt(draft, "newKinds", index, kind)}
                  dateOrders={draft.dateOrders}
                  onDateOrder={(index, order) => setAt(draft, "dateOrders", index, order)}
                  fixed={draft.fixed}
                  onFixed={(key, value) => update(draft.id, { fixed: { ...draft.fixed, [key]: value } })}
                />
              )}
            </div>
          );
        })}
      </div>
    </DesignSideSheet>
  );
};

export default BulkCsvImportSheet;
