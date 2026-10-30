import * as React from "react";
import { DesignCard } from "@/components/ds/DesignCard";
import { SortableList } from "@/components/settings/SortableList";

/**
 * The left-hand list of a settings page that shows one item at a time (Datasets, Dynamic
 * sources): every item by name, the selected one highlighted, and optional actions below.
 * With `onReorder`, items can be dragged into any order (within their group).
 */
export const SelectList = ({
  title,
  items,
  selectedId,
  onSelect,
  onReorder,
  actions = [],
}: {
  title: string;
  /** Items with a `group` get a small heading wherever the group changes. */
  items: { id: string; label: string; group?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Saves a new order (all ids, first to last). */
  onReorder?: (ids: string[]) => Promise<unknown>;
  /** Rows after the items, e.g. "New dataset". */
  actions?: { label: string; icon: React.ReactNode; onClick: () => void }[];
}) => {
  const rowClass = (selected: boolean) =>
    `w-full text-left px-3 py-2 rounded-[6px] transition-colors min-w-0 ${
      selected ? "bg-[rgba(0,119,130,0.08)]" : "hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
    }`;
  const itemButton = (item: { id: string; label: string }) => {
    const selected = item.id === selectedId;
    return (
      <button type="button" className={rowClass(selected)} onClick={() => onSelect(item.id)}>
        <p className={`text-sm truncate ${selected ? "font-medium text-[var(--primary-extra-dark)]" : "text-foreground"}`}>
          {item.label}
        </p>
      </button>
    );
  };
  const heading = (group: string, first: boolean) => (
    <p className={`px-3 pb-1 text-[12px] text-muted-foreground ${first ? "pt-1" : "pt-3"}`}>{group}</p>
  );
  // Runs of items that share a group, in list order.
  const groups = items.reduce<{ group?: string; items: typeof items }[]>((acc, item) => {
    const last = acc[acc.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else acc.push({ group: item.group, items: [item] });
    return acc;
  }, []);
  return (
    <DesignCard className="p-2">
      {/* The page's title lives here, at the top of its list (the pages have no header above the columns). */}
      <h1 className="px-3 pt-2 pb-3 text-[22px] font-[580] text-foreground truncate">{title}</h1>
      <div className="flex flex-col gap-0.5">
        {onReorder ? (
          groups.map((g, gi) => (
            <React.Fragment key={g.group ?? gi}>
              {g.group && heading(g.group, gi === 0)}
              <SortableList
                items={g.items}
                getId={(i) => i.id}
                getLabel={(i) => i.label}
                onReorder={(ids) => onReorder(groups.flatMap((other, oi) => (oi === gi ? ids : other.items.map((i) => i.id))))}
              >
                {(item, row) => (
                  <div key={item.id} ref={row.ref} style={row.style} className="flex items-center gap-0.5 rounded-[6px]">
                    {row.handle}
                    {itemButton(item)}
                  </div>
                )}
              </SortableList>
            </React.Fragment>
          ))
        ) : (
          items.map((item, i) => (
            <React.Fragment key={item.id}>
              {item.group && item.group !== items[i - 1]?.group && heading(item.group, i === 0)}
              {itemButton(item)}
            </React.Fragment>
          ))
        )}
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`${rowClass(false)} flex items-center gap-2 text-sm text-muted-foreground ${onReorder ? "pl-[37px]" : ""}`}
            onClick={action.onClick}
          >
            <span className="shrink-0 flex">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </DesignCard>
  );
};
