import * as React from "react";
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignNote } from "@/components/ds/DesignNote";
import { useToast } from "@/hooks/use-toast";
import { useManualMetrics } from "@/hooks/useManualMetrics";
import {
  useDeleteMetricGroup,
  useMetricGroups,
  useSaveMetricGroup,
  groupTree,
  PERIODICITY_OPTIONS,
  type MetricGroup,
  type Periodicity,
} from "@/hooks/useMetricGroups";

const GroupsTab = () => {
  const { toast } = useToast();
  const groups = useMetricGroups();
  const metrics = useManualMetrics();
  const saveGroup = useSaveMetricGroup();
  const deleteGroup = useDeleteMetricGroup();

  const [sheet, setSheet] = React.useState(false);
  const [draft, setDraft] = React.useState<{
    id?: string;
    parent_id: string;
    name: string;
    description: string;
    periodicity: Periodicity;
  }>({
    parent_id: "",
    name: "",
    description: "",
    periodicity: "quarterly",
  });

  const openNew = (parentId = "") => {
    const parent = groups.data?.find((g) => g.id === parentId);
    setDraft({ parent_id: parentId, name: "", description: "", periodicity: parent?.periodicity ?? "quarterly" });
    setSheet(true);
  };

  const openEdit = (group: MetricGroup) => {
    setDraft({
      id: group.id,
      parent_id: group.parent_id ?? "",
      name: group.name,
      description: group.description,
      periodicity: group.periodicity ?? "quarterly",
    });
    setSheet(true);
  };

  const all = groups.data ?? [];
  const tree = groupTree(all);
  const rows = tree.map(({ group }) => group);
  const childrenOf = (group: MetricGroup) => tree.find((t) => t.group.id === group.id)?.children;
  const hasChildren = (id?: string) => Boolean(id) && all.some((g) => g.parent_id === id);
  // One level deep: a subgroup's parent is a top-level group, and a group with subgroups stays top-level.
  const parentOptions = [
    { value: "", label: "None — a top-level group" },
    ...all.filter((g) => !g.parent_id && g.id !== draft.id).map((g) => ({ value: g.id, label: g.name })),
  ];

  const save = async () => {
    if (!draft.name.trim()) return;
    try {
      const siblings = all.filter((g) => (g.parent_id ?? "") === draft.parent_id);
      await saveGroup.mutateAsync({
        id: draft.id,
        parent_id: draft.parent_id || null,
        existing: all,
        name: draft.name,
        description: draft.description,
        periodicity: draft.periodicity,
        sort_order: draft.id && siblings.some((g) => g.id === draft.id)
          ? all.find((g) => g.id === draft.id)?.sort_order ?? 0
          : siblings.length,
      });
      setSheet(false);
      toast({ title: draft.id ? "Group updated" : draft.parent_id ? "Subgroup created" : "Group created" });
    } catch (err) {
      toast({ title: "Could not save the group", description: String(err), variant: "destructive" });
    }
  };

  /** Metrics directly in this group or subgroup (a group's count leaves out its subgroups' metrics). */
  const countFor = (group: MetricGroup) =>
    (metrics.data ?? []).filter((m) =>
      group.parent_id ? m.subgroup_id === group.id : m.surface === group.name && !all.some((g) => g.id === m.subgroup_id),
    ).length;

  const columns: DataTableColumn<MetricGroup>[] = [
    {
      key: "name",
      header: "Group",
      width: "1fr",
      render: (row) => row.name,
    },
    {
      key: "description",
      header: "Description",
      width: "1.3fr",
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
      width: "300px",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          {!row.parent_id && (
            <DesignButton
              variant="flat"
              theme="primary"
              size="small"
              icon={<Plus size={16} />}
              onClick={() => openNew(row.id)}
            >
              Subgroup
            </DesignButton>
          )}
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
              if (
                !confirm(
                  hasChildren(row.id)
                    ? `Delete the “${row.name}” group and its subgroups? Their metrics stay, without a group.`
                    : `Delete the “${row.name}” ${row.parent_id ? "subgroup? Its metrics move up to the parent group." : "group?"}`,
                )
              )
                return;
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
          <DesignNote text="Groups are the sections metrics are reported under on the Metrics page. A subgroup gets its own tab inside its group." />
          <DesignButton
            variant="filled"
            theme="primary"
            size="medium"
            icon={<Plus size={16} />}
            onClick={() => openNew()}
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
              <DesignButton variant="filled" theme="primary" onClick={() => openNew()}>
                Create first group
              </DesignButton>
            }
          />
        ) : (
          <DesignDataTable
            columns={columns}
            data={rows}
            subRows={childrenOf}
            rowKey={(row) => row.id}
            pageSize={rows.length || 1}
            hidePagination
          />
        )}
      </DesignCard>

      <DesignSideSheet
        open={sheet}
        onOpenChange={setSheet}
        title={draft.id ? `Edit — ${draft.name}` : draft.parent_id ? "New subgroup" : "New group"}
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
          <DesignInputSelect
            label="Subgroup of"
            value={draft.parent_id}
            disabled={hasChildren(draft.id)}
            helperText={hasChildren(draft.id) ? "This group has subgroups, so it stays a top-level group." : undefined}
            onChange={(parent_id) => setDraft({ ...draft, parent_id })}
            options={parentOptions}
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

const MetricGroupsSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <DesignPageHeader
        title="Metric groups"
        subtitle="The sections of the Metrics page. Quantitative and qualitative metrics are each shown in their group."
      />
      <DesignSpacer size="medium" />
      <GroupsTab />
    </AppShell>
  </RequireRole>
);

export default MetricGroupsSettings;
