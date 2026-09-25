import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DatasetColumnKind = "text" | "number" | "email" | "date" | "period";

export interface ManualDataset {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  archived: boolean;
}

export interface ManualDatasetColumn {
  id: string;
  dataset_id: string;
  key: string;
  label: string;
  kind: DatasetColumnKind;
  sort_order: number;
}

export interface ManualDatasetRow {
  id: string;
  dataset_id: string;
  data: Record<string, string | number | null>;
  sort_order: number;
  updated_at: string;
}

export const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const useManualDatasets = () =>
  useQuery({
    queryKey: ["manual-datasets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_datasets")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManualDataset[];
    },
  });

export const useDatasetColumns = (datasetId?: string) =>
  useQuery({
    queryKey: ["manual-dataset-columns", datasetId ?? "none"],
    enabled: Boolean(datasetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_dataset_columns")
        .select("*")
        .eq("dataset_id", datasetId!)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManualDatasetColumn[];
    },
  });

/** Every column of every dataset — used by the bulk import flow. */
export const useAllDatasetColumns = () =>
  useQuery({
    queryKey: ["manual-dataset-columns", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_dataset_columns")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManualDatasetColumn[];
    },
  });

export const useDatasetRows = (datasetId?: string) =>
  useQuery({
    queryKey: ["manual-dataset-rows", datasetId ?? "none"],
    enabled: Boolean(datasetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_dataset_rows")
        .select("*")
        .eq("dataset_id", datasetId!)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManualDatasetRow[];
    },
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, keys: string[]) =>
  keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

export const useCreateDataset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("manual_datasets")
        .insert({
          name: input.name,
          slug: slugify(input.name) || `dataset_${Date.now()}`,
          description: input.description ?? "",
        } as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ManualDataset;
    },
    onSuccess: () => invalidate(queryClient, ["manual-datasets"]),
  });
};

/** Copies a dataset with all of its columns and rows. */
export const useDuplicateDataset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      source,
      includeRows = true,
    }: {
      source: ManualDataset;
      includeRows?: boolean;
    }) => {
      const name = `${source.name} (copy)`;
      const { data: created, error } = await supabase
        .from("manual_datasets")
        .insert({
          name,
          slug: `${slugify(name) || "dataset"}_${Date.now()}`,
          description: source.description ?? "",
        } as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const dataset = created as unknown as ManualDataset;

      const [{ data: columns }, { data: rows }] = await Promise.all([
        supabase.from("manual_dataset_columns").select("*").eq("dataset_id", source.id).order("sort_order"),
        includeRows
          ? supabase.from("manual_dataset_rows").select("*").eq("dataset_id", source.id).order("sort_order")
          : Promise.resolve({ data: [] as unknown[] }),
      ]);

      if (columns?.length) {
        const { error: colError } = await supabase.from("manual_dataset_columns").insert(
          (columns as unknown as ManualDatasetColumn[]).map((c) => ({
            dataset_id: dataset.id,
            key: c.key,
            label: c.label,
            kind: c.kind,
            sort_order: c.sort_order,
          })) as never,
        );
        if (colError) throw new Error(colError.message);
      }

      if (rows?.length) {
        const { error: rowError } = await supabase.from("manual_dataset_rows").insert(
          (rows as unknown as ManualDatasetRow[]).map((r) => ({
            dataset_id: dataset.id,
            data: r.data,
            sort_order: r.sort_order,
          })) as never,
        );
        if (rowError) throw new Error(rowError.message);
      }

      return dataset;
    },
    onSuccess: () => invalidate(queryClient, ["manual-datasets", "manual-dataset-columns", "manual-dataset-rows"]),
  });
};

export const useUpdateDataset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from("manual_datasets")
        .update({ name: input.name, description: input.description ?? "" } as never)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-datasets"]),
  });
};

export const useDeleteDataset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_datasets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-datasets", "manual-dataset-columns", "manual-dataset-rows"]),
  });
};

export const useAddDatasetColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dataset_id: string;
      label: string;
      kind: DatasetColumnKind;
      sort_order: number;
    }) => {
      const { error } = await supabase.from("manual_dataset_columns").insert({
        dataset_id: input.dataset_id,
        key: slugify(input.label) || `col_${Date.now()}`,
        label: input.label,
        kind: input.kind,
        sort_order: input.sort_order,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-columns"]),
  });
};


export const useDeleteDatasetColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_dataset_columns").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-columns"]),
  });
};

export const useAddDatasetRow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dataset_id: string; data?: Record<string, unknown>; sort_order: number }) => {
      const { error } = await supabase.from("manual_dataset_rows").insert({
        dataset_id: input.dataset_id,
        data: input.data ?? {},
        sort_order: input.sort_order,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-rows"]),
  });
};

export const useUpdateDatasetRow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("manual_dataset_rows")
        .update({ data: input.data } as never)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-rows"]),
  });
};

export const useRenameDatasetColumn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; label: string; kind?: DatasetColumnKind }) => {
      const { error } = await supabase
        .from("manual_dataset_columns")
        .update({ label: input.label, ...(input.kind ? { kind: input.kind } : {}) } as never)
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-columns"]),
  });
};

export const useAddDatasetRows = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dataset_id: string;
      rows: Record<string, unknown>[];
      startOrder: number;
    }) => {
      const payload = input.rows.map((data, index) => ({
        dataset_id: input.dataset_id,
        data,
        sort_order: input.startOrder + index,
      }));
      const { error } = await supabase.from("manual_dataset_rows").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-rows"]),
  });
};


export const useDeleteDatasetRow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_dataset_rows").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-rows"]),
  });
};

/** Removes every row of a dataset while keeping its columns and configuration. */
export const useClearDatasetRows = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datasetId: string) => {
      const { error } = await supabase
        .from("manual_dataset_rows")
        .delete()
        .eq("dataset_id", datasetId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(queryClient, ["manual-dataset-rows"]),
  });
};

/** Aggregate dataset rows into one value per period, following a metric's configuration. */
export const aggregateDataset = (
  rows: ManualDatasetRow[],
  config: { value_column: string; period_column: string; aggregation: string },
) => {
  const buckets = new Map<string, number[]>();
  rows.forEach((row) => {
    const period = String(row.data?.[config.period_column] ?? "").trim();
    if (!period) return;
    const raw = row.data?.[config.value_column];
    const num = Number(raw);
    if (!Number.isFinite(num)) return;
    buckets.set(period, [...(buckets.get(period) ?? []), num]);
  });

  return Array.from(buckets.entries())
    .map(([period, numbers]) => {
      const total = numbers.reduce((sum, n) => sum + n, 0);
      const value =
        config.aggregation === "avg"
          ? total / numbers.length
          : config.aggregation === "latest"
            ? numbers[numbers.length - 1]
            : config.aggregation === "count"
              ? numbers.length
              : total;
      return { period, value, rows: numbers.length };
    })
    .sort((a, b) => comparePeriods(b.period, a.period));
};

/** Chronological rank for a period label (date, quarter, month or year). */
export const periodRank = (period: string): number | null => {
  const value = period.trim();
  if (!value) return null;

  // 2026-Q2 / Q2 2026
  const quarter = value.match(/^(\d{4})[-\s]?Q([1-4])$/i) ?? value.match(/^Q([1-4])[-\s](\d{4})$/i);
  if (quarter) {
    const year = Number(quarter[1].length === 4 ? quarter[1] : quarter[2]);
    const q = Number(quarter[1].length === 4 ? quarter[2] : quarter[1]);
    return Date.UTC(year, (q - 1) * 3, 1);
  }

  // ISO-ish dates: 2026-03-05, 2026/03, 2026
  const iso = value.match(/^(\d{4})(?:[-/](\d{1,2}))?(?:[-/](\d{1,2}))?$/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2] ?? 1) - 1, Number(iso[3] ?? 1));

  // Two-part dates: 05/03/2026 (day-first) or 5/29/2026 (month-first).
  const dmy = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    // If the second part can't be a month, the date is month-first (US style).
    const monthFirst = second > 12 && first <= 12;
    const month = monthFirst ? first : second;
    const day = monthFirst ? second : first;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return Date.UTC(year, month - 1, day);
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Compare two period labels chronologically, falling back to text order. */
export const comparePeriods = (a: string, b: string) => {
  const ra = periodRank(a);
  const rb = periodRank(b);
  if (ra !== null && rb !== null) return ra - rb;
  if (ra !== null) return 1;
  if (rb !== null) return -1;
  return a.localeCompare(b);
};
