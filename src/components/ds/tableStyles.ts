/**
 * Shared table styling — the Bloom "Table" from @vinted/web-ui (src/lib/Table/table-tokens.css),
 * used by DesignDataTable and every custom <table> (e.g. editable grids) so all tables look the same:
 * 8px × 12px cells, 14px/18px text, row dividers only, grey row hover, inside a Bloom Card frame.
 * Tables use separate borders, so dividers sit on the cells (a sticky header keeps its line).
 */
export const tableStyles = {
  /** Bloom Card frame (6px, 1px border) the table sits in. Add `overflow-x-auto` (or `overflow-auto`). */
  container: "rounded-[6px] border border-design-card-border bg-[var(--table-surface)]",
  table: "w-full border-separate border-spacing-0 text-[14px] leading-[18px] text-foreground",
  /** Add to `table` for dense grids: Bloom's `columnDividers`. */
  colDividers:
    "[&_td:not(:first-child)]:border-l [&_td:not(:first-child)]:border-l-[var(--table-divider-body)] [&_th:not(:first-child)]:border-l [&_th:not(:first-child)]:border-l-[var(--table-divider-body)]",
  headRow: "",
  th: "px-3 py-2 text-left align-middle text-[14px] leading-[18px] font-[375] text-[var(--table-header-text)] bg-[var(--table-surface)] border-b border-b-[var(--table-divider-header)] whitespace-nowrap",
  /** Keeps the header row in view inside a scrolling container. */
  thSticky: "sticky top-0 z-10",
  thNumeric: "text-right",
  /** Sticky cells need `bg-inherit` to keep the row's background. */
  row: "bg-[var(--table-surface)] hover:bg-[var(--table-surface-hover)] [&:not(:first-child)>td]:border-t [&>td]:border-t-[var(--table-divider-body)] transition-colors",
  /** Add to `row` for nested child rows. */
  rowNested: "bg-[var(--table-surface-expandable)]",
  td: "px-3 py-2 align-middle text-foreground",
  tdNumeric: "text-right tabular-nums",
  tdMuted: "text-muted-foreground",
  /** Cell that holds an input filling the whole cell. */
  tdEditable: "p-0 align-middle",
  /** Input that fills an editable cell. */
  cellInput:
    "w-full h-full bg-transparent px-3 py-2 text-[14px] leading-[18px] text-foreground outline-none focus:ring-1 focus:ring-inset focus:ring-primary",
  /** Cell for a footer "add row" action. */
  footerCell: "p-0 border-t border-t-[var(--table-divider-body)]",
  footerAction:
    "flex w-full items-center gap-2 px-3 py-2 text-[14px] leading-[18px] text-primary hover:bg-[var(--table-surface-hover)] transition-colors",
  /** Bloom Table sort control: 32px icon button after the header label. */
  sortButton:
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--table-header-text)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
} as const;
