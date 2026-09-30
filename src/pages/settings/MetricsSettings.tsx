import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowSquareOut,
  BookOpenText,
  Copy,
  GearSix,
  Plus,
  PencilSimple,
  PuzzlePiece,
  SquaresFour,
  TrendUp,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignNote } from "@/components/ds/DesignNote";
import { SourceSection, SourceListItem } from "@/components/settings/source/SourceCard";
import { SortableList } from "@/components/settings/SortableList";
import NumberBlockSheet from "@/components/settings/metrics/NumberBlockSheet";
import QualitativeBlockSheet, { StatusBadge } from "@/components/settings/metrics/QualitativeBlockSheet";
import TabSheet from "@/components/settings/metrics/TabSheet";
import { useToast } from "@/hooks/use-toast";
import { byTabOrder, useManualMetrics, type ManualMetric } from "@/hooks/useManualMetrics";
import {
  groupTree,
  metricGroupId,
  slugifyGroup,
  useMetricGroups,
  useReorder,
  PERIODICITY_OPTIONS,
  type MetricGroup,
} from "@/hooks/useMetricGroups";
import { aggregateDataset, comparePeriods, useDatasetRows, useManualDatasets } from "@/hooks/useManualDatasets";
import { useDynamicMetricSeries, useDynamicSourceLabel } from "@/hooks/useDynamicMetricSeries";
import { useQualitativeSources, type QualitativeSource } from "@/hooks/useQualitative";
import { useDataSourceConfigs } from "@/hooks/useDataSources";
import { findDynamicField } from "@/lib/dynamicMetricSources";
import { canHaveSubTabs, isBuiltInTab, tabIsShown, tabPath } from "@/lib/metricTabs";

const TAB_ICONS: Record<string, PhosphorIcon> = {
  impact: TrendUp,
  adoption: PuzzlePiece,
  documentation: BookOpenText,
};

const formatValue = (value: number, unit: string) => {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${rounded}${unit === "%" ? "%" : ` ${unit}`}` : rounded;
};

/** Where a Number block reads from, and its latest value. */
const NumberSummary = ({ metric }: { metric: ManualMetric }) => {
  const datasets = useManualDatasets();
  const isDynamic = metric.source_type === "dynamic";
  const rows = useDatasetRows(!isDynamic ? metric.dataset_id ?? undefined : undefined);
  const dynamic = useDynamicMetricSeries(isDynamic ? metric.source_key : undefined, isDynamic ? metric.source_field : undefined);
  const sourceLabel = useDynamicSourceLabel(metric.source_key ?? "");

  const points = isDynamic
    ? dynamic.points
    : metric.dataset_id && metric.value_column && metric.period_column
      ? aggregateDataset(rows.data ?? [], metric)
      : [];
  const latest = [...points].sort((a, b) => comparePeriods(b.period, a.period))[0];

  const from = isDynamic
    ? `${sourceLabel} · ${findDynamicField(metric.source_key, metric.source_field)?.label ?? metric.source_field}`
    : metric.dataset_id
      ? `${datasets.data?.find((d) => d.id === metric.dataset_id)?.name ?? "Dataset"} · ${metric.value_column || "no column"}`
      : "Not linked to any data yet";
  const value = latest
    ? `${formatValue(latest.value, metric.unit)} in ${latest.period}`
    : dynamic.isLoading || rows.isLoading
      ? "Loading…"
      : "No values yet";
  return <>{`${from} · ${value}`}</>;
};

/** Every block on one tab, in order, with what's managed elsewhere listed below. */
const TabBlocks = ({ tab, all }: { tab: MetricGroup; all: MetricGroup[] }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const datasets = useManualDatasets();
  const configs = useDataSourceConfigs();
  const reorderMetrics = useReorder("manual_metrics");
  const reorderQualitative = useReorder("qualitative_sources");

  const [numberSheet, setNumberSheet] = React.useState<{ metric: ManualMetric | null; duplicate?: boolean } | null>(null);
  const [qualitativeSheet, setQualitativeSheet] = React.useState<{ source: QualitativeSource | null } | null>(null);

  const topLevel = !tab.parent_id;
  const numbers = (metrics.data ?? [])
    .filter((m) => !m.archived && metricGroupId(all, m) === tab.id)
    .sort(byTabOrder);
  const insights = topLevel ? (qualitative.data ?? []).filter((q) => q.group_name === tab.name) : [];

  const saveOrder = (save: (ids: string[]) => Promise<void>) => async (ids: string[]) => {
    try {
      await save(ids);
    } catch (err) {
      toast({ title: "Could not reorder", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  // Placed from Settings → Dynamic sources for now ("Shown in").
  const config = (key: string) =>
    ((configs.data ?? []).find((c) => c.source_key === key)?.config ?? {}) as Record<string, unknown>;
  const figmaHere = config("figma").metricGroupId === tab.id;
  const figmaLibraries = Array.isArray(config("figma").libraries) ? (config("figma").libraries as unknown[]).length : 0;
  const reportsHere = (
    Array.isArray(config("code_adoption").reports)
      ? (config("code_adoption").reports as { path?: string; metricGroupId?: string | null }[])
      : []
  ).filter((r) => r.metricGroupId === tab.id);
  const ga4Properties =
    tab.slug === "documentation" && Array.isArray(config("ga4_documentation").properties)
      ? (config("ga4_documentation").properties as { id: string; name?: string }[])
      : [];
  const panels = [
    ...(figmaHere
      ? [
          {
            key: "figma",
            title: "Figma component analytics",
            subtitle: `Component tables and adoption for ${figmaLibraries} ${figmaLibraries === 1 ? "library" : "libraries"}`,
          },
        ]
      : []),
    ...reportsHere.map((r) => {
      const repo = (r.path?.split("/").pop() ?? "").replace(/(-report)?\.json$/, "");
      return { key: `code:${r.path}`, title: `Code adoption · ${repo}`, subtitle: "Bloom usage by team, from the weekly GitHub report" };
    }),
    ...ga4Properties.map((p) => ({
      key: `ga4:${p.id}`,
      title: `Google Analytics · ${p.name || p.id}`,
      subtitle: "Traffic and top pages, as its own sub-tab",
    })),
  ];

  return (
    <>
      <SourceSection
        title="Numbers"
        description="Stat cards, in this order, with their trend and breakdowns below them."
        aside={
          <DesignButton
            variant="flat"
            theme="primary"
            size="small"
            icon={<Plus size={16} />}
            onClick={() => setNumberSheet({ metric: null })}
          >
            Add number
          </DesignButton>
        }
      >
        {metrics.isLoading ? (
          <DesignLoader />
        ) : numbers.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No numbers on this tab yet.</p>
        ) : (
          <ul className="flex flex-col">
            <SortableList
              items={numbers}
              getId={(m) => m.id}
              getLabel={(m) => m.name}
              onReorder={saveOrder(reorderMetrics.mutateAsync)}
            >
              {(metric, row) => (
              <SourceListItem
                key={metric.id}
                sortable={row}
                title={metric.name}
                subtitle={<NumberSummary metric={metric} />}
                actions={
                  <>
                    <DesignButton
                      variant="flat"
                      theme="muted"
                      size="small"
                      aria-label={`Duplicate ${metric.name}`}
                      icon={<Copy size={16} />}
                      onClick={() => setNumberSheet({ metric, duplicate: true })}
                    />
                    <DesignButton
                      variant="flat"
                      theme="muted"
                      size="small"
                      icon={<GearSix size={16} />}
                      onClick={() => setNumberSheet({ metric })}
                    >
                      Configure
                    </DesignButton>
                  </>
                }
              />
              )}
            </SortableList>
          </ul>
        )}
      </SourceSection>

      <SourceSection
        title="Qualitative insights"
        description={
          topLevel
            ? "Themes found in free-text answers, shown under the numbers."
            : "Qualitative insights show on top-level tabs only, for now."
        }
        aside={
          topLevel && (
            <DesignButton
              variant="flat"
              theme="primary"
              size="small"
              icon={<Plus size={16} />}
              onClick={() => setQualitativeSheet({ source: null })}
            >
              Add insight
            </DesignButton>
          )
        }
      >
        {!topLevel ? null : insights.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">No qualitative insights on this tab yet.</p>
        ) : (
          <ul className="flex flex-col">
            <SortableList
              items={insights}
              getId={(q) => q.id}
              getLabel={(q) => q.name}
              onReorder={saveOrder(reorderQualitative.mutateAsync)}
            >
              {(source, row) => (
              <SourceListItem
                key={source.id}
                sortable={row}
                title={source.name}
                subtitle={`Summarising “${source.text_column}” from ${
                  datasets.data?.find((d) => d.id === source.dataset_id)?.name ?? "a dataset"
                }${source.breakdowns.length ? `, by ${source.breakdowns.map((b) => b.label.toLowerCase()).join(" and ")}` : ""}`}
                actions={
                  <>
                    <StatusBadge status={source.run_status} />
                    <DesignButton
                      variant="flat"
                      theme="muted"
                      size="small"
                      icon={<GearSix size={16} />}
                      onClick={() => setQualitativeSheet({ source })}
                    >
                      Configure
                    </DesignButton>
                  </>
                }
              />
              )}
            </SortableList>
          </ul>
        )}
      </SourceSection>

      {panels.length > 0 && (
        <SourceSection
          title="Source panels"
          description="Richer views that come with a live source. Placed from Settings → Dynamic sources for now."
          aside={
            <DesignButton
              variant="flat"
              theme="muted"
              size="small"
              icon={<ArrowSquareOut size={16} />}
              onClick={() => navigate("/settings/data-sources")}
            >
              Dynamic sources
            </DesignButton>
          }
        >
          <ul className="flex flex-col">
            {panels.map((panel) => (
              <SourceListItem key={panel.key} title={panel.title} subtitle={panel.subtitle} />
            ))}
          </ul>
        </SourceSection>
      )}

      <NumberBlockSheet
        open={Boolean(numberSheet)}
        onOpenChange={(open) => !open && setNumberSheet(null)}
        metric={numberSheet?.metric ?? null}
        duplicate={numberSheet?.duplicate}
        tabId={tab.id}
        sortOrder={numbers.length}
      />
      <QualitativeBlockSheet
        open={Boolean(qualitativeSheet)}
        onOpenChange={(open) => !open && setQualitativeSheet(null)}
        source={qualitativeSheet?.source ?? null}
        tabName={tab.name}
        sortOrder={insights.length}
      />
    </>
  );
};

/** The tabs of the Metrics section, as a tree mirroring its menu. Drag to reorder. */
const TabTree = ({
  all,
  selectedId,
  onSelect,
  onAdd,
  onReorder,
  counts,
}: {
  all: MetricGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (ids: string[]) => Promise<void>;
  counts: (group: MetricGroup) => number;
}) => {
  const rowClass = (selected: boolean, child = false) =>
    `flex items-center gap-3 px-3 ${child ? "py-1.5" : "py-2"} rounded-[6px] text-sm transition-colors w-full text-left min-w-0 ${
      selected
        ? "text-[var(--primary-extra-dark)] font-medium bg-[rgba(0,119,130,0.08)]"
        : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
    }`;
  const count = (group: MetricGroup) => (
    <span className="text-[12px] text-muted-foreground font-normal">{counts(group) || ""}</span>
  );
  const tree = groupTree(all);
  return (
    <DesignCard className="p-2">
      <p className="px-3 pt-2 pb-1 text-[12px] text-muted-foreground">Metrics tabs</p>
      <div className="flex flex-col gap-0.5">
        <SortableList items={tree} getId={(t) => t.group.id} getLabel={(t) => t.group.name} onReorder={onReorder}>
          {({ group, children }, row) => {
            const Icon = TAB_ICONS[group.slug] ?? SquaresFour;
            return (
              <div key={group.id} ref={row.ref} style={row.style} className="rounded-[6px]">
                <div className="flex items-center gap-0.5">
                  {row.handle}
                  <button type="button" className={rowClass(group.id === selectedId)} onClick={() => onSelect(group.id)}>
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate">{group.name}</span>
                    {count(group)}
                  </button>
                </div>
                {children.length > 0 && (
                  <div className="ml-[43px] mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-border pl-1">
                    <SortableList items={children} getId={(c) => c.id} getLabel={(c) => c.name} onReorder={onReorder}>
                      {(child, childRow) => (
                        <div key={child.id} ref={childRow.ref} style={childRow.style} className="flex items-center gap-0.5 rounded-[6px]">
                          {childRow.handle}
                          <button
                            type="button"
                            className={rowClass(child.id === selectedId, true)}
                            onClick={() => onSelect(child.id)}
                          >
                            <span className="flex-1 truncate">{child.name}</span>
                            {count(child)}
                          </button>
                        </div>
                      )}
                    </SortableList>
                  </div>
                )}
              </div>
            );
          }}
        </SortableList>
        <button type="button" className={`${rowClass(false)} pl-[37px]`} onClick={onAdd}>
          <Plus size={16} className="shrink-0" />
          <span className="flex-1">Add tab</span>
        </button>
      </div>
    </DesignCard>
  );
};

const MetricsConfigurator = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const groups = useMetricGroups();
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const reorderTabs = useReorder("metric_groups");
  const { toast } = useToast();
  const all = React.useMemo(() => groups.data ?? [], [groups.data]);
  const [tabSheet, setTabSheet] = React.useState<{ group: MetricGroup | null; parentId?: string } | null>(null);

  // The selected tab is kept in the URL (?tab=<slug>) so it survives a reload and can be linked.
  const selected = all.find((g) => g.slug === params.get("tab")) ?? groupTree(all)[0]?.group;
  const select = (id: string) => {
    const slug = all.find((g) => g.id === id)?.slug;
    if (slug) setParams({ tab: slug }, { replace: true });
  };

  const counts = (group: MetricGroup) =>
    (metrics.data ?? []).filter((m) => !m.archived && metricGroupId(all, m) === group.id).length +
    (group.parent_id ? 0 : (qualitative.data ?? []).filter((q) => q.group_name === group.name).length);

  const reorder = async (ids: string[]) => {
    try {
      await reorderTabs.mutateAsync(ids);
    } catch (err) {
      toast({ title: "Could not reorder", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const parent = selected?.parent_id ? all.find((g) => g.id === selected.parent_id) : undefined;
  const periodicity = PERIODICITY_OPTIONS.find((o) => o.value === (parent ?? selected)?.periodicity)?.label ?? "Quarterly";

  return (
    <>
      {groups.isLoading ? (
        <DesignLoader />
      ) : all.length === 0 ? (
        <DesignCard className="p-4">
          <DesignEmptyState
            title="Set up your first tab"
            body="Each tab is an item in the Metrics menu, such as Impact or Adoption. Add numbers and qualitative insights to it."
            action={
              <DesignButton variant="filled" theme="primary" onClick={() => setTabSheet({ group: null })}>
                Add tab
              </DesignButton>
            }
          />
        </DesignCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start max-w-[1200px]">
          <TabTree
            all={all}
            selectedId={selected?.id ?? ""}
            onSelect={select}
            onAdd={() => setTabSheet({ group: null })}
            onReorder={reorder}
            counts={counts}
          />
          {selected && (
            <DesignCard className="p-4 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-1">
                    <h2 className="text-[16px] font-medium text-foreground">
                      {parent ? `${parent.name} › ${selected.name}` : selected.name}
                    </h2>
                    <DesignButton
                      variant="flat"
                      theme="muted"
                      size="small"
                      className="min-h-[28px] h-7 w-7 px-0"
                      aria-label={`Edit ${selected.name}`}
                      title="Edit name, description and frequency"
                      icon={<PencilSimple size={16} />}
                      onClick={() => setTabSheet({ group: selected })}
                    />
                  </div>
                  <p className="text-[14px] text-muted-foreground mt-1">
                    {[selected.description, `${periodicity} periods`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!selected.parent_id && canHaveSubTabs(selected.slug) && (
                    <DesignButton
                      variant="outlined"
                      theme="muted"
                      size="small"
                      icon={<Plus size={16} />}
                      onClick={() => setTabSheet({ group: null, parentId: selected.id })}
                    >
                      Sub-tab
                    </DesignButton>
                  )}
                  {tabIsShown(selected, all) && (
                    <DesignButton
                      variant="outlined"
                      theme="primary"
                      size="small"
                      icon={<ArrowSquareOut size={16} />}
                      onClick={() => navigate(tabPath(selected, all))}
                    >
                      Open tab
                    </DesignButton>
                  )}
                </div>
              </div>
              {!tabIsShown(selected, all) && (
                <>
                  <DesignSpacer size="small" />
                  <DesignNote text={`The ${parent?.name} page doesn't show sub-tabs yet, so this one isn't visible on the Metrics side.`} />
                </>
              )}
              {!isBuiltInTab((parent ?? selected).slug) && !selected.parent_id && (
                <>
                  <DesignSpacer size="small" />
                  <DesignNote text="Uses the standard tab layout: stat cards, trend chart, breakdowns, then qualitative insights." />
                </>
              )}
              <TabBlocks key={selected.id} tab={selected} all={all} />
            </DesignCard>
          )}
        </div>
      )}

      <TabSheet
        open={Boolean(tabSheet)}
        onOpenChange={(open) => !open && setTabSheet(null)}
        group={tabSheet?.group ?? null}
        parentId={tabSheet?.parentId}
        onSaved={(name) => {
          // Select a newly created tab once the list refreshes.
          if (!tabSheet?.group) setParams({ tab: slugifyGroup(name) }, { replace: true });
        }}
        onDeleted={() => setParams({}, { replace: true })}
      />
    </>
  );
};

const MetricsSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <DesignPageHeader
        title="Metrics"
        subtitle="Set up the tabs of the Metrics section and what each one shows: numbers from datasets or live sources, and qualitative insights."
      />
      <DesignSpacer size="medium" />
      <MetricsConfigurator />
    </AppShell>
  </RequireRole>
);

export default MetricsSettings;
