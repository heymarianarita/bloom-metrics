import * as React from "react";
import { cn } from "@/lib/utils";

/** True inside a DesignStatGroup: stat cards drop their own border and become sections. */
export const StatGroupContext = React.createContext(false);

/** Columns for n cards: 1 → full width, 2 → halves, 3 → thirds, 4+ → 1/2/4 as the page widens. */
const columnsFor = (n: number) =>
  n <= 1
    ? "grid-cols-1"
    : n === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : n === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

export interface DesignStatGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Cards per row from small screens up, instead of the automatic split. */
  columns?: number;
}

/**
 * One bordered block split into stat-card sections. The 1px gaps show the border
 * colour as dividers; never more columns than cards.
 */
const DesignStatGroup = ({ children, className, columns, style, ...props }: DesignStatGroupProps) => {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <div
      className={cn(
        "rounded-[6px] border border-border grid gap-px bg-[rgba(21,25,26,0.06)] overflow-hidden items-stretch auto-rows-fr",
        columns ? "grid-cols-1 sm:[grid-template-columns:var(--stat-cols)]" : columnsFor(items.length),
        className,
      )}
      style={
        columns
          ? ({ ...style, "--stat-cols": `repeat(${Math.min(columns, Math.max(items.length, 1))}, minmax(0, 1fr))` } as React.CSSProperties)
          : style
      }
      {...props}
    >
      <StatGroupContext.Provider value={true}>
        {items.map((item, i) => (
          <div key={React.isValidElement(item) && item.key != null ? item.key : i} className="flex h-full flex-col bg-background">
            {item}
          </div>
        ))}
      </StatGroupContext.Provider>
    </div>
  );
};

export { DesignStatGroup };
