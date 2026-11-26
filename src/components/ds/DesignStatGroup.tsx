import * as React from "react";
import { cn } from "@/lib/utils";
import { StatFeaturedContext, StatGroupContext } from "./statGroupContext";

type CssVars = React.CSSProperties & Record<`--${string}`, string>;

/** Tracks in the fine grid that lets a short last row fill the width exactly. */
const tracksFor = (count: number, cols: number) => {
  const rem = count % cols;
  return rem === 0 ? cols : cols * rem;
};

/** How many of those tracks this card covers. Full rows stay even; the last row shares what's left. */
const spanFor = (index: number, count: number, cols: number) => {
  const rem = count % cols;
  if (rem === 0) return 1;
  return index >= count - rem ? cols : rem;
};

const templateFor = (count: number, cols: number) => `repeat(${tracksFor(Math.max(count, 1), cols)}, minmax(0, 1fr))`;

export interface DesignStatGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Cards per row from small screens up, instead of the automatic split. */
  columns?: number;
  /**
   * Index of a card to feature: from small screens up it sits on the left across two rows,
   * and the other cards share the two rows beside it. Needs at least three cards.
   */
  featured?: number;
}

/**
 * One bordered block split into stat-card sections. The 1px gaps show the border
 * colour as dividers. A short last row stretches across the row, so an unused
 * slot never shows as an empty cell.
 */
const DesignStatGroup = ({ children, className, columns, featured, style, ...props }: DesignStatGroupProps) => {
  const all = React.Children.toArray(children).filter(Boolean);
  const hasFeatured = featured != null && featured >= 0 && featured < all.length && all.length >= 3;
  const items = hasFeatured ? [all[featured], ...all.filter((_, i) => i !== featured)] : all;
  const count = items.length;

  const cellClass = "flex h-full min-w-0 flex-col bg-design-card";
  const keyOf = (item: React.ReactNode, i: number) => (React.isValidElement(item) && item.key != null ? item.key : i);

  if (hasFeatured) {
    // The rest fill two rows; the featured card takes one card's width of the same fine grid.
    const rest = count - 1;
    const cols = Math.ceil(rest / 2);
    const tracks = tracksFor(rest, cols);
    const featuredSpan = tracks / cols;
    const vars: CssVars = { ...style, "--tpl-sm": `repeat(${tracks + featuredSpan}, minmax(0, 1fr))` };
    return (
      <div
        className={cn(
          "grid grid-cols-1 items-stretch gap-px overflow-hidden rounded-md border border-border bg-border",
          "sm:[grid-template-columns:var(--tpl-sm)] sm:grid-rows-2",
          className,
        )}
        style={vars}
        {...props}
      >
        <StatGroupContext.Provider value={true}>
          {items.map((item, i) => (
            <div
              key={keyOf(item, i)}
              className={cn(cellClass, i === 0 ? "sm:row-span-2 sm:[grid-column:span_var(--span-sm)]" : "sm:[grid-column:span_var(--span-sm)]")}
              style={{ "--span-sm": String(i === 0 ? featuredSpan : spanFor(i - 1, rest, cols)) } as CssVars}
            >
              <StatFeaturedContext.Provider value={i === 0}>{item}</StatFeaturedContext.Provider>
            </div>
          ))}
        </StatGroupContext.Provider>
      </div>
    );
  }

  const fixed = columns ? Math.min(Math.max(1, Math.floor(columns)), Math.max(count, 1)) : null;
  // Automatic: 1, then halves, thirds, or 2 then 4 as the page widens. Never more columns than cards.
  const smCols = fixed ?? (count <= 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 2);
  const xlCols = fixed || count < 4 ? null : 4;

  const vars: CssVars = {
    ...style,
    "--tpl-sm": templateFor(count, smCols),
  };
  if (xlCols) vars["--tpl-xl"] = templateFor(count, xlCols);

  return (
    <div
      className={cn(
        "grid auto-rows-fr grid-cols-1 items-stretch gap-px overflow-hidden rounded-md border border-border bg-border",
        "sm:[grid-template-columns:var(--tpl-sm)]",
        xlCols && "xl:[grid-template-columns:var(--tpl-xl)]",
        className,
      )}
      style={vars}
      {...props}
    >
      <StatGroupContext.Provider value={true}>
        {items.map((item, i) => {
          const cellVars: CssVars = { "--span-sm": String(spanFor(i, count, smCols)) };
          if (xlCols) cellVars["--span-xl"] = String(spanFor(i, count, xlCols));
          return (
            <div
              key={keyOf(item, i)}
              className={cn(
                cellClass,
                "sm:[grid-column:span_var(--span-sm)]",
                xlCols && "xl:[grid-column:span_var(--span-xl)]",
              )}
              style={cellVars}
            >
              {item}
            </div>
          );
        })}
      </StatGroupContext.Provider>
    </div>
  );
};

export { DesignStatGroup };
