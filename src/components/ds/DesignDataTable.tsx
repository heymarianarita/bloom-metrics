import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, Filter, MoreVertical, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DesignInputBar } from "./DesignInputBar";
import { DesignInputSelect } from "./DesignInputSelect";
import { DesignButton } from "./DesignButton";
import { DesignChip } from "./DesignChip";
import { DesignCheckbox } from "./DesignCheckbox";
import { DesignToggle } from "./DesignToggle";
import { DesignPagination } from "./DesignPagination";
import { DesignEmptyState } from "./DesignEmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DesignDivider } from "./DesignDivider";
import { DesignTooltip } from "./DesignTooltip";

/* ─── Types ─── */

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  key: string;
  header?: string;
  render?: (row: T, index: number) => React.ReactNode;
  /** Width CSS value, e.g. "200px" or "1fr" */
  width?: string;
  /** Show sort icon in header */
  sortable?: boolean;
}

export interface DataTableFilter {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface DataTableTab {
  id: string;
  label: string;
  count?: number;
}

export interface DataTableAction<T> {
  icon: React.ReactNode;
  tooltip?: string;
  onClick: (row: T, index: number) => void;
}

export interface DesignDataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Unique key extractor per row */
  rowKey: (row: T, index: number) => string;

  /* ── Toolbar ── */
  searchPlaceholder?: string;
  /** Controlled search text, for a search field rendered outside the table (e.g. with hideToolbar) */
  search?: string;
  onSearchChange?: (value: string) => void;
  filters?: DataTableFilter[];
  /** Additional filters shown only in the side sheet */
  sideSheetFilters?: DataTableFilter[];
  /** Tabs shown below the filter bar */
  tabs?: DataTableTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  /** Total results label shown in toolbar */
  totalResultsLabel?: string;
  /** Allow toolbar filters to wrap to multiple rows (default: false — single row with overflow hidden) */
  wrapFilters?: boolean;

  /* ── Selection ── */
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;

  /* ── Row actions ── */
  actions?: DataTableAction<T>[];
  /** Show a toggle at the end of each row */
  rowToggle?: boolean;
  toggledKeys?: string[];
  onToggleChange?: (key: string, checked: boolean) => void;

  /* ── Pagination ── */
  pageSize?: number;
  /** Hide pagination */
  hidePagination?: boolean;

  /** Hide the table header row */
  hideHeader?: boolean;

  /** Hide the entire toolbar (search, filters, tabs) */
  hideToolbar?: boolean;

  /* ── Sorting ── */
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;

  /* ── Empty state ── */
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: React.ReactNode;

  /* ── Title ── */
  /** Optional title displayed above the toolbar inside the card */
  title?: string;
  /** Optional action element displayed next to the title (e.g. "View All" button) */
  titleAction?: React.ReactNode;
  /** Show the search field in the title row, right-aligned, instead of in the toolbar (needs `title`) */
  searchInTitle?: boolean;

  className?: string;
}

/* ─── (FilterDropdown and ActiveChip removed — now using DesignInputSelect) ─── */

/* ─── Helpers ─── */

/** Recursively extract plain text from a React node for tooltip display */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(" ");
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    return children ? extractText(children) : "";
  }
  return "";
}

/* ─── Main Component ─── */

function DesignDataTableInner<T>(
  {
    columns,
    data,
    rowKey,
    searchPlaceholder = "Search",
    search: controlledSearch,
    onSearchChange,
    filters = [],
    sideSheetFilters = [],
    tabs = [],
    activeTab,
    onTabChange,
    totalResultsLabel,
    wrapFilters = false,
    selectable = false,
    selectedKeys: controlledSelected,
    onSelectionChange,
    actions = [],
    rowToggle = false,
    toggledKeys: controlledToggled,
    onToggleChange,
    pageSize = 5,
    hidePagination = false,
    hideHeader = false,
    hideToolbar = false,
    sortKey: controlledSortKey,
    sortDirection: controlledSortDirection,
    onSortChange,
    emptyIcon,
    emptyTitle = "No results found",
    emptyBody,
    emptyAction,
    title,
    titleAction,
    searchInTitle = false,
    className,
  }: DesignDataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [internalSearch, setInternalSearch] = useState("");
  const search = controlledSearch ?? internalSearch;
  const setSearch = (value: string) => {
    onSearchChange?.(value);
    if (controlledSearch === undefined) setInternalSearch(value);
  };
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [internalToggled, setInternalToggled] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selected = controlledSelected ?? internalSelected;
  const setSelected = onSelectionChange ?? setInternalSelected;
  const toggled = controlledToggled ?? internalToggled;

  const allFilters = [...filters, ...sideSheetFilters];

  // Filter chips
  const allActiveChips = useMemo(() => {
    const chips: { filterId: string; value: string; label: string }[] = [];
    for (const [filterId, values] of Object.entries(activeFilters)) {
      const filterDef = allFilters.find((f) => f.id === filterId);
      for (const v of values) {
        const opt = filterDef?.options.find((o) => o.value === v);
        chips.push({ filterId, value: v, label: opt?.label ?? v });
      }
    }
    return chips;
  }, [activeFilters, allFilters]);

  const handleFilterSelect = (filterId: string, value: string) => {
    setActiveFilters((prev) => {
      const existing = prev[filterId] ?? [];
      if (existing.includes(value)) {
        const next = existing.filter((v) => v !== value);
        if (next.length === 0) {
          const { [filterId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [filterId]: next };
      }
      return { ...prev, [filterId]: [...existing, value] };
    });
    setPage(1);
  };

  const removeChip = (filterId: string, value: string) => {
    setActiveFilters((prev) => {
      const next = (prev[filterId] ?? []).filter((v) => v !== value);
      if (next.length === 0) {
        const { [filterId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [filterId]: next };
    });
    setPage(1);
  };

  const clearAll = () => {
    setActiveFilters({});
    setSearch("");
    setPage(1);
  };

  // Search: case-insensitive match on any column's plain value (strings and numbers).
  const query = search.trim().toLowerCase();
  const visibleData = useMemo(() => {
    if (!query) return data;
    return data.filter((row) =>
      columns.some((col) => {
        const value = (row as Record<string, unknown>)[col.key];
        return (typeof value === "string" || typeof value === "number") && String(value).toLowerCase().includes(query);
      }),
    );
  }, [data, columns, query]);

  // A search typed outside the table starts again from the first page.
  React.useEffect(() => setPage(1), [controlledSearch]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(visibleData.length / pageSize));
  const pagedData = visibleData.slice((page - 1) * pageSize, page * pageSize);

  // Selection helpers
  const allPageKeys = pagedData.map((row, i) => rowKey(row, (page - 1) * pageSize + i));
  const allSelected = allPageKeys.length > 0 && allPageKeys.every((k) => selected.includes(k));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(selected.filter((k) => !allPageKeys.includes(k)));
    } else {
      setSelected([...new Set([...selected, ...allPageKeys])]);
    }
  };

  const toggleSelectRow = (key: string) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
    } else {
      setSelected([...selected, key]);
    }
  };

  const searchMovedToTitle = searchInTitle && Boolean(title);
  const hasActions = actions.length > 0 || rowToggle;
  const resultsLabel = query
    ? `${visibleData.length} of ${data.length} results`
    : (totalResultsLabel ?? `${data.length} results`);
  const totalFilterCount = allActiveChips.length;

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
    <div ref={ref} className={cn("flex flex-col", className)}>
      {/* ── Title ── */}
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-[8px]">
          <h2 className="text-[18px] font-[580] text-[var(--foreground)]">{title}</h2>
          {(searchInTitle || titleAction) && (
            <div className="flex items-center gap-2">
              {searchInTitle && (
                <div className="w-[200px]">
                  <DesignInputBar
                    size="small"
                    placeholder={searchPlaceholder}
                    leftIcon={<Search className="w-4 h-4" />}
                    rightIcon={search ? <X className="w-3.5 h-3.5 cursor-pointer" /> : undefined}
                    onRightIconClick={() => { setSearch(""); setPage(1); }}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              )}
              {titleAction}
            </div>
          )}
        </div>
      )}
      {/* ── Toolbar ── */}
      {!hideToolbar && (
      <div className="flex flex-col gap-[12px] px-5 py-3 pb-[24px] relative z-10">
        {/* Row 1: Search + Select filters + All filters + Reset */}
        {(!searchMovedToTitle || filters.length > 0 || (!wrapFilters && allFilters.length > 0)) && (
        <div className={cn("flex items-center gap-3", wrapFilters ? "flex-wrap" : "flex-nowrap")}>
          {!searchMovedToTitle && (
          <div className="w-[200px]">
            <DesignInputBar
              placeholder={searchPlaceholder}
              leftIcon={<Search className="w-4 h-4" />}
              rightIcon={search ? <X className="w-3.5 h-3.5 cursor-pointer" /> : undefined}
              onRightIconClick={() => { setSearch(""); setPage(1); }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          )}
          {filters.map((f) => (
             <div key={f.id} className="w-[180px]">
              <DesignInputSelect
                placeholder={f.label}
                options={f.options}
                size="medium"
                value={activeFilters[f.id]?.[0] ?? ""}
                onChange={(val) => handleFilterSelect(f.id, val)}
              />
            </div>
          ))}
          {!wrapFilters && allFilters.length > 0 && (
            <>
              <DesignTooltip content={`All filters${totalFilterCount > 0 ? ` ${totalFilterCount}/${allFilters.length}` : ''}`}>
                <DesignButton variant="outlined" theme="muted" size="medium" onClick={() => setSheetOpen(true)} className="whitespace-nowrap truncate max-w-[180px]">
                  <span className="truncate">All filters {totalFilterCount > 0 && `${totalFilterCount}/${allFilters.length}`}</span>
                  <Filter className="w-3.5 h-3.5 shrink-0" />
                </DesignButton>
              </DesignTooltip>
              {totalFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-sm text-[var(--foreground)] font-medium cursor-pointer hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset filters
                </button>
              )}
            </>
          )}
        </div>
        )}

        {/* Active filter chips row (shown when wrapFilters is enabled and filters are active) */}
        {wrapFilters && allActiveChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {allActiveChips.map((chip) => (
              <DesignChip
                key={`${chip.filterId}-${chip.value}`}
                variant="filled"
                radius="round"
                onClick={() => removeChip(chip.filterId, chip.value)}
                suffix={<X className="w-3 h-3" />}
              >
                {chip.label}
              </DesignChip>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-primary font-medium cursor-pointer hover:underline ml-1"
            >
              Clear all
            </button>
            <span className="text-sm text-[var(--muted-foreground)] ml-1">{resultsLabel}</span>
          </div>
        )}

        {/* Row 2: Tabs (12px gap from row 1) */}
        {tabs.length > 0 && (
          <div className="flex items-center gap-[8px] flex-wrap">
            {tabs.map((tab) => (
              <DesignChip
                key={tab.id}
                isActive={activeTab === tab.id}
                size="small"
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.count != null ? `${tab.label} (${tab.count})` : tab.label}
              </DesignChip>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ── Side Sheet (All Filters) ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent overlayClassName="bg-transparent" className="w-[33.33vw] min-w-[360px] p-0 flex flex-col rounded-none border-l border-[var(--border)]">
          {/* Header */}
          <div className="px-6 h-[60px] flex items-center justify-between shrink-0 border-b border-[var(--border)]">
            <span className="text-[18px] font-[580] text-[var(--foreground)]">All filters</span>
            <button
              onClick={() => setSheetOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[var(--foreground)] hover:bg-[rgba(21,25,26,0.04)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Filter fields */}
          <div className="flex-1 overflow-y-auto px-6 pt-1 pb-6 space-y-4">
            {allFilters.map((f) => (
              <div key={f.id} className="space-y-2">
                <label className="text-[14px] text-[var(--muted-foreground)] font-[375]">{f.label}</label>
                <DesignInputSelect
                  placeholder={`Select ${f.label.toLowerCase()}`}
                  options={f.options}
                  value={activeFilters[f.id]?.[0] ?? ""}
                  onChange={(val) => handleFilterSelect(f.id, val)}
                />
              </div>
            ))}
          </div>
          {/* Footer */}
          <div className="px-6 h-[85px] flex items-center justify-end gap-3 shrink-0 border-t border-[var(--border)]">
            <DesignButton variant="outlined" theme="muted" size="medium" onClick={clearAll}>Reset</DesignButton>
            <DesignButton variant="filled" theme="primary" size="medium" onClick={() => setSheetOpen(false)}>Show results</DesignButton>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Table ── */}
      {pagedData.length > 0 ? (
        <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            {!hideHeader && (
              <thead>
                <tr
                  className={cn(
                    "h-[44px] border-b border-[var(--border)]",
                    // Divider from the toolbar/title above; without them the card's own border is the edge.
                    (!hideToolbar || title) && "border-t border-t-[rgba(21,25,26,0.08)]",
                  )}
                >
                  {selectable && (
                    <th className="w-[48px]" />
                  )}
                  {columns.map((col) => {
                    const isSorted = controlledSortKey === col.key;
                    const sortDir = isSorted ? controlledSortDirection : null;
                    const handleSort = () => {
                      if (!col.sortable || !onSortChange) return;
                      if (!isSorted || sortDir === null) onSortChange(col.key, "asc");
                      else if (sortDir === "asc") onSortChange(col.key, "desc");
                      else onSortChange(col.key, null);
                    };
                    return (
                      <DesignTooltip key={col.key} content={col.header ?? ""} side="top">
                        <th
                          className={cn(
                            "text-left px-4 text-[14px] font-[375] text-[var(--muted-foreground)] border-l border-[rgba(21,25,26,0.08)] first:border-l-0 overflow-hidden max-w-0",
                            col.sortable && "cursor-pointer select-none hover:text-[var(--foreground)] transition-colors"
                          )}
                          style={undefined}
                          onClick={col.sortable ? handleSort : undefined}
                        >
                          <span className="flex items-center gap-1 truncate">
                            <span className="truncate">{col.header ?? ""}</span>
                            {col.sortable && (
                              <span className="shrink-0">
                                {sortDir === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5" />
                                ) : sortDir === "desc" ? (
                                  <ArrowDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                )}
                              </span>
                            )}
                          </span>
                        </th>
                      </DesignTooltip>
                    );
                  })}
                  {hasActions && (
                    <th className="w-[96px] px-4 border-l border-[rgba(21,25,26,0.08)]" />
                  )}
                </tr>
              </thead>
            )}
            <tbody>
              {pagedData.map((row, localIdx) => {
                const globalIdx = (page - 1) * pageSize + localIdx;
                const key = rowKey(row, globalIdx);
                const isSelected = selected.includes(key);
                const isToggled = toggled.includes(key);

                return (
                  <tr
                    key={key}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[rgba(0,119,130,0.06)] transition-colors"
                  >
                    {selectable && (
                      <td className="w-[48px] px-3 py-3 align-top">
                        <DesignCheckbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(key)}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const cellContent = col.render
                        ? col.render(row, globalIdx)
                        : (row as Record<string, unknown>)[col.key] != null
                          ? String((row as Record<string, unknown>)[col.key])
                          : "";
                      const isStringContent = typeof cellContent === "string";
                      // Extract plain text from JSX for tooltip
                      const tooltipText = isStringContent
                        ? (cellContent as string)
                        : extractText(cellContent);
                      return (
                        <td key={col.key} className="px-4 py-3 text-[var(--foreground)] align-top border-l border-[rgba(21,25,26,0.08)] first:border-l-0 overflow-hidden max-w-0">
                          <DesignTooltip content={tooltipText} side="top">
                            <div className="min-w-0 [&_p]:truncate [&_span]:truncate truncate">
                              {cellContent}
                            </div>
                          </DesignTooltip>
                        </td>
                      );
                    })}
                    {hasActions && (
                      <td className="px-4 py-3 align-top border-l border-[rgba(21,25,26,0.08)]">
                        <div className="flex items-center justify-start gap-1">
                          {rowToggle && (
                            <DesignToggle
                              checked={isToggled}
                              onCheckedChange={(checked) => {
                                if (onToggleChange) {
                                  onToggleChange(key, !!checked);
                                } else {
                                  setInternalToggled((prev) =>
                                    checked ? [...prev, key] : prev.filter((k) => k !== key)
                                  );
                                }
                              }}
                            />
                          )}
                          {actions.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[var(--muted-foreground)] hover:bg-[rgba(21,25,26,0.04)] active:bg-[rgba(21,25,26,0.08)] transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[160px]">
                                {actions.map((action, ai) => (
                                  <DropdownMenuItem
                                    key={ai}
                                    onClick={() => action.onClick(row, globalIdx)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    {action.icon}
                                    {action.tooltip}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* ── Pagination ── */}
          {!hidePagination && pageCount > 1 && (
            <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end">
              <DesignPagination
                currentPage={page}
                pageCount={pageCount}
                onPageClick={setPage}
                preservedDistance={2}
                isLastPageAlwaysShown
              />
            </div>
          )}
        </>
      ) : (
        /* ── Empty state ── */
        <DesignEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          body={emptyBody}
          action={emptyAction}
        />
      )}
    </div>
    </TooltipPrimitive.Provider>
  );
}

const DesignDataTable = React.forwardRef(DesignDataTableInner) as <T>(
  props: DesignDataTableProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;

export { DesignDataTable };
