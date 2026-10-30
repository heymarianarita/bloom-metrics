import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Plus } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { SelectList } from "@/components/settings/SelectList";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import NumberBlockSheet from "@/components/settings/metrics/NumberBlockSheet";
import QualitativeBlockSheet, { StatusBadge } from "@/components/settings/metrics/QualitativeBlockSheet";
import { UnusedDataPanel } from "@/components/settings/metrics/UnusedDataPanel";
import { useManualMetrics, type ManualMetric } from "@/hooks/useManualMetrics";
import { useMetricGroups, useReorder } from "@/hooks/useMetricGroups";
import { aggregateDataset, comparePeriods, useDatasetRows, useManualDatasets } from "@/hooks/useManualDatasets";
import { useDynamicMetricSeries, useDynamicSourceLabel } from "@/hooks/useDynamicMetricSeries";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { useViewItems } from "@/hooks/useViewItems";
import { widgetShows, type LibraryKind } from "@/hooks/useViewLibrary";
import { findDynamicField } from "@/lib/dynamicMetricSources";

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


/** "In Adoption › Web, Impact" or "Not in any view", from where a metric is placed. */
const usePlacements = () => {
  const viewItems = useViewItems();
  const groups = useMetricGroups();
  const all = groups.data ?? [];
  const label = (id: string) => {
    const g = all.find((x) => x.id === id);
    const parent = g?.parent_id ? all.find((x) => x.id === g.parent_id) : undefined;
    return g ? (parent ? `${parent.name} › ${g.name}` : g.name) : "";
  };
  return (kind: LibraryKind, ref: string) => {
    const views = [
      ...new Set(
        (viewItems.data ?? [])
          .filter((i) => !i.hidden && (kind === "code" ? i.kind === "code" && i.ref === ref : widgetShows(i, { kind, ref, section: "" })))
          .map((i) => label(i.view_id))
          .filter(Boolean),
      ),
    ];
    return views.length ? `In ${views.join(", ")}` : "Not in any view";
  };
};

type Selection =
  | { kind: "number"; id: string }
  | { kind: "duplicate"; id: string }
  | { kind: "new-number"; datasetId?: string }
  | { kind: "insight"; id: string }
  | { kind: "new-insight" }
  | { kind: "none" };

/** What the main panel shows, kept in the URL so it survives a reload and can be linked to. */
const selectionFrom = (params: URLSearchParams): Selection => {
  if (params.get("metric")) return { kind: "number", id: params.get("metric")! };
  if (params.get("duplicate")) return { kind: "duplicate", id: params.get("duplicate")! };
  if (params.get("insight")) return { kind: "insight", id: params.get("insight")! };
  if (params.get("new") === "number") return { kind: "new-number", datasetId: params.get("dataset") ?? undefined };
  if (params.get("new") === "insight") return { kind: "new-insight" };
  return { kind: "none" };
};

const listId = (s: Selection) =>
  s.kind === "number" ? `metric:${s.id}` : s.kind === "insight" ? `insight:${s.id}` : "";

/**
 * The metric library, managed like Datasets: every metric listed on the left, the selected one
 * edited in the main panel. Which views show them, and in which order, is set in Metrics → Views.
 */
const MetricLibrary = () => {
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const placedIn = usePlacements();
  const [params, setParams] = useSearchParams();
  const selection = selectionFrom(params);
  // Cancel on an existing metric throws away the edits by re-mounting its form.
  const [resetKey, setResetKey] = React.useState(0);
  // A new metric is selected once it shows up in the list after saving.
  const [savedSlug, setSavedSlug] = React.useState<string | null>(null);

  // Both come in the order set here by dragging; Views and pages list metrics the same way.
  const numbers = (metrics.data ?? []).filter((m) => !m.archived);
  const insights = qualitative.data ?? [];
  const reorderNumbers = useReorder("manual_metrics");
  const reorderInsights = useReorder("qualitative_sources");
  const reorder = (ids: string[]) => {
    const of = (kind: string) => ids.filter((id) => id.startsWith(`${kind}:`)).map((id) => id.slice(kind.length + 1));
    const changed = (kind: string, current: string[]) => of(kind).join("|") !== current.join("|");
    return Promise.all([
      changed("metric", numbers.map((m) => m.id)) && reorderNumbers.mutateAsync(of("metric")),
      changed("insight", insights.map((q) => q.id)) && reorderInsights.mutateAsync(of("insight")),
    ]);
  };

  const items = [
    ...numbers.map((m) => ({ id: `metric:${m.id}`, label: m.name, group: "Quantitative" })),
    ...insights.map((q) => ({ id: `insight:${q.id}`, label: q.name, group: "Qualitative" })),
  ];
  const select = (id: string) => {
    const [kind, ...rest] = id.split(":");
    const ref = rest.join(":");
    setParams(
      kind === "metric" ? { metric: ref } : { insight: ref },
      { replace: true },
    );
  };

  // Nothing picked yet: show the first metric.
  React.useEffect(() => {
    if (selection.kind === "none" && items[0]) select(items[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.kind, items[0]?.id]);

  React.useEffect(() => {
    if (!savedSlug) return;
    const saved = (metrics.data ?? []).find((m) => m.slug === savedSlug);
    if (saved) {
      setSavedSlug(null);
      setParams({ metric: saved.id }, { replace: true });
    }
  }, [savedSlug, metrics.data, setParams]);

  const clear = () => setParams({}, { replace: true });
  const placement = (text: string) => <p className="text-[12px] text-muted-foreground">{text}</p>;

  const editor = (() => {
    switch (selection.kind) {
      case "number":
      case "duplicate": {
        const metric = numbers.find((m) => m.id === selection.id);
        if (!metric) return metrics.isLoading ? <DesignLoader /> : <p className="text-[14px] text-muted-foreground">This metric no longer exists.</p>;
        const duplicate = selection.kind === "duplicate";
        return (
          <>
            {!duplicate && (
              <div className="flex items-start justify-between gap-3">
                {placement(placedIn("number", metric.id))}
                <DesignButton
                  variant="flat"
                  theme="muted"
                  size="small"
                  icon={<Copy size={16} />}
                  onClick={() => setParams({ duplicate: metric.id }, { replace: true })}
                >
                  Duplicate
                </DesignButton>
              </div>
            )}
            <NumberBlockSheet
              key={`${selection.kind}:${metric.id}:${resetKey}`}
              inline
              open
              onOpenChange={(open) => {
                if (open) return;
                if (duplicate) setParams({ metric: metric.id }, { replace: true });
                else setResetKey((k) => k + 1);
              }}
              metric={metric}
              duplicate={duplicate}
              sortOrder={numbers.length}
              onSaved={(slug) => setSavedSlug(slug)}
              onDeleted={clear}
            />
          </>
        );
      }
      case "new-number":
        return (
          <NumberBlockSheet
            key={`new:${selection.datasetId ?? ""}:${resetKey}`}
            inline
            open
            onOpenChange={(open) => !open && clear()}
            metric={null}
            sortOrder={numbers.length}
            datasetId={selection.datasetId}
            onSaved={(slug) => setSavedSlug(slug)}
          />
        );
      case "insight": {
        const source = insights.find((q) => q.id === selection.id);
        if (!source) return qualitative.isLoading ? <DesignLoader /> : <p className="text-[14px] text-muted-foreground">This metric no longer exists.</p>;
        return (
          <>
            <div className="flex items-start justify-between gap-3">
              {placement(placedIn("qualitative", source.id))}
              <StatusBadge status={source.run_status} />
            </div>
            <QualitativeBlockSheet
              key={`${source.id}:${resetKey}`}
              inline
              open
              onOpenChange={(open) => !open && setResetKey((k) => k + 1)}
              source={source}
              sortOrder={insights.length}
              onDeleted={clear}
            />
          </>
        );
      }
      case "new-insight":
        return (
          <QualitativeBlockSheet
            key={`new-insight:${resetKey}`}
            inline
            open
            onOpenChange={(open) => !open && clear()}
            source={null}
            sortOrder={insights.length}
            onSaved={(id) => setParams({ insight: id }, { replace: true })}
          />
        );
      default:
        return metrics.isLoading ? <DesignLoader /> : <p className="text-[14px] text-muted-foreground">No metrics yet.</p>;
    }
  })();

  return (
    <SettingsLayout
      list={
      <SelectList
        title="All metrics"
        items={items}
        selectedId={listId(selection)}
        onSelect={select}
        onReorder={reorder}
        actions={[
          { label: "New quantitative metric", icon: <Plus size={16} />, onClick: () => setParams({ new: "number" }, { replace: true }) },
          { label: "New qualitative metric", icon: <Plus size={16} />, onClick: () => setParams({ new: "insight" }, { replace: true }) },
        ]}
      />
      }
      main={<DesignCard className="p-4 min-w-0 flex flex-col gap-3">{editor}</DesignCard>}
      context={{ title: "Unused data", subtitle: "What isn't shown on any Metrics view", content: <UnusedDataPanel /> }}
    />
  );
};

const MetricsSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <MetricLibrary />
    </AppShell>
  </RequireRole>
);

export default MetricsSettings;
