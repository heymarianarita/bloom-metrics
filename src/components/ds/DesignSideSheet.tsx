import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";


export interface DesignSideSheetProps {
  /** Controlled open state */
  open?: boolean;
  /** Called when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Title displayed in the header */
  title?: string;
  /** Width of the side sheet. Defaults to "33.33vw" */
  width?: string;
  /** Minimum width. Defaults to "360px" */
  minWidth?: string;
  /** Whether to darken the page behind the sheet. Defaults to true */
  overlay?: boolean;
  /** Content rendered in the scrollable body */
  children?: React.ReactNode;
  /** Footer content. If not provided, no footer is rendered */
  footer?: React.ReactNode;
  /** Additional className for the sheet content container */
  className?: string;
}

const DesignSideSheet = ({
  open,
  onOpenChange,
  title,
  width = "33.33vw",
  minWidth = "360px",
  overlay = true,
  children,
  footer,
  className,
}: DesignSideSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName={cn(
          "duration-200",
          overlay ? "bg-[var(--sheet-overlay-bg)]" : "bg-transparent",
        )}
        className={cn(
          "p-0 gap-0 flex flex-col rounded-none border-l border-[var(--border)] shadow-[var(--sheet-shadow)]",
          className
        )}
        style={{ width, minWidth }}
      >
        {/* Header */}
        {title && (
          <div className="px-4 h-[60px] flex items-center justify-between shrink-0 border-b border-[var(--border)]">
            <SheetTitle className="text-lg font-semibold text-[var(--foreground)]">{title}</SheetTitle>
            <button
              onClick={() => onOpenChange?.(false)}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[var(--foreground)] hover:bg-[rgba(21,25,26,0.04)] cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 h-[85px] flex items-center justify-end gap-3 shrink-0 border-t border-[var(--border)] [&_button]:whitespace-nowrap">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

DesignSideSheet.displayName = "DesignSideSheet";

export { DesignSideSheet };
