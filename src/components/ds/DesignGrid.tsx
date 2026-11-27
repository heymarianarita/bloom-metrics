import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Grid Container ─── */
export interface DesignGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max width of the grid container in px. Default 1280. */
  maxWidth?: number;
  /** Outer margin in px (applied as horizontal padding). Default 24. */
  margin?: number;
  /** Gap between columns/rows in px. Default 12. */
  gutter?: number;
  /** Centre-align the container. Default true. */
  centered?: boolean;
  /** Render as a CSS-grid with the responsive column system. Default true.
   *  Set false to use as a plain max-width container without grid columns. */
  columns?: boolean;
}

/**
 * Responsive 12-column grid following the Bloom 4 px baseline.
 *
 * Breakpoints (column count):
 *  - ≥ 768 px  → 12 columns
 *  - ≥ 480 px  → 8 columns
 *  - < 480 px  → 4 columns
 *
 * Gutters: 12 px  ·  Outer margins: 24 px  ·  Max-width: 1280 px
 */
const DesignGrid = React.forwardRef<HTMLDivElement, DesignGridProps>(
  (
    {
      maxWidth = 1280,
      margin = 24,
      gutter = 12,
      centered = true,
      columns = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full",
          centered && "mx-auto",
          columns &&
            "grid grid-cols-4 min-[480px]:grid-cols-8 md:grid-cols-12",
          className,
        )}
        style={{
          maxWidth,
          paddingLeft: margin,
          paddingRight: margin,
          gap: columns ? gutter : undefined,
          ...style,
        }}
        {...props}
      />
    );
  },
);
DesignGrid.displayName = "DesignGrid";

/* ─── Grid Item ─── */
export interface DesignGridItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** How many columns the item spans at ≥768 px (md). 1–12. */
  colSpan?: number;
  /** Column span at ≥480 px (sm). 1–8. Falls back to colSpan. */
  colSpanSm?: number;
  /** Column span below 480 px (xs). 1–4. Falls back to full width (4). */
  colSpanXs?: number;
  /** Starting column position (1-based, md breakpoint). */
  colStart?: number;
  /** How many rows the item spans. */
  rowSpan?: number;
}

const spanClasses: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

const mdSpanClasses: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

const smSpanClasses: Record<number, string> = {
  1: "min-[480px]:col-span-1",
  2: "min-[480px]:col-span-2",
  3: "min-[480px]:col-span-3",
  4: "min-[480px]:col-span-4",
  5: "min-[480px]:col-span-5",
  6: "min-[480px]:col-span-6",
  7: "min-[480px]:col-span-7",
  8: "min-[480px]:col-span-8",
};

const mdStartClasses: Record<number, string> = {
  1: "md:col-start-1",
  2: "md:col-start-2",
  3: "md:col-start-3",
  4: "md:col-start-4",
  5: "md:col-start-5",
  6: "md:col-start-6",
  7: "md:col-start-7",
  8: "md:col-start-8",
  9: "md:col-start-9",
  10: "md:col-start-10",
  11: "md:col-start-11",
  12: "md:col-start-12",
};

const rowSpanClasses: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
  5: "row-span-5",
  6: "row-span-6",
};

const DesignGridItem = React.forwardRef<HTMLDivElement, DesignGridItemProps>(
  (
    {
      colSpan = 12,
      colSpanSm,
      colSpanXs = 4,
      colStart,
      rowSpan,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          spanClasses[colSpanXs] ?? "col-span-4",
          smSpanClasses[colSpanSm ?? colSpan] ?? smSpanClasses[colSpan],
          mdSpanClasses[colSpan],
          colStart && mdStartClasses[colStart],
          rowSpan && rowSpanClasses[rowSpan],
          className,
        )}
        {...props}
      />
    );
  },
);
DesignGridItem.displayName = "DesignGridItem";

export { DesignGrid, DesignGridItem };
