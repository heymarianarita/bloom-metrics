import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowSquareOut, PencilSimple, Plus } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignNote } from "@/components/ds/DesignNote";
import { TabTree } from "@/components/settings/views/TabTree";
import { ViewBlockEditor } from "@/components/settings/views/ViewBlockEditor";
import TabSheet from "@/components/settings/metrics/TabSheet";
import { useToast } from "@/hooks/use-toast";
import {
  groupTree,
  slugifyGroup,
  useMetricGroups,
  useReorder,
  type MetricGroup,
} from "@/hooks/useMetricGroups";
import { itemsOf, useViewItems } from "@/hooks/useViewItems";
import { canHaveSubTabs, tabIsShown, tabPath } from "@/lib/metricTabs";

const ViewsConfigurator = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const groups = useMetricGroups();
  const viewItems = useViewItems();
  const reorderTabs = useReorder("metric_groups");
  const { toast } = useToast();
  const all = React.useMemo(() => groups.data ?? [], [groups.data]);
  const [tabSheet, setTabSheet] = React.useState<{ group: MetricGroup | null; parentId?: string } | null>(null);

  // The selected view is kept in the URL (?tab=<slug>) so it survives a reload and can be linked.
  const selected = all.find((g) => g.slug === params.get("tab")) ?? groupTree(all)[0]?.group;
  const select = (id: string) => {
    const slug = all.find((g) => g.id === id)?.slug;
    if (slug) setParams({ tab: slug }, { replace: true });
  };
  const counts = (group: MetricGroup) => itemsOf(viewItems.data, group.id).filter((i) => !i.hidden).length;

  const reorder = async (ids: string[]) => {
    try {
      await reorderTabs.mutateAsync(ids);
    } catch (err) {
      toast({ title: "Could not reorder", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const parent = selected?.parent_id ? all.find((g) => g.id === selected.parent_id) : undefined;

  return (
    <>
      {groups.isLoading ? (
        <DesignLoader />
      ) : all.length === 0 ? (
        <DesignCard className="p-4">
          <DesignEmptyState
            title="Set up your first view"
            body="Each view is an item in the Metrics menu, such as Impact or Adoption, showing the metrics you pick."
            action={
              <DesignButton variant="filled" theme="primary" onClick={() => setTabSheet({ group: null })}>
                Add view
              </DesignButton>
            }
          />
        </DesignCard>
      ) : (
        <>
          {selected && (
            <ViewBlockEditor
              key={selected.id}
              view={selected}
              parent={parent}
              list={
                <TabTree
                  all={all}
                  selectedId={selected?.id ?? ""}
                  onSelect={select}
                  onAdd={() => setTabSheet({ group: null })}
                  onReorder={reorder}
                  counts={counts}
                />
              }
              header={
            <>
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
                      title="Edit name and description"
                      icon={<PencilSimple size={16} />}
                      onClick={() => setTabSheet({ group: selected })}
                    />
                  </div>
                  {selected.description && (
                    <p className="text-[14px] text-muted-foreground mt-1">{selected.description}</p>
                  )}
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
                      Sub-view
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
                      Open view
                    </DesignButton>
                  )}
                </div>
              </div>
              {!tabIsShown(selected, all) && (
                <>
                  <DesignSpacer size="small" />
                  <DesignNote text={`The ${parent?.name} page doesn't show sub-views yet, so this one isn't visible on the Metrics side.`} />
                </>
              )}
              {selected.slug === "documentation" && (
                <>
                  <DesignSpacer size="small" />
                  <DesignNote text="The Documentation page has a fixed layout (one sub-tab per Google Analytics property), so it doesn't use this list yet." />
                </>
              )}
            </>
              }
            />
          )}
        </>
      )}

      <TabSheet
        open={Boolean(tabSheet)}
        onOpenChange={(open) => !open && setTabSheet(null)}
        group={tabSheet?.group ?? null}
        parentId={tabSheet?.parentId}
        onSaved={(name) => {
          // Select a newly created view once the list refreshes.
          if (!tabSheet?.group) setParams({ tab: slugifyGroup(name) }, { replace: true });
        }}
        onDeleted={() => setParams({}, { replace: true })}
      />
    </>
  );
};

const ViewsSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <ViewsConfigurator />
    </AppShell>
  </RequireRole>
);

export default ViewsSettings;
