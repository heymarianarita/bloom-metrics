import * as React from "react";
import { cn } from "@/lib/utils";

/** True inside a DesignStatGroup: stat cards drop their own border and become sections. */
export const StatGroupContext = React.createContext(false);

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
}

/**
 * One bordered block split into stat-card sections. The 1px gaps show the border
 * colour as dividers. A short last row stretches across the row, so an unused
 * slot never shows as an empty cell.
 */
const DesignStatGroup = ({ children, className, columns, style, ...props }: DesignStatGroupProps) => {
  const items = React.Children.toArray(children).filter(Boolean);
  const count = items.length;
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
              key={React.isValidElement(item) && item.key != null ? item.key : i}
              className={cn(
                "flex h-full min-w-0 flex-col bg-design-card",
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
