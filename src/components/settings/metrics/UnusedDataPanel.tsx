import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowSquareOut, Plus } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { useManualMetrics } from "@/hooks/useManualMetrics";
import { useManualDatasets } from "@/hooks/useManualDatasets";
import { useQualitativeSources } from "@/hooks/useQualitative";
import { AI_TEMPLATES_DATASET_SLUG } from "@/hooks/useAiTemplateMetrics";
import { useViewItems } from "@/hooks/useViewItems";
import { entryKey, KIND_BADGE, KIND_LABELS, useViewLibrary, widgetShows, type LibraryEntry } from "@/hooks/useViewLibrary";
import { reportRepo } from "../../../../server/shared/codeAdoptionCharts.ts";

/** A titled group of rows in the panel; nothing when it has no rows. */
const Section = ({ title, note, children }: { title: string; note: string; children: React.ReactNode[] }) =>
  children.length === 0 ? null : (
    <section className="py-3 border-b border-border last:border-0">
      <p className="text-sm font-medium text-foreground">
        {title} <span className="font-normal text-muted-foreground">{children.length}</span>
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
      <ul className="mt-2 flex flex-col">{children}</ul>
    </section>
  );

const Row = ({ title, subtitle, action }: { title: React.ReactNode; subtitle: string; action?: React.ReactNode }) => (
  <li className="flex items-center justify-between gap-3 py-1.5">
    <div className="min-w-0">
      <div className="text-sm text-foreground truncate">{title}</div>
      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </li>
);

/**
 * Body of the context panel on Metrics → All metrics: metrics no view shows (placed from
 * Metrics → Views) and datasets no number or insight reads. "Use" starts a number from one.
 */
export const UnusedDataPanel = () => {
  const navigate = useNavigate();
  const metrics = useManualMetrics();
  const datasets = useManualDatasets();
  const qualitative = useQualitativeSources();
  const viewItems = useViewItems();
  const library = useViewLibrary();

  // Shown somewhere: placed in a view and not hidden there. A code report counts as one row
  // while none of its parts is shown.
  const shown = (e: LibraryEntry) => (viewItems.data ?? []).some((i) => !i.hidden && widgetShows(i, e));
  const unshown: { key: string; entry: LibraryEntry; title: string }[] = [];
  for (const e of library.entries.filter((e) => !shown(e))) {
    if (e.kind === "code") {
      const parts = library.entries.filter((x) => x.kind === "code" && x.ref === e.ref);
      if (parts.every((p) => !shown(p))) {
        if (!unshown.some((u) => u.entry.kind === "code" && u.entry.ref === e.ref)) {
          unshown.push({ key: `code:${e.ref}`, entry: e, title: `Code adoption · ${reportRepo(e.ref)}` });
        }
        continue;
      }
    }
    unshown.push({ key: entryKey(e), entry: e, title: e.title });
  }

  // A dataset counts as used when a number or a qualitative insight reads it; the AI
  // prototyping page reads its own dataset directly.
  const usedDatasets = new Set([
    ...(metrics.data ?? []).filter((m) => m.dataset_id).map((m) => m.dataset_id),
    ...(qualitative.data ?? []).map((q) => q.dataset_id),
  ]);
  const unusedDatasets = (datasets.data ?? []).filter(
    (d) => !d.archived && !usedDatasets.has(d.id) && d.slug !== AI_TEMPLATES_DATASET_SLUG,
  );

  const nothing = unshown.length + unusedDatasets.length === 0;

  return (
    <div>
        {metrics.isLoading || datasets.isLoading || viewItems.isLoading ? (
          <p className="text-sm text-muted-foreground py-3">Loading…</p>
        ) : nothing ? (
          <p className="text-sm text-muted-foreground py-3">Everything is in use: every metric is shown in a view.</p>
        ) : (
          <>
            <Section title="Not in any view" note="Defined here but not shown. Place them in Metrics → Views.">
              {unshown.map(({ key, entry, title }) => (
                <Row
                  key={key}
                  title={
                    <span className="flex items-center gap-2 min-w-0">
                      <DesignBadge theme={KIND_BADGE[entry.kind]} styling="light">
                        {KIND_LABELS[entry.kind]}
                      </DesignBadge>
                      <span className="truncate">{title}</span>
                    </span>
                  }
                  subtitle={entry.detail}
                  action={
                    <DesignButton
                      variant="flat"
                      theme="muted"
                      size="small"
                      aria-label={`Place ${title} in Metrics → Views`}
                      icon={<ArrowSquareOut size={16} />}
                      onClick={() => navigate("/settings/views")}
                    />
                  }
                />
              ))}
            </Section>
            <Section title="Datasets not used" note="No quantitative or qualitative metric reads them.">
              {unusedDatasets.map((d) => (
                <Row
                  key={d.id}
                  title={d.name}
                  subtitle={d.description || "Dataset"}
                  action={
                    <DesignButton
                      variant="flat"
                      theme="primary"
                      size="small"
                      icon={<Plus size={16} />}
                      onClick={() => navigate(`/settings/metrics?new=number&dataset=${d.id}`)}
                    >
                      Use
                    </DesignButton>
                  }
                />
              ))}
            </Section>
          </>
        )}
    </div>
  );
};
