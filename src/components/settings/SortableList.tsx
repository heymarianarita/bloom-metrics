import * as React from "react";
import { DotsSixVertical } from "@phosphor-icons/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

/** What each row needs to be draggable: put `ref` and `style` on the row, `handle` inside it. */
export interface SortableRowProps {
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  handle: React.ReactNode;
  isDragging: boolean;
}

const Row = ({
  id,
  label,
  disabled,
  children,
}: {
  id: string;
  label: string;
  disabled?: boolean;
  children: (row: SortableRowProps) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const handle = (
    <button
      type="button"
      aria-label={`Reorder ${label}`}
      className={`shrink-0 -ml-1 flex h-8 w-6 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-[rgba(0,119,130,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        disabled ? "invisible" : isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      {...attributes}
      {...listeners}
    >
      <DotsSixVertical size={16} weight="bold" />
    </button>
  );
  return (
    <>
      {children({
        ref: setNodeRef,
        style: {
          transform: CSS.Translate.toString(transform),
          transition,
          position: "relative",
          zIndex: isDragging ? 1 : undefined,
          background: isDragging ? "var(--background)" : undefined,
          boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.08)" : undefined,
        },
        handle,
        isDragging,
      })}
    </>
  );
};

/**
 * A list reordered by dragging each row's grip handle (or with the keyboard: focus the handle,
 * Space to pick up, arrow keys to move, Space to drop). Shows the new order straight away and
 * goes back if saving it fails.
 */
export function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  disabled,
  children,
}: {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  /** Saves the new order (ids, first to last). */
  onReorder: (ids: string[]) => Promise<unknown> | void;
  disabled?: boolean;
  children: (item: T, row: SortableRowProps) => React.ReactNode;
}) {
  const ids = items.map(getId);
  const signature = ids.join("|");
  const [order, setOrder] = React.useState(ids);
  // Follow the saved order whenever it changes.
  React.useEffect(() => {
    setOrder(signature ? signature.split("|") : []);
  }, [signature]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    const previous = order;
    setOrder(next);
    try {
      await onReorder(next);
    } catch {
      setOrder(previous);
    }
  };

  const byId = new Map(items.map((item) => [getId(item), item]));
  // Screen reader messages name the item and its position instead of internal ids.
  const name = (id: string | number) => {
    const item = byId.get(String(id));
    return item ? getLabel(item) : "item";
  };
  const position = (id: string | number) => `position ${order.indexOf(String(id)) + 1} of ${order.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}, ${position(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} moved to ${position(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} dropped at ${position(over.id)}.` : `${name(active.id)} dropped.`),
    onDragCancel: ({ active }) => `Moving ${name(active.id)} cancelled.`,
  };
  return (
    <DndContext
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "To reorder, press Space or Enter, move with the arrow keys, then press Space or Enter again. Escape cancels.",
        },
      }}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        {order.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          return (
            <Row key={id} id={id} label={getLabel(item)} disabled={disabled || items.length < 2}>
              {(row) => children(item, row)}
            </Row>
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
