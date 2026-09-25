import * as React from "react";
import { Plus, PencilSimple, Trash, Copy } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignDataTable, type DataTableColumn, type SortDirection } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignTabs } from "@/components/ds/DesignTabs";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { useToast } from "@/hooks/use-toast";
import {
  useManualMetrics,
  useSaveManualMetric,
  useDeleteManualMetric,

  BREAKDOWN_VIEW_OPTIONS,
  type BreakdownView,
  type ManualMetric,
} from "@/hooks/useManualMetrics";
import {
  useDeleteMetricGroup,
  useMetricGroups,
  useSaveMetricGroup,
  PERIODICITY_OPTIONS,
  type MetricGroup,
  type Periodicity,
} from "@/hooks/useMetricGroups";
import {
  aggregateDataset,
  comparePeriods,
  useDatasetColumns,
  useDatasetRows,
  useManualDatasets,
} from "@/hooks/useManualDatasets";
import { useDynamicMetricSeries } from "@/hooks/useDynamicMetricSeries";
import { DYNAMIC_METRIC_SOURCES, findDynamicField, findDynamicSource } from "@/lib/dynamicMetricSources";

const slugifyMetric = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const aggregationOptions = [
  { value: "sum", label: "Total of all rows" },
  { value: "avg", label: "Average of rows" },
  { value: "latest", label: "Last row entered" },
  { value: "count", label: "Number of rows" },
];

/* ─────────── Groups tab ─────────── */

const GroupsTab = () => {
  const { toast } = useToast();
  const groups = useMetricGroups();
  const metrics = useManualMetrics();
  const saveGroup = useSaveMetricGroup();
  const deleteGroup = useDeleteMetricGroup();

  const [sheet, setSheet] = React.useState(false);
  const [draft, setDraft] = React.useState<{
    id?: string;
    name: string;
    description: string;
    periodicity: Periodicity;
  }>({
    name: "",
    description: "",
    periodicity: "quarterly",
  });

  const openNew = () => {
    setDraft({ name: "", description: "", periodicity: "quarterly" });
    setSheet(true);
  };

  const openEdit = (group: MetricGroup) => {
    setDraft({
      id: group.id,
      name: group.name,
      description: group.description,
      periodicity: group.periodicity ?? "quarterly",
    });
    setSheet(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return;
    try {
      await saveGroup.mutateAsync({
        id: draft.id,
        name: draft.name,
        description: draft.description,
        periodicity: draft.periodicity,
        sort_order: draft.id
          ? groups.data?.find((g) => g.id === draft.id)?.sort_order ?? 0
          : groups.data?.length ?? 0,
      });
      setSheet(false);
      toast({ title: draft.id ? "Group updated" : "Group created" });
    } catch (err) {
      toast({ title: "Could not save the group", description: String(err), variant: "destructive" });
    }
  };

  const countFor = (group: MetricGroup) =>
    (metrics.data ?? []).filter((m) => m.surface === group.name).length;

  const columns: DataTableColumn<MetricGroup>[] = [
    { key: "name", header: "Group", width: "1fr", render: (row) => row.name },
    {
      key: "description",
      header: "Description",
      width: "1.6fr",
      render: (row) => row.description || "—",
    },
    {
      key: "periodicity",
      header: "Frequency",
      width: "0.8fr",
      render: (row) =>
        PERIODICITY_OPTIONS.find((o) => o.value === (row.periodicity ?? "quarterly"))?.label ?? "Quarterly",
    },
    { key: "metrics", header: "Metrics", width: "0.6fr", render: (row) => String(countFor(row)) },
    {
      key: "actions",
      header: "",
      width: "0.8fr",
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <DesignButton
            variant="flat"
            theme="primary"
            size="small"
            icon={<PencilSimple size={16} />}
            onClick={() => openEdit(row)}
          >
            Edit
          </DesignButton>
          <DesignButton
            variant="flat"
            theme="error"
            size="small"
            icon={<Trash size={16} />}
            onClick={() => {
              if (!confirm(`Delete the “${row.name}” group?`)) return;
              deleteGroup.mutate(row.id);
            }}
          >
            Delete
          </DesignButton>
        </div>
      ),
    },
  ];

  if (groups.isLoading) return <DesignLoader />;

  return (
    <>
      <DesignCard className="p-4">
        <div className="flex justify-between items-center gap-3">
          <DesignNote text="Groups are the sections metrics are reported under on the Metrics page." />
          <DesignButton
            variant="filled"
            theme="primary"
            size="medium"
            icon={<Plus size={16} />}
            onClick={openNew}
          >
            New group
          </DesignButton>
        </div>
        <DesignSpacer size="small" />
        {(groups.data ?? []).length === 0 ? (
          <DesignEmptyState
            title="No groups yet"
            body="Create a group such as Impact or Adoption, then assign metrics to it."
            action={
              <DesignButton variant="filled" theme="primary" onClick={openNew}>
                Create first group
              </DesignButton>
            }
          />
        ) : (
          <DesignDataTable columns={columns} data={groups.data ?? []} rowKey={(row) => row.id} />
        )}
      </DesignCard>

      <DesignSideSheet
        open={sheet}
        onOpenChange={setSheet}
        title={draft.id ? `Edit — ${draft.name}` : "New group"}
        footer={
          <div className="flex justify-end gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => setSheet(false)}>
              Cancel
            </DesignButton>
            <DesignButton variant="filled" theme="primary" isLoading={saveGroup.isPending} onClick={save}>
              Save group
            </DesignButton>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <DesignInputText
            label="Name"
            placeholder="Adoption"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <DesignInputText
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <DesignInputSelect
            label="Benchmark frequency"
            value={draft.periodicity}
            onChange={(value) => setDraft({ ...draft, periodicity: value as Periodicity })}
            options={PERIODICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
      </DesignSideSheet>
    </>
  );
};

/* ─────────── Metrics tab ─────────── */

const MetricsTab = () => {
  const { toast } = useToast();
  const metrics = useManualMetrics();
  const datasets = useManualDatasets();
  const groups = useMetricGroups();
  const saveMetric = useSaveManualMetric();
  const deleteMetric = useDeleteManualMetric();


  const [metricId, setMetricId] = React.useState("");
  const [metricSheet, setMetricSheet] = React.useState(false);
  const emptyDraft = {
    name: "",
    unit: "",
    surface: "",
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
  };
  const [draft, setDraft] = React.useState(emptyDraft);
  /** Set when the sheet edits an existing metric; null when creating or duplicating. */
  const [editingId, setEditingId] = React.useState<string | null>(null);


  React.useEffect(() => {
    if (!metricId && metrics.data?.length) setMetricId(metrics.data[0].id);
  }, [metrics.data, metricId]);

  const activeMetric = metrics.data?.find((m) => m.id === metricId);
  const isDynamic = activeMetric?.source_type === "dynamic";
  const activeRows = useDatasetRows(!isDynamic ? activeMetric?.dataset_id ?? undefined : undefined);
  const draftColumns = useDatasetColumns(draft.dataset_id || undefined);
  const dynamicSeries = useDynamicMetricSeries(
    isDynamic ? activeMetric?.source_key : undefined,
    isDynamic ? activeMetric?.source_field : undefined,
  );

  const results = React.useMemo(() => {
    if (isDynamic) return dynamicSeries.points;
    if (!activeMetric?.dataset_id) return [];
    return aggregateDataset(activeRows.data ?? [], {
      value_column: activeMetric.value_column,
      period_column: activeMetric.period_column,
      aggregation: activeMetric.aggregation,
    });
  }, [activeMetric, activeRows.data, isDynamic, dynamicSeries.points]);

  const [sort, setSort] = React.useState<{ key: string; direction: SortDirection }>({
    key: "period",
    direction: "desc",
  });

  const sortedResults = React.useMemo(() => {
    if (!sort.direction) return results;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((a, b) => {
      if (sort.key === "period") return factor * comparePeriods(a.period, b.period);
      if (sort.key === "value") return factor * (a.value - b.value);
      if (sort.key === "rows") return factor * (a.rows - b.rows);
      return 0;
    });
  }, [results, sort]);

  const save = async () => {
    if (!draft.name.trim()) return;
    try {
      await saveMetric.mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        name: draft.name,
        slug: slugifyMetric(draft.name),
        unit: draft.unit,
        surface: draft.surface,
        description: draft.description,
        source_type: draft.source_type as ManualMetric["source_type"],
        source_key: draft.source_type === "dynamic" ? draft.source_key : "",
        source_field: draft.source_type === "dynamic" ? draft.source_field : "",
        dataset_id: draft.source_type === "dynamic" ? null : draft.dataset_id || null,
        value_column: draft.source_type === "dynamic" ? "" : draft.value_column,
        period_column: draft.source_type === "dynamic" ? "" : draft.period_column,
        aggregation: draft.aggregation as ManualMetric["aggregation"],
        filter_columns: draft.source_type === "dynamic" ? [] : draft.filter_columns,
        breakdown_views:
          draft.source_type === "dynamic"
            ? {}
            : Object.fromEntries(
                draft.filter_columns.map((key) => [key, draft.breakdown_views[key] ?? "table"]),
              ),
      });
      setMetricSheet(false);
      setDraft(emptyDraft);
      setEditingId(null);
      toast({ title: "Metric saved" });

    } catch (err) {
      toast({ title: "Could not save metric", description: String(err), variant: "destructive" });
    }
  };

  const editMetric = (metric: ManualMetric) => {
    setDraft({
      name: metric.name,
      unit: metric.unit,
      surface: metric.surface,
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
    });
    setEditingId(metric.id);
    setMetricSheet(true);
  };

  const duplicateMetric = (metric: ManualMetric) => {
    editMetric(metric);
    setEditingId(null);
    setDraft((d) => ({ ...d, name: `${metric.name} (copy)` }));
  };


  const removeMetric = async (metric: ManualMetric) => {
    if (!window.confirm(`Delete "${metric.name}"? This also removes its recorded values.`)) return;
    try {
      await deleteMetric.mutateAsync(metric.id);
      setMetricId("");
      toast({ title: "Metric deleted" });
    } catch (err) {
      toast({ title: "Could not delete metric", description: String(err), variant: "destructive" });
    }
  };


  const resultColumns: DataTableColumn<{ period: string; value: number; rows: number }>[] = [
    { key: "period", header: "Period", sortable: true, render: (row) => row.period },
    {
      key: "value",
      header: "Value",
      render: (row) =>
        `${Number(row.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${
          activeMetric?.unit ? ` ${activeMetric.unit}` : ""
        }`,
    },
    { key: "rows", header: "Rows used", render: (row) => String(row.rows) },
  ];

  if (metrics.isLoading) return <DesignLoader />;

  const columnOptions = (draftColumns.data ?? []).map((c) => ({ value: c.key, label: c.label }));
  const groupOptions = (groups.data ?? []).map((g) => ({ value: g.name, label: g.name }));

  return (
    <>
      <DesignCard className="p-4">
        {(metrics.data ?? []).length === 0 ? (
          <DesignEmptyState
            title="No metrics yet"
            body="Create a dataset first, enter its rows, then define a metric that reads one of its columns."
            action={
              <DesignButton variant="filled" theme="primary" onClick={() => { setEditingId(null); setDraft(emptyDraft); setMetricSheet(true); }}>
                Add first metric
              </DesignButton>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[280px]">
                <DesignInputSelect
                  label="Metric"
                  size="medium"
                  value={metricId}
                  onChange={setMetricId}
                  options={(metrics.data ?? []).map((m) => ({
                    value: m.id,
                    label: m.surface ? `${m.surface} · ${m.name}` : m.name,
                  }))}
                />
              </div>
              <DesignButton
                variant="outlined"
                theme="primary"
                size="medium"
                disabled={!activeMetric}
                onClick={() => activeMetric && editMetric(activeMetric)}
              >
                Configure metric
              </DesignButton>
              <DesignButton
                variant="outlined"
                theme="primary"
                size="medium"
                icon={<Copy size={16} />}
                disabled={!activeMetric}
                onClick={() => activeMetric && duplicateMetric(activeMetric)}
              >
                Duplicate
              </DesignButton>
              <DesignButton
                variant="outlined"
                theme="error"
                size="medium"
                icon={<Trash size={16} />}
                disabled={!activeMetric}
                isLoading={deleteMetric.isPending}
                onClick={() => activeMetric && removeMetric(activeMetric)}
              >
                Delete
              </DesignButton>

              <DesignButton
                variant="filled"
                theme="primary"
                size="medium"
                icon={<Plus size={16} />}
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                  setMetricSheet(true);
                }}

              >
                New metric
              </DesignButton>
            </div>

            <DesignSpacer size="small" />

            {isDynamic && !dynamicSeries.configured ? (
              <DesignEmptyState
                title="Source not connected yet"
                body="Connect this source in Settings → Dynamic sources, then its values will show here."
              />
            ) : isDynamic && dynamicSeries.points.length === 0 && !dynamicSeries.isLoading ? (
              <DesignEmptyState
                title="No values returned yet"
                body="The connected source has not returned data for this value."
              />
            ) : !isDynamic && !activeMetric?.dataset_id ? (
              <DesignEmptyState
                title="Not linked to a dataset"
                body="Use “Configure metric” to pick the dataset, the column holding the value and how rows are combined."
              />
            ) : !isDynamic && (!activeMetric?.value_column || !activeMetric?.period_column) ? (
              <DesignEmptyState
                title="Columns not chosen yet"
                body="Pick the value column and the period column in “Configure metric”."
              />
            ) : (
              <>
                <DesignNote
                  text={
                    isDynamic
                      ? `Reading “${
                          findDynamicField(activeMetric?.source_key ?? "", activeMetric?.source_field ?? "")?.label ??
                          activeMetric?.source_field
                        }” live from ${findDynamicSource(activeMetric?.source_key ?? "")?.label ?? "the connected source"}`
                      : `Reading “${activeMetric?.value_column}” per “${activeMetric?.period_column}” from ${
                          datasets.data?.find((d) => d.id === activeMetric?.dataset_id)?.name ?? "the dataset"
                        } · ${aggregationOptions.find((o) => o.value === activeMetric?.aggregation)?.label}`
                  }
                />
                <DesignSpacer size="small" />
                <DesignDataTable
                  columns={resultColumns}
                  data={sortedResults}
                  rowKey={(row) => row.period}
                  searchPlaceholder="Search periods"
                  sortKey={sort.key}
                  sortDirection={sort.direction}
                  onSortChange={(key, direction) => setSort({ key, direction })}
                />
              </>
            )}
          </>
        )}
      </DesignCard>

      <DesignSideSheet
        open={metricSheet}
        onOpenChange={setMetricSheet}
        title={draft.name ? `Configure — ${draft.name}` : "New metric"}
        footer={
          <div className="flex justify-end gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => setMetricSheet(false)}>
              Cancel
            </DesignButton>
            <DesignButton variant="filled" theme="primary" isLoading={saveMetric.isPending} onClick={save}>
              Save metric
            </DesignButton>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <DesignInputText
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <DesignInputText
            label="Unit"
            placeholder="%, count, hours"
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          />
          <DesignInputSelect
            label="Group"
            placeholder={groupOptions.length ? "Pick a group" : "Create a group first"}
            disabled={groupOptions.length === 0}
            value={draft.surface}
            onChange={(surface) => setDraft({ ...draft, surface })}
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
              setDraft({
                ...draft,
                source_type,
                dataset_id: "",
                value_column: "",
                period_column: "",
                source_key: "",
                source_field: "",
              })
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
                placeholder="Pick a source"
                value={draft.source_key}
                onChange={(source_key) => setDraft({ ...draft, source_key, source_field: "" })}
                options={DYNAMIC_METRIC_SOURCES.map((s) => ({ value: s.key, label: s.label }))}
              />
              <DesignInputSelect
                label="Value"
                placeholder={draft.source_key ? "Pick a value" : "Pick a source first"}
                disabled={!draft.source_key}
                value={draft.source_field}
                onChange={(source_field) => setDraft({ ...draft, source_field })}
                options={(findDynamicSource(draft.source_key)?.fields ?? []).map((f) => ({
                  value: f.key,
                  label: f.label,
                }))}
              />
              <DesignNote text="Live values refresh automatically from the connected source — nothing to type in." />
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
                options={columnOptions}
              />
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
                options={aggregationOptions}
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
        </div>
      </DesignSideSheet>
    </>
  );
};

/* ─────────── Page ─────────── */

const MetricsSettings = () => {
  const [tab, setTab] = React.useState("metrics");

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="Metrics"
          subtitle="Manage the groups shown on the Metrics page and the metrics reported inside them."
        />
        <DesignSpacer size="medium" />
        <DesignTabs
          tabs={[
            { id: "metrics", label: "Metrics" },
            { id: "groups", label: "Metric groups" },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
        <DesignSpacer size="medium" />
        {tab === "groups" ? <GroupsTab /> : <MetricsTab />}
      </AppShell>
    </RequireRole>
  );
};

export default MetricsSettings;
