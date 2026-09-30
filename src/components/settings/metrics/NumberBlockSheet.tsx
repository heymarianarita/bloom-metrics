import * as React from "react";
import { Trash } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { useToast } from "@/hooks/use-toast";
import {
  useSaveManualMetric,
  useDeleteManualMetric,
  BREAKDOWN_VIEW_OPTIONS,
  SCALE_POINTS,
  type BreakdownView,
  type ManualMetric,
} from "@/hooks/useManualMetrics";
import { groupOptions as toGroupOptions, metricGroupId, useMetricGroups } from "@/hooks/useMetricGroups";
import { aggregateDataset, comparePeriods, useDatasetColumns, useDatasetRows, useManualDatasets } from "@/hooks/useManualDatasets";
import { useDynamicMetricSeries, useDynamicSourceOptions } from "@/hooks/useDynamicMetricSeries";
import { findDynamicField, findDynamicSource } from "@/lib/dynamicMetricSources";

const slugifyMetric = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AGGREGATION_OPTIONS = [
  { value: "sum", label: "Total of all rows" },
  { value: "avg", label: "Average of rows" },
  { value: "latest", label: "Last row entered" },
  { value: "count", label: "Number of rows" },
];

const emptyDraft = {
  name: "",
  unit: "",
  surface: "",
  subgroup_id: "",
  description: "",
  source_type: "dataset",
  source_key: "",
  source_field: "",
  dataset_id: "",
  value_column: "",
  period_column: "",
  aggregation: "sum",
  filter_columns: [] as string[],
  breakdown_views: {} as Record<string, BreakdownView>,
  scale_labels: {} as Record<string, string>,
};
type Draft = typeof emptyDraft;

const draftFrom = (metric: ManualMetric): Draft => ({
  name: metric.name,
  unit: metric.unit,
  surface: metric.surface,
  subgroup_id: metric.subgroup_id ?? "",
  description: metric.description,
  source_type: metric.source_type ?? "dataset",
  source_key: metric.source_key ?? "",
  source_field: metric.source_field ?? "",
  dataset_id: metric.dataset_id ?? "",
  value_column: metric.value_column,
  period_column: metric.period_column,
  aggregation: metric.aggregation,
  filter_columns: Array.isArray(metric.filter_columns) ? [...metric.filter_columns] : [],
  breakdown_views: { ...(metric.breakdown_views ?? {}) } as Record<string, BreakdownView>,
  scale_labels: { ...(metric.scale_labels ?? {}) },
});

type Row = { period: string; value: number; rows: number };

/** The values the Metrics page will show for the draft, as it's being configured. */
const ValuesPreview = ({ draft }: { draft: Draft }) => {
  const isDynamic = draft.source_type === "dynamic";
  const rows = useDatasetRows(!isDynamic ? draft.dataset_id || undefined : undefined);
  const dynamic = useDynamicMetricSeries(
    isDynamic ? draft.source_key : undefined,
    isDynamic ? draft.source_field : undefined,
  );
  const results = React.useMemo<Row[]>(() => {
    const points = isDynamic
      ? dynamic.points
      : draft.dataset_id && draft.value_column && draft.period_column
        ? aggregateDataset(rows.data ?? [], {
            value_column: draft.value_column,
            period_column: draft.period_column,
            aggregation: draft.aggregation as ManualMetric["aggregation"],
          })
        : [];
    return [...points].sort((a, b) => comparePeriods(b.period, a.period));
  }, [isDynamic, dynamic.points, rows.data, draft.dataset_id, draft.value_column, draft.period_column, draft.aggregation]);

  const ready = isDynamic ? draft.source_key && draft.source_field : draft.dataset_id && draft.value_column && draft.period_column;
  const columns: DataTableColumn<Row>[] = [
    { key: "period", header: "Period", render: (r) => r.period },
    {
      key: "value",
      header: "Value",
      render: (r) =>
        `${Number(r.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${draft.unit ? ` ${draft.unit}` : ""}`,
    },
    { key: "rows", header: "Rows used", render: (r) => String(r.rows) },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[14px] font-medium text-foreground">Values</p>
      {!ready ? (
        <p className="text-[14px] text-muted-foreground">Pick where the data comes from to preview its values.</p>
      ) : isDynamic && !dynamic.configured ? (
        <DesignEmptyState title="Source not connected yet" body="Connect it in Settings → Dynamic sources." />
      ) : results.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          {dynamic.isLoading || rows.isLoading ? "Loading…" : "No values yet."}
        </p>
      ) : (
        <DesignDataTable columns={columns} data={results} rowKey={(r) => r.period} pageSize={6} hideToolbar />
      )}
    </div>
  );
};

/**
 * Create or edit a Number block: a quantitative metric read from a dataset or a live source,
 * shown in the tab (group or subgroup) it's placed in.
 */
const NumberBlockSheet = ({
  open,
  onOpenChange,
  metric,
  duplicate = false,
  tabId,
  sortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The metric to edit (or copy, with `duplicate`); null creates a new one. */
  metric: ManualMetric | null;
  duplicate?: boolean;
  /** Tab a new metric is placed in. */
  tabId?: string;
  /** Position of a new metric within its tab. */
  sortOrder?: number;
}) => {
  const { toast } = useToast();
  const datasets = useManualDatasets();
  const groups = useMetricGroups();
  const saveMetric = useSaveManualMetric();
  const deleteMetric = useDeleteManualMetric();
  const liveSources = useDynamicSourceOptions();
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const editingId = metric && !duplicate ? metric.id : null;
  const allGroups = React.useMemo(() => groups.data ?? [], [groups.data]);

  /** Picking a subgroup files the metric under its parent group too. */
  const placement = React.useCallback(
    (id: string) => {
      const picked = allGroups.find((g) => g.id === id);
      const parent = picked?.parent_id ? allGroups.find((g) => g.id === picked.parent_id) : undefined;
      return { surface: (parent ?? picked)?.name ?? "", subgroup_id: parent ? id : "" };
    },
    [allGroups],
  );

  React.useEffect(() => {
    if (!open) return;
    if (!metric) {
      setDraft({ ...emptyDraft, ...(tabId ? placement(tabId) : {}) });
      return;
    }
    const next = draftFrom(metric);
    // Older metrics stored plain "figma", which read the first library: name it now.
    if (next.source_key === "figma") {
      next.source_key = liveSources.options.find((o) => o.value.startsWith("figma:"))?.value ?? "figma";
    }
    setDraft(duplicate ? { ...next, name: `${metric.name} (copy)` } : next);
    // Reset only when the sheet opens on a different metric.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, metric?.id, duplicate, tabId]);

  const draftColumns = useDatasetColumns(draft.dataset_id || undefined);
  const columnOptions = (draftColumns.data ?? []).map((c) => ({ value: c.key, label: c.label }));
  const valueColumnOptions = (draftColumns.data ?? []).map((c) => ({
    value: c.key,
    label: c.kind === "rating" ? `${c.label} (rating 1–5)` : c.label,
  }));
  // Score labels only make sense for a 1–5 rating column (set in the dataset's column type).
  const valueIsRating = (draftColumns.data ?? []).find((c) => c.key === draft.value_column)?.kind === "rating";
  const groupOptions = toGroupOptions(allGroups);
  // Keep an older metric's source listed even if it's no longer set up, so editing doesn't drop it.
  const liveSourceOptions =
    draft.source_key && !liveSources.options.some((o) => o.value === draft.source_key)
      ? [
          ...liveSources.options,
          { value: draft.source_key, label: `${findDynamicSource(draft.source_key)?.label ?? draft.source_key} (not set up)` },
        ]
      : liveSources.options;

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Add a name first", variant: "destructive" });
      return;
    }
    const dynamic = draft.source_type === "dynamic";
    try {
      await saveMetric.mutateAsync({
        ...(editingId ? { id: editingId } : { sort_order: sortOrder ?? 0 }),
        name: draft.name,
        slug: slugifyMetric(draft.name),
        unit: draft.unit,
        surface: draft.surface,
        subgroup_id: draft.subgroup_id || null,
        description: draft.description,
        source_type: draft.source_type as ManualMetric["source_type"],
        source_key: dynamic ? draft.source_key : "",
        source_field: dynamic ? draft.source_field : "",
        dataset_id: dynamic ? null : draft.dataset_id || null,
        value_column: dynamic ? "" : draft.value_column,
        period_column: dynamic ? "" : draft.period_column,
        aggregation: draft.aggregation as ManualMetric["aggregation"],
        filter_columns: dynamic ? [] : draft.filter_columns,
        breakdown_views: dynamic
          ? {}
          : Object.fromEntries(draft.filter_columns.map((key) => [key, draft.breakdown_views[key] ?? "table"])),
        scale_labels: valueIsRating
          ? Object.fromEntries(Object.entries(draft.scale_labels).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v))
          : {},
      });
      onOpenChange(false);
      toast({ title: "Metric saved" });
    } catch (err) {
      toast({ title: "Could not save metric", description: String(err), variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!metric || !window.confirm(`Delete "${metric.name}"? This also removes its recorded values.`)) return;
    try {
      await deleteMetric.mutateAsync(metric.id);
      onOpenChange(false);
      toast({ title: "Metric deleted" });
    } catch (err) {
      toast({ title: "Could not delete metric", description: String(err), variant: "destructive" });
    }
  };

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      minWidth="420px"
      title={editingId ? `Configure — ${metric?.name}` : "New number"}
      footer={
        <div className="flex w-full justify-between gap-2">
          <div>
            {editingId && (
              <DesignButton variant="flat" theme="error" icon={<Trash size={16} />} isLoading={deleteMetric.isPending} onClick={remove}>
                Delete
              </DesignButton>
            )}
          </div>
          <div className="flex gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
              Cancel
            </DesignButton>
            <DesignButton variant="filled" theme="primary" isLoading={saveMetric.isPending} onClick={save}>
              Save metric
            </DesignButton>
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <DesignInputText label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <DesignInputText
          label="Unit"
          placeholder="%, count, hours"
          value={draft.unit}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
        />
        <DesignInputSelect
          label="Tab"
          placeholder={groupOptions.length ? "Pick a tab" : "Create a tab first"}
          disabled={groupOptions.length === 0}
          value={metricGroupId(allGroups, draft)}
          onChange={(id) => setDraft({ ...draft, ...placement(id) })}
          options={groupOptions}
        />
        <DesignInputText
          label="Description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <DesignInputSelect
          label="Where the data comes from"
          value={draft.source_type}
          onChange={(source_type) =>
            setDraft({ ...draft, source_type, dataset_id: "", value_column: "", period_column: "", source_key: "", source_field: "" })
          }
          options={[
            { value: "dataset", label: "A dataset entered here" },
            { value: "dynamic", label: "A connected live source" },
          ]}
        />

        {draft.source_type === "dynamic" ? (
          <>
            <DesignInputSelect
              label="Live source"
              placeholder={liveSourceOptions.length ? "Pick a source" : "Nothing set up in Dynamic sources yet"}
              disabled={liveSourceOptions.length === 0}
              value={draft.source_key}
              onChange={(source_key) => setDraft({ ...draft, source_key, source_field: "" })}
              options={liveSourceOptions.map((s) => ({ value: s.value, label: s.label }))}
            />
            <DesignInputSelect
              label="Value"
              placeholder={draft.source_key ? "Pick a value" : "Pick a source first"}
              disabled={!draft.source_key}
              value={draft.source_field}
              onChange={(source_field) => {
                const unit = findDynamicField(draft.source_key, source_field)?.unit;
                setDraft({ ...draft, source_field, unit: draft.unit || unit || "" });
              }}
              options={(findDynamicSource(draft.source_key)?.fields ?? []).map((f) => ({ value: f.key, label: f.label }))}
            />
            <DesignNote
              text={
                liveSourceOptions.length
                  ? "Lists the Figma libraries, GitHub reports and Google Analytics properties set up in Settings → Dynamic sources. Values refresh automatically — nothing to type in."
                  : "Add a Figma library, a GitHub report or a Google Analytics property in Settings → Dynamic sources, then pick it here."
              }
            />
          </>
        ) : (
          <>
            <DesignInputSelect
              label="Dataset"
              placeholder="Pick a dataset"
              value={draft.dataset_id}
              onChange={(dataset_id) => setDraft({ ...draft, dataset_id, value_column: "", period_column: "" })}
              options={(datasets.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
            />
            <DesignInputSelect
              label="Value column"
              placeholder={draft.dataset_id ? "Pick a column" : "Pick a dataset first"}
              disabled={!draft.dataset_id}
              value={draft.value_column}
              onChange={(value_column) => setDraft({ ...draft, value_column })}
              options={valueColumnOptions}
            />
            {valueIsRating && (
              <div className="space-y-2">
                <p className="text-[14px] font-medium text-foreground">What each score means</p>
                <DesignNote text="Optional. Shown on the metric's card and next to the answer distribution, e.g. 4 = “Somewhat speeds me up”." />
                {SCALE_POINTS.map((point) => (
                  <DesignInputText
                    key={point}
                    size="small"
                    prefix={<span className="text-[14px] font-medium text-foreground w-4">{point}</span>}
                    aria-label={`Meaning of ${point}`}
                    placeholder={point === "1" ? "Lowest, e.g. “Much slower”" : point === "5" ? "Highest, e.g. “Over 40% faster”" : ""}
                    value={draft.scale_labels[point] ?? ""}
                    onChange={(e) => setDraft({ ...draft, scale_labels: { ...draft.scale_labels, [point]: e.target.value } })}
                  />
                ))}
              </div>
            )}
            <DesignInputSelect
              label="Period column"
              placeholder={draft.dataset_id ? "Pick a column" : "Pick a dataset first"}
              disabled={!draft.dataset_id}
              value={draft.period_column}
              onChange={(period_column) => setDraft({ ...draft, period_column })}
              options={columnOptions}
            />
            <DesignInputSelect
              label="Combine rows by"
              value={draft.aggregation}
              onChange={(aggregation) => setDraft({ ...draft, aggregation })}
              options={AGGREGATION_OPTIONS}
            />

            <div className="space-y-2">
              <p className="text-[14px] font-medium text-foreground">Columns usable as filters</p>
              <DesignNote text="Pick the columns people can filter this metric by on the Metrics page, such as Role or Business unit, and how each breakdown is shown." />
              {!draft.dataset_id ? (
                <p className="text-[14px] text-muted-foreground">Pick a dataset first.</p>
              ) : columnOptions.length === 0 ? (
                <p className="text-[14px] text-muted-foreground">This dataset has no columns yet.</p>
              ) : (
                <div className="space-y-3 pt-1">
                  {columnOptions.map((option) => {
                    const checked = draft.filter_columns.includes(option.value);
                    return (
                      <div key={option.value} className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <DesignCheckbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setDraft((prev) => ({
                                ...prev,
                                filter_columns: next
                                  ? [...prev.filter_columns, option.value]
                                  : prev.filter_columns.filter((key) => key !== option.value),
                                breakdown_views: next
                                  ? { ...prev.breakdown_views, [option.value]: prev.breakdown_views[option.value] ?? "table" }
                                  : prev.breakdown_views,
                              }))
                            }
                          />
                          <span className="text-[14px] text-foreground">{option.label}</span>
                        </label>
                        {checked && (
                          <div className="pl-8">
                            <DesignInputSelect
                              size="small"
                              className="w-[260px]"
                              value={draft.breakdown_views[option.value] ?? "table"}
                              onChange={(view) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  breakdown_views: { ...prev.breakdown_views, [option.value]: view as BreakdownView },
                                }))
                              }
                              options={BREAKDOWN_VIEW_OPTIONS}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <ValuesPreview draft={draft} />
      </div>
    </DesignSideSheet>
  );
};

export default NumberBlockSheet;
