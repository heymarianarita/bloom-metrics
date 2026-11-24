import * as React from "react";
import { DotsSixVertical, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignDateInput } from "@/components/ds/DesignDateInput";
import { cn } from "@/lib/utils";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { useIsTruncated } from "@/hooks/useIsTruncated";
import type { DatasetColumnKind, ManualDatasetColumn } from "@/hooks/useManualDatasets";
import type { DateOrder } from "../../../server/shared/dates.ts";
import { IGNORE, NEW_COLUMN, guessKind, type ImportPlan, type MetricUse } from "./importPlan";

export const KIND_LABELS: Record<DatasetColumnKind, string> = {
  text: "Text",
  number: "Number",
  rating: "Rating (1–5)",
  date: "Date",
  email: "Email",
  period: "Quarter",
};
const NEW_KIND_OPTIONS = (["rating", "number", "text", "date"] as const).map((value) => ({ value, label: KIND_LABELS[value] }));

const LEFT_OUT = "left-out";
const slotId = (key: string) => `slot:${key}`;
const SEARCH_FROM = 8;

interface ColumnMatchBoardProps {
  datasetName: string;
  columns: ManualDatasetColumn[];
  header: string[];
  body: string[][];
  plan: ImportPlan;
  metricUse: MetricUse;
  mapping: string[];
  /** Puts file column `index` into a dataset column key, NEW_COLUMN or IGNORE. */
  onPlace: (index: number, target: string) => void;
  newKinds: (DatasetColumnKind | null)[];
  onNewKind: (index: number, kind: DatasetColumnKind) => void;
  dateOrders: (DateOrder | null)[];
  onDateOrder: (index: number, order: DateOrder) => void;
  fixed: Record<string, string>;
  onFixed: (key: string, value: string) => void;
}

const nameOf = (header: string[], index: number) => header[index] || `Column ${index + 1}`;

/** A column of the file, shown as a chip that can be dragged, or clicked and then a column clicked. */
const Chip = ({
  index,
  name,
  example,
  selected,
  onSelect,
  onRemove,
  overlay,
}: {
  index: number;
  name: string;
  example: string;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  overlay?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `file:${index}`, disabled: overlay });
  const [nameRef, nameTruncated] = useIsTruncated<HTMLSpanElement>(name);
  const exampleText = example ? `e.g. “${example}”` : null;
  const tooltip = overlay ? null : nameTruncated ? (
    <>
      {name}
      {exampleText && <span className="block opacity-70">{exampleText}</span>}
    </>
  ) : (
    exampleText
  );
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-0.5 rounded-full border bg-background text-[13px] text-foreground",
        onRemove ? "pl-2.5 pr-1" : "px-2.5",
        selected ? "border-primary shadow-[0_0_0_1px_var(--primary)]" : "border-border hover:border-[rgba(21,25,26,0.3)]",
        isDragging && "opacity-40",
        overlay && "cursor-grabbing shadow-lg",
      )}
    >
      <DesignTooltip content={tooltip}>
        <button
          type="button"
          className="flex min-w-0 cursor-grab touch-none items-center gap-1"
          onClick={onSelect}
          {...(overlay ? {} : listeners)}
          {...(overlay ? {} : attributes)}
          aria-label={`“${name}”${example ? `, e.g. “${example}”` : ""}`}
        >
          <DotsSixVertical size={12} weight="bold" className="shrink-0 text-muted-foreground" />
          <span ref={nameRef} className="truncate">{name}</span>
        </button>
      </DesignTooltip>
      {onRemove && (
        <button
          type="button"
          aria-label={`Leave out “${name}”`}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-[rgba(21,25,26,0.06)] hover:text-foreground"
          onClick={onRemove}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

/** Somewhere a chip can be dropped: a dataset column, the new-columns row, or the file's unused columns. */
const DropArea = ({
  id,
  children,
  className,
  highlight,
  onClick,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  onClick?: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "transition-colors",
        isOver && "bg-[rgba(0,119,130,0.08)]",
        !isOver && highlight && "cursor-pointer hover:bg-[rgba(0,119,130,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
};

const ColumnMatchBoard = ({
  datasetName,
  columns,
  header,
  body,
  plan,
  metricUse,
  mapping,
  onPlace,
  newKinds,
  onNewKind,
  dateOrders,
  onDateOrder,
  fixed,
  onFixed,
}: ColumnMatchBoardProps) => {
  const [selected, setSelected] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [query, setQuery] = React.useState("");
  const [fixedOpen, setFixedOpen] = React.useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const exampleOf = (index: number) => body.find((row) => (row[index] ?? "").trim() !== "")?.[index].trim() ?? "";

  /** Puts a chip in a target; whatever was in a dataset column before goes back to the unused ones. */
  const place = (index: number, target: string) => {
    if (target !== IGNORE && target !== NEW_COLUMN) {
      mapping.forEach((current, i) => {
        if (i !== index && current === target) onPlace(i, IGNORE);
      });
    }
    onPlace(index, target);
    setSelected(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const index = Number(String(event.active.id).replace("file:", ""));
    const over = event.over?.id ? String(event.over.id) : null;
    if (!over) return;
    if (over === LEFT_OUT) place(index, IGNORE);
    else if (over === slotId(NEW_COLUMN)) place(index, NEW_COLUMN);
    else place(index, over.replace("slot:", ""));
  };

  const chip = (index: number, placed = false) => (
    <Chip
      key={index}
      index={index}
      name={nameOf(header, index)}
      example={exampleOf(index)}
      selected={selected === index}
      onSelect={() => setSelected((s) => (s === index ? null : index))}
      onRemove={placed ? () => place(index, IGNORE) : undefined}
    />
  );

  const unused = header.map((_, i) => i).filter((i) => (mapping[i] ?? IGNORE) === IGNORE);
  const q = query.trim().toLowerCase();
  const shownUnused = q ? unused.filter((i) => nameOf(header, i).toLowerCase().includes(q)) : unused;
  const newOnes = header.map((_, i) => i).filter((i) => mapping[i] === NEW_COLUMN);
  const clickTarget = (target: string) => (selected === null ? undefined : () => place(selected, target));
  const emptyHint = dragging !== null ? "Drop here" : selected !== null ? `Put “${nameOf(header, selected)}” here` : "Not filled";

  const required = columns.filter((c) => metricUse.period.includes(c.key));
  const others = columns.filter((c) => !metricUse.period.includes(c.key));
  const filled = others.filter((c) => mapping.includes(c.key) || (fixed[c.key] ?? "") !== "").length;

  const describe = (column: ManualDatasetColumn) =>
    [
      column.kind === "rating" ? "Score 1–5" : column.kind === "number" ? "Number" : column.kind === "date" ? "Date" : null,
      metricUse.filters.includes(column.key) ? "Charts filter by this" : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const row = (column: ManualDatasetColumn, isRequired = false) => {
    const placed = mapping.findIndex((m) => m === column.key);
    const fixedValue = fixed[column.key] ?? "";
    const showFixed = placed < 0 && (isRequired || fixedOpen[column.key] || fixedValue !== "");
    const meta = isRequired ? "Charts group by this" : describe(column);
    return (
      <DropArea
        key={column.key}
        id={slotId(column.key)}
        highlight={selected !== null && placed !== selected}
        onClick={clickTarget(column.key)}
        className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-3 px-3 py-2"
      >
        <div className="min-w-0">
          <p className="truncate text-[13px] font-[500] text-foreground" title={column.label}>
            {column.label}
          </p>
          {meta && <p className="truncate text-[12px] text-muted-foreground">{meta}</p>}
        </div>
        {placed >= 0 ? (
          <div className="min-w-0 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            {chip(placed, true)}
            {column.kind === "date" && plan.ambiguousDates.includes(placed) && (
              <DesignInputSelect
                size="small"
                placeholder="How are these dates written?"
                value={dateOrders[placed] ?? ""}
                onChange={(value) => onDateOrder(placed, value as DateOrder)}
                options={[
                  { value: "mdy", label: "Month first (03/26/2025)" },
                  { value: "dmy", label: "Day first (26/03/2025)" },
                ]}
              />
            )}
          </div>
        ) : showFixed ? (
          <div className="min-w-0 space-y-1" onClick={(e) => e.stopPropagation()}>
            {column.kind === "date" ? (
              <DesignDateInput
                size="small"
                aria-label={`${column.label}, same for every row`}
                value={fixedValue}
                onChange={(value) => onFixed(column.key, value)}
              />
            ) : (
              <DesignInputText
                size="small"
                placeholder="Same for every row"
                aria-label={`${column.label}, same for every row`}
                value={fixedValue}
                onChange={(e) => onFixed(column.key, e.target.value)}
              />
            )}
            {isRequired && (
              <p className={cn("text-[12px]", fixedValue ? "text-muted-foreground" : "text-destructive")}>
                {fixedValue ? "Used for every row, or drop a date column here" : "Pick a date, or drop a date column here"}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-8 min-w-0 items-center justify-between gap-2 rounded-full border border-dashed border-border px-3">
            <span className="truncate text-[12px] text-muted-foreground">{emptyHint}</span>
            {dragging === null && selected === null && (
              <button
                type="button"
                className="shrink-0 text-[12px] text-primary opacity-0 hover:underline focus-visible:opacity-100 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setFixedOpen((prev) => ({ ...prev, [column.key]: true }));
                }}
              >
                Same for every row
              </button>
            )}
          </div>
        )}
      </DropArea>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDragging(Number(String(e.active.id).replace("file:", "")))}
      onDragCancel={() => setDragging(null)}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-6">
        <section className="sticky top-0 space-y-2">
          <div>
            <h3 className="text-[14px] font-[580] text-foreground">
              Not used yet <span className="font-normal text-muted-foreground">· {unused.length}</span>
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Drag each column of your file onto the matching column on the right, or click it and then the column. Anything
              left here isn't imported.
            </p>
          </div>
          {unused.length >= SEARCH_FROM && (
            <DesignInputText
              size="small"
              placeholder="Find a column"
              aria-label="Find a column of your file"
              prefix={<MagnifyingGlass size={16} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <DropArea
            id={LEFT_OUT}
            highlight={selected !== null && mapping[selected] !== IGNORE}
            onClick={clickTarget(IGNORE)}
            className="flex max-h-[min(60vh,520px)] min-h-[64px] flex-wrap content-start gap-1.5 overflow-y-auto rounded-[6px] border border-dashed border-border p-2"
          >
            {shownUnused.map((i) => chip(i))}
            {!unused.length && (
              <p className="w-full p-2 text-center text-[12px] text-muted-foreground">Every column of the file is used.</p>
            )}
            {unused.length > 0 && !shownUnused.length && (
              <p className="w-full p-2 text-center text-[12px] text-muted-foreground">No column matches “{query.trim()}”.</p>
            )}
          </DropArea>
        </section>

        <section className="space-y-4">
          {required.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-[14px] font-[580] text-foreground">Needed for charts</h3>
              <div className="divide-y divide-border rounded-[6px] border border-border">{required.map((c) => row(c, true))}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <h3 className="text-[14px] font-[580] text-foreground">
              {datasetName} columns{" "}
              {others.length > 0 && (
                <span className="font-normal text-muted-foreground">
                  · {filled} of {others.length} filled
                </span>
              )}
            </h3>
            <div className="divide-y divide-border rounded-[6px] border border-border">
              {others.map((c) => row(c))}
              {newOnes.map((i) => {
                const clash = plan.clashes.find((c) => c.header === nameOf(header, i).trim());
                return (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-[500] text-foreground" title={nameOf(header, i)}>
                        {nameOf(header, i)}
                      </p>
                      <p className="text-[12px] text-primary">New column</p>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      {chip(i, true)}
                      {clash ? (
                        <p className="text-[12px] text-destructive">
                          {datasetName} already has “{clash.existing}”. Drag it there instead.
                        </p>
                      ) : (
                        <DesignInputSelect
                          size="small"
                          value={newKinds[i] ?? guessKind(body.map((r) => (r[i] ?? "").trim()))}
                          onChange={(value) => onNewKind(i, value as DatasetColumnKind)}
                          options={NEW_KIND_OPTIONS}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              <DropArea
                id={slotId(NEW_COLUMN)}
                highlight={selected !== null && mapping[selected] !== NEW_COLUMN}
                onClick={clickTarget(NEW_COLUMN)}
                className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-muted-foreground"
              >
                <Plus size={14} className="shrink-0" />
                {dragging !== null || selected !== null
                  ? "Drop here to add it as a new column"
                  : `Drop a column here to add it to ${datasetName} as a new column`}
              </DropArea>
            </div>
          </div>
        </section>
      </div>

      <DragOverlay>
        {dragging !== null && <Chip index={dragging} name={nameOf(header, dragging)} example={exampleOf(dragging)} overlay />}
      </DragOverlay>
    </DndContext>
  );
};

export default ColumnMatchBoard;
