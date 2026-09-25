import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface DesignPaginationProps extends React.HTMLAttributes<HTMLElement> {
  currentPage: number;
  pageCount: number;
  onPageClick: (page: number) => void;
  onPrevClick?: (page: number) => void;
  onNextClick?: (page: number) => void;
  preservedDistance?: number;
  size?: "default" | "narrow" | "parent";
  isLastPageAlwaysShown?: boolean;
}

const DesignPagination = React.forwardRef<HTMLElement, DesignPaginationProps>(
  (
    {
      className,
      currentPage,
      pageCount,
      onPageClick,
      onPrevClick,
      onNextClick,
      preservedDistance = 1,
      size = "default",
      isLastPageAlwaysShown = false,
      ...props
    },
    ref
  ) => {
    const getPages = () => {
      const pages: (number | "ellipsis")[] = [];
      const start = Math.max(2, currentPage - preservedDistance);
      const end = Math.min(pageCount - 1, currentPage + preservedDistance);

      pages.push(1);
      if (start > 2) pages.push("ellipsis");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < pageCount - 1) pages.push("ellipsis");
      if (pageCount > 1 && (isLastPageAlwaysShown || end >= pageCount - 1)) {
        pages.push(pageCount);
      } else if (pageCount > 1 && !isLastPageAlwaysShown && end < pageCount - 1) {
        // ellipsis already added above
      }

      return pages;
    };

    const pages = getPages();
    const hasPrev = currentPage > 1;
    const hasNext = currentPage < pageCount;

    const isNarrow = size === "narrow";
    const itemPx = isNarrow ? 28 : size === "parent" ? 36 : 40;
    const fontSize = isNarrow ? 12 : 14;
    const lineHeight = isNarrow ? 16 : 18;

    const baseItemClass =
      "relative flex items-center justify-center select-none transition-colors";

    return (
      <nav
        ref={ref}
        className={cn("inline-flex items-center", className)}
        aria-label="Pagination"
        {...props}
      >
        {/* Previous */}
        <button
          disabled={!hasPrev}
          onClick={() => {
            const prev = currentPage - 1;
            onPrevClick?.(prev) ?? onPageClick(prev);
          }}
          className={cn(
            baseItemClass,
            "rounded-[var(--radius)] text-[var(--text-primary)]",
            hasPrev
              ? "cursor-pointer hover:bg-[rgba(21,25,26,0.02)] active:bg-[rgba(21,25,26,0.04)]"
              : "cursor-not-allowed opacity-[0.64]"
          )}
          style={{ width: itemPx, height: itemPx }}
          aria-label="Previous page"
        >
          <ChevronLeft style={{ width: 20, height: 20 }} />
        </button>

        {/* Page items */}
        {pages.map((page, i) =>
          page === "ellipsis" ? (
            <span
              key={`e-${i}`}
              className={cn(baseItemClass, "text-[var(--text-primary)]")}
              style={{
                width: itemPx,
                height: itemPx,
                fontSize,
                lineHeight: `${lineHeight}px`,
              }}
            >
              <MoreHorizontal style={{ width: 16, height: 16 }} />
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageClick(page)}
              className={cn(
                baseItemClass,
                "rounded-none cursor-pointer",
                page === currentPage
                  ? "bg-[rgba(21,25,26,0.04)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-primary)] hover:bg-[rgba(21,25,26,0.04)] active:bg-[rgba(21,25,26,0.08)]"
              )}
              style={{
                width: itemPx,
                height: itemPx,
                fontSize,
                lineHeight: `${lineHeight}px`,
                fontWeight: 375,
              }}
              aria-current={page === currentPage ? "page" : undefined}
              aria-label={`Page ${page}`}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          disabled={!hasNext}
          onClick={() => {
            const next = currentPage + 1;
            onNextClick?.(next) ?? onPageClick(next);
          }}
          className={cn(
            baseItemClass,
            "rounded-[var(--radius)] text-[var(--text-primary)]",
            hasNext
              ? "cursor-pointer hover:bg-[rgba(21,25,26,0.02)] active:bg-[rgba(21,25,26,0.04)]"
              : "cursor-not-allowed opacity-[0.64]"
          )}
          style={{ width: itemPx, height: itemPx }}
          aria-label="Next page"
        >
          <ChevronRight style={{ width: 20, height: 20 }} />
        </button>
      </nav>
    );
  }
);

DesignPagination.displayName = "DesignPagination";

export { DesignPagination };
