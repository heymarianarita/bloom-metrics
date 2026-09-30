import * as React from "react";
import { Trash } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { useToast } from "@/hooks/use-toast";
import {
  useDeleteMetricGroup,
  useMetricGroups,
  useSaveMetricGroup,
  PERIODICITY_OPTIONS,
  type MetricGroup,
  type Periodicity,
} from "@/hooks/useMetricGroups";

/**
 * Create or edit a Metrics tab: a top-level group (its own item in the Metrics menu) or a
 * subgroup (a sub-tab inside one). One level deep.
 */
const TabSheet = ({
  open,
  onOpenChange,
  group,
  parentId = "",
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tab to edit; null creates one. */
  group: MetricGroup | null;
  /** Parent of a new subgroup; empty for a new top-level tab. */
  parentId?: string;
  onSaved?: (slug: string) => void;
  onDeleted?: () => void;
}) => {
  const { toast } = useToast();
  const groups = useMetricGroups();
  const saveGroup = useSaveMetricGroup();
  const deleteGroup = useDeleteMetricGroup();
  const all = React.useMemo(() => groups.data ?? [], [groups.data]);
  const [draft, setDraft] = React.useState({
    parent_id: "",
    name: "",
    description: "",
    periodicity: "quarterly" as Periodicity,
  });

  React.useEffect(() => {
    if (!open) return;
    if (group) {
      setDraft({
        parent_id: group.parent_id ?? "",
        name: group.name,
        description: group.description,
        periodicity: group.periodicity ?? "quarterly",
      });
    } else {
      const parent = all.find((g) => g.id === parentId);
      setDraft({ parent_id: parentId, name: "", description: "", periodicity: parent?.periodicity ?? "quarterly" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id, parentId]);

  const hasChildren = Boolean(group) && all.some((g) => g.parent_id === group?.id);
  const parentOptions = [
    { value: "", label: "None — its own item in the Metrics menu" },
    ...all.filter((g) => !g.parent_id && g.id !== group?.id).map((g) => ({ value: g.id, label: g.name })),
  ];

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Add a name first", variant: "destructive" });
      return;
    }
    try {
      const siblings = all.filter((g) => (g.parent_id ?? "") === draft.parent_id);
      const stays = group && (group.parent_id ?? "") === draft.parent_id;
      await saveGroup.mutateAsync({
        id: group?.id,
        parent_id: draft.parent_id || null,
        existing: all,
        name: draft.name,
        description: draft.description,
        periodicity: draft.periodicity,
        sort_order: stays ? group.sort_order : siblings.length,
      });
      onOpenChange(false);
      toast({ title: group ? "Tab updated" : "Tab created" });
      onSaved?.(draft.name);
    } catch (err) {
      toast({ title: "Could not save the tab", description: String(err), variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!group) return;
    const message = hasChildren
      ? `Delete the “${group.name}” tab and its sub-tabs? Their metrics stay, without a tab.`
      : `Delete the “${group.name}” ${group.parent_id ? "sub-tab? Its metrics move up to the parent tab." : "tab?"}`;
    if (!window.confirm(message)) return;
    try {
      await deleteGroup.mutateAsync(group.id);
      onOpenChange(false);
      toast({ title: "Tab deleted" });
      onDeleted?.();
    } catch (err) {
      toast({ title: "Could not delete the tab", description: String(err), variant: "destructive" });
    }
  };

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      minWidth="420px"
      title={group ? `Edit — ${group.name}` : draft.parent_id ? "New sub-tab" : "New tab"}
      footer={
        <div className="flex w-full justify-between gap-2">
          <div>
            {group && (
              <DesignButton variant="flat" theme="error" icon={<Trash size={16} />} isLoading={deleteGroup.isPending} onClick={remove}>
                Delete
              </DesignButton>
            )}
          </div>
          <div className="flex gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
              Cancel
            </DesignButton>
            <DesignButton variant="filled" theme="primary" isLoading={saveGroup.isPending} onClick={save}>
              Save tab
            </DesignButton>
          </div>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <DesignInputText
          label="Name"
          placeholder="Accessibility"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <DesignInputSelect
          label="Sub-tab of"
          value={draft.parent_id}
          disabled={hasChildren}
          helperText={hasChildren ? "This tab has sub-tabs, so it stays in the Metrics menu." : undefined}
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
          helperText="How values are grouped into periods on this tab."
          value={draft.periodicity}
          onChange={(value) => setDraft({ ...draft, periodicity: value as Periodicity })}
          options={PERIODICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>
    </DesignSideSheet>
  );
};

export default TabSheet;
