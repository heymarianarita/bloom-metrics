import { BookOpenText, Plus, PuzzlePiece, SquaresFour, TrendUp, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { SortableList } from "@/components/settings/SortableList";
import { groupTree, type MetricGroup } from "@/hooks/useMetricGroups";

const TAB_ICONS: Record<string, PhosphorIcon> = {
  impact: TrendUp,
  adoption: PuzzlePiece,
  documentation: BookOpenText,
};

/** The views (tabs) of the Metrics section, as a tree mirroring its menu. Drag to reorder. */
export const TabTree = ({
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
      <h1 className="px-3 pt-2 pb-3 text-[22px] font-[580] text-foreground">Views</h1>
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
          <span className="flex-1">Add view</span>
        </button>
      </div>
    </DesignCard>
  );
};
