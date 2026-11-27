import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDatasetImport, useAddDatasetRows, type DatasetImport } from "@/hooks/useManualDatasets";
import type { AddPlan } from "@/lib/getdxSync";

/**
 * Writes an "Add from GetDX" like a file import: an Import history entry, the new columns, the
 * rows tagged with the entry's id, then the changes to rows already there, so it can all be
 * undone from Import history.
 */
export const useWriteGetdxPlan = () => {
  const addRows = useAddDatasetRows();
  const queryClient = useQueryClient();
  return async (input: {
    datasetId: string;
    plan: AddPlan;
    fileName: string;
    columnCount: number;
    rowCount: number;
    /** Called as soon as the entry exists, so a failure further on can still undo it. */
    onEntry: (entry: DatasetImport) => void;
  }) => {
    const { datasetId, plan, fileName, columnCount, rowCount, onEntry } = input;
    const keys = plan.newColumns.map((c) => c.key);
    const replaced = plan.updates.map((u) => ({ row_id: u.rowId, before: u.before }));
    const id = await createDatasetImport({
      dataset_id: datasetId,
      file_name: fileName,
      row_count: plan.rows.length,
      created_columns: keys,
      replaced,
    });
    const entry: DatasetImport = {
      id,
      dataset_id: datasetId,
      file_name: fileName,
      row_count: plan.rows.length,
      created_columns: keys,
      replaced,
      undone_at: null,
      created_at: new Date().toISOString(),
    };
    onEntry(entry);
    if (plan.newColumns.length) {
      const { error } = await supabase
        .from("manual_dataset_columns")
        .insert(plan.newColumns.map((c, i) => ({ dataset_id: datasetId, key: c.key, label: c.label, kind: c.kind, sort_order: columnCount + i })) as never);
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["manual-dataset-columns"] });
    }
    if (plan.rows.length) {
      await addRows.mutateAsync({ dataset_id: datasetId, rows: plan.rows, startOrder: rowCount, import_id: id });
    }
    if (plan.updates.length) {
      const { data: current, error } = await supabase
        .from("manual_dataset_rows")
        .select("id, data")
        .in("id", plan.updates.map((u) => u.rowId));
      if (error) throw new Error(error.message);
      const byId = new Map(((current ?? []) as unknown as { id: string; data: Record<string, unknown> | null }[]).map((r) => [r.id, r.data ?? {}]));
      for (const update of plan.updates) {
        const data = byId.get(update.rowId);
        if (!data) continue;
        const { error: updateError } = await supabase
          .from("manual_dataset_rows")
          .update({ data: { ...data, ...update.set } } as never)
          .eq("id", update.rowId);
        if (updateError) throw new Error(updateError.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["manual-dataset-rows", datasetId] });
    }
    await queryClient.invalidateQueries({ queryKey: ["dataset-imports"] });
  };
};
