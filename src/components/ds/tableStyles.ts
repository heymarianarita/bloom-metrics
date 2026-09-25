/**
 * Shared table styling — matches the Bloom "Table" component (and DesignDataTable).
 * Use these on any custom <table> (e.g. editable grids) so every table looks the same.
 */
export const tableStyles = {
  /** Outer box: white, 6px corners, thin border. */
  container: "rounded-[12px] border border-border bg-background",
  /** Same box when it sits inside a card — 6px so the corners nest cleanly. */
  containerNested: "rounded-[6px] border border-border bg-background",
  table: "w-full border-collapse text-[14px]",
  headRow: "h-[44px] border-b border-border",
  th: "h-[44px] text-left align-middle px-4 text-[14px] font-[375] text-muted-foreground border-l border-[rgba(21,25,26,0.08)] first:border-l-0 whitespace-nowrap",
  thNumeric: "text-right",
  row: "border-b border-border last:border-b-0 hover:bg-[rgba(0,119,130,0.06)] transition-colors",
  td: "px-4 py-3 align-top text-foreground border-l border-[rgba(21,25,26,0.08)] first:border-l-0",
  tdNumeric: "text-right tabular-nums",
  tdMuted: "text-muted-foreground",
  /** Cell that holds an input filling the whole cell. */
  tdEditable: "p-0 align-middle border-l border-[rgba(21,25,26,0.08)] first:border-l-0",
  /** Footer "add row" action row. */
  footerAction:
    "flex w-full items-center gap-2 px-4 py-3 text-[14px] text-primary hover:bg-[rgba(0,119,130,0.06)] transition-colors",
} as const;
