import * as React from "react";
import { ArrowRight, Trash } from "@phosphor-icons/react";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { parseCsv } from "@/lib/csv";
import type { ManualDataset, ManualDatasetColumn } from "@/hooks/useManualDatasets";

export const BULK_IGNORE = "__ignore__";
export const BULK_NEW_COLUMN = "__new__";
export const BULK_NEW_DATASET = "__new_dataset__";

export interface BulkFileDraft {
  id: string;
  fileName: string;
  text: string;
  hasHeader: boolean;
  /** Existing dataset id, or BULK_NEW_DATASET to create one. */
  target: string;
  datasetName: string;
  /** Per CSV column: where it goes, and the name to use when creating a column. */
  mapping: { choice: string; label: string }[];
}

export interface BulkFilePlan extends BulkFileDraft {
  header: string[];
  body: string[][];
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const autoMatch = (header: string, columns: ManualDatasetColumn[]) => {
  const target = norm(header);
  const hit = columns.find((c) => norm(c.label) === target || norm(c.key) === target);
  return hit?.key ?? BULK_NEW_COLUMN;
};

const nameFromFile = (fileName: string) =>
  fileName
    .replace(/\.(csv|tsv|txt)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();

/** Reads a picked file into a draft with sensible defaults. */
export const draftFromFile = async (file: File): Promise<BulkFileDraft> => ({
  id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  fileName: file.name,
  text: await file.text(),
  hasHeader: true,
  target: BULK_NEW_DATASET,
  datasetName: nameFromFile(file.name) || "Imported dataset",
  mapping: [],
});

const parseDraft = (draft: BulkFileDraft) => {
  const parsed = draft.text.trim() ? parseCsv(draft.text) : [];
  const header = draft.hasHeader
    ? (parsed[0] ?? [])
    : (parsed[0] ?? []).map((_, i) => `Column ${i + 1}`);
  const body = draft.hasHeader ? parsed.slice(1) : parsed;
  return { header, body };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: BulkFileDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<BulkFileDraft[]>>;
  datasets: ManualDataset[];
  allColumns: ManualDatasetColumn[];
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
  saving,
  onAddFiles,
  onSave,
}: Props) => {
  const parsedByDraft = React.useMemo(
    () => new Map(drafts.map((draft) => [draft.id, parseDraft(draft)])),
    [drafts],
  );

  const columnsFor = (datasetId: string) =>
    datasetId === BULK_NEW_DATASET ? [] : allColumns.filter((c) => c.dataset_id === datasetId);

  const update = (id: string, patch: Partial<BulkFileDraft>) =>
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));

  // Keep the mapping in step with the parsed header and the chosen target.
  React.useEffect(() => {
    setDrafts((prev) =>
      prev.map((draft) => {
        const { header } = parseDraft(draft);
        const columns = draft.target === BULK_NEW_DATASET ? [] : allColumns.filter((c) => c.dataset_id === draft.target);
        const needsReset =
          draft.mapping.length !== header.length ||
          draft.mapping.some(
            (entry) =>
              entry.choice !== BULK_IGNORE &&
              entry.choice !== BULK_NEW_COLUMN &&
              !columns.some((column) => column.key === entry.choice),
          );
        if (!needsReset) return draft;
        return {
          ...draft,
          mapping: header.map((name, index) => ({
            choice: autoMatch(name, columns),
            label: (name || `Column ${index + 1}`).trim(),
          })),
        };
      }),
    );
  }, [drafts, allColumns, setDrafts]);

  const plans: BulkFilePlan[] = drafts.map((draft) => ({
    ...draft,
    ...(parsedByDraft.get(draft.id) ?? { header: [], body: [] }),
  }));

  const totalRows = plans.reduce((sum, plan) => sum + plan.body.length, 0);
  const valid =
    plans.length > 0 &&
    plans.every(
      (plan) =>
        plan.body.length > 0 &&
        plan.mapping.some((entry) => entry.choice !== BULK_IGNORE) &&
        (plan.target !== BULK_NEW_DATASET || plan.datasetName.trim().length > 0),
    );

  const datasetOptions = [
    { value: BULK_NEW_DATASET, label: "Create a new dataset" },
    ...datasets.map((dataset) => ({ value: dataset.id, label: `Update “${dataset.name}”` })),
  ];

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Import several CSV files"
      width="min(860px, 70vw)"
      minWidth="520px"
      footer={
        <div className="flex justify-between gap-2">
          <DesignButton variant="outlined" theme="primary" onClick={onAddFiles}>
            Add more files
          </DesignButton>
          <div className="flex gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
              Cancel
            </DesignButton>
            <DesignButton
              variant="filled"
              theme="primary"
              isLoading={saving}
              disabled={!valid}
              onClick={() => onSave(plans)}
            >
              Save all changes{totalRows ? ` (${totalRows} rows)` : ""}
            </DesignButton>
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        <DesignNote text="For each file, choose whether it creates a new dataset or adds rows to an existing one, then check how its columns line up. Nothing is saved until you save all changes." />

        {plans.map((plan, planIndex) => {
          const columns = columnsFor(plan.target);
          const isNew = plan.target === BULK_NEW_DATASET;
          return (
            <div key={plan.id} className="space-y-3">
              {planIndex > 0 && <DesignDivider />}
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[16px] font-[500] text-foreground" title={plan.fileName}>
                  {plan.fileName}
                </p>
                <button
                  type="button"
                  aria-label={`Remove ${plan.fileName}`}
                  onClick={() => setDrafts((prev) => prev.filter((d) => d.id !== plan.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-[rgba(208,69,85,0.08)] hover:text-destructive"
                >
                  <Trash size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[260px]">
                  <DesignInputSelect
                    label="Destination"
                    size="medium"
                    value={plan.target}
                    onChange={(target) => update(plan.id, { target, mapping: [] })}
                    options={datasetOptions}
                  />
                </div>
                {isNew && (
                  <div className="min-w-[240px] flex-1">
                    <DesignInputText
                      label="Dataset name"
                      value={plan.datasetName}
                      onChange={(e) => update(plan.id, { datasetName: e.target.value })}
                    />
                  </div>
                )}
                <label className="flex shrink-0 items-center gap-2 pb-2 text-[14px] text-foreground">
                  <DesignCheckbox
                    checked={plan.hasHeader}
                    onCheckedChange={(checked) =>
                      update(plan.id, { hasHeader: Boolean(checked), mapping: [] })
                    }
                  />
                  First row has column names
                </label>
              </div>

              {plan.body.length === 0 ? (
                <p className="text-[14px] text-destructive">No rows found in this file.</p>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground">
                    {plan.body.length} rows · {plan.header.length} columns
                  </p>
                  <div className="space-y-2">
                    {plan.header.map((name, index) => {
                      const entry = plan.mapping[index] ?? { choice: BULK_IGNORE, label: name };
                      const options = [
                        { value: BULK_NEW_COLUMN, label: "Create a new column" },
                        ...columns.map((column) => ({
                          value: column.key,
                          label: `Fill “${column.label}”`,
                        })),
                        { value: BULK_IGNORE, label: "Ignore this column" },
                      ];
                      const ignored = entry.choice === BULK_IGNORE;
                      return (
                        <div key={`${plan.id}-${index}`} className="flex items-center gap-2">
                          <p
                            className={`w-[26%] shrink-0 truncate text-[14px] font-[500] ${
                              ignored ? "text-muted-foreground" : "text-foreground"
                            }`}
                            title={name || `Column ${index + 1}`}
                          >
                            {name || `Column ${index + 1}`}
                          </p>
                          <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <DesignInputSelect
                              size="medium"
                              value={entry.choice}
                              onChange={(choice) =>
                                update(plan.id, {
                                  mapping: plan.mapping.map((item, i) =>
                                    i === index ? { ...item, choice } : item,
                                  ),
                                })
                              }
                              options={options}
                            />
                          </div>
                          {entry.choice === BULK_NEW_COLUMN && (
                            <div className="w-[30%] shrink-0">
                              <DesignInputText
                                placeholder="New column name"
                                value={entry.label}
                                onChange={(e) =>
                                  update(plan.id, {
                                    mapping: plan.mapping.map((item, i) =>
                                      i === index ? { ...item, label: e.target.value } : item,
                                    ),
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </DesignSideSheet>
  );
};

export default BulkCsvImportSheet;
