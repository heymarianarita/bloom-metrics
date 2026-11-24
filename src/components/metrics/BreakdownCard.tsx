import * as React from "react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** One card of a side-by-side breakdown (a metric's score spread, a role's themes): title, count, rows of bars. */
export const BreakdownCard = ({
  title,
  meta,
  summary,
  children,
}: {
  title: React.ReactNode;
  /** Short, on the right of the title, e.g. "12 responses". */
  meta?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <DesignCard radius="small" className="p-3">
    <div className="flex items-baseline justify-between gap-2">
      <p className="min-w-0 text-sm font-medium text-foreground">{title}</p>
      {meta && <p className="shrink-0 text-xs text-muted-foreground">{meta}</p>}
    </div>
    {summary && <p className="mt-1.5 text-sm text-muted-foreground">{summary}</p>}
    <div className="mt-3 flex flex-col gap-3">{children}</div>
  </DesignCard>
);

/**
 * A label and its value on one line, with a bar showing `fraction` (0–1) underneath.
 * With `onToggle`, the row opens and closes `children` (e.g. example answers) below it.
 */
export const ShareRow = ({
  label,
  value,
  fraction,
  hint,
  expanded = false,
  onToggle,
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  fraction: number;
  /** Shown on hover over the label, e.g. a theme's description. */
  hint?: string;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}) => {
  const line = (
    <>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <DesignTooltip content={hint}>
          <p className="flex min-w-0 items-center gap-1 text-foreground">
            {onToggle && (
              <CaretRight
                size={10}
                aria-hidden="true"
                className={cn("shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
              />
            )}
            {label}
          </p>
        </DesignTooltip>
        <p className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{value}</p>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden="true">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, fraction) * 100)}%` }} />
      </div>
    </>
  );
  if (!onToggle) return <div>{line}</div>;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="-mx-1 block w-[calc(100%+8px)] rounded-md px-1 py-0.5 text-left hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {line}
      </button>
      {expanded && children}
    </div>
  );
};
