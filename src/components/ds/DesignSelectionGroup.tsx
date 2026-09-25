import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── SelectionItem ─── */

export interface SelectionItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'prefix'> {
  title: string;
  body?: string;
  isSelected?: boolean;
  size?: "default" | "small";
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const SelectionItem = React.forwardRef<HTMLButtonElement, SelectionItemProps>(
  ({ className, title, body, isSelected, size = "default", prefix, suffix, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative flex rounded-[6px] text-left",
          "select-none cursor-pointer",
          size === "default" ? "px-4 py-4" : "px-2 py-2",
          isSelected
            ? "border-[1.5px] border-primary bg-[#E6FAFA]"
            : "border border-border bg-background hover:bg-surface-hover active:bg-surface-active",
          className
        )}
        {...props}
      >
        {prefix && (
          <span className="mr-2 shrink-0 flex items-start pt-[1px] text-content-secondary">
            {prefix}
          </span>
        )}
        <div className="flex-1 min-w-0 flex flex-col" style={{ gap: body ? "4px" : undefined }}>
          <div className="flex items-center">
            <span
              className={cn(
                "flex-1 text-base font-medium leading-[22px] text-foreground",
                !body && "py-[1px]"
              )}
            >
              {title}
            </span>
            {suffix && (
              <span
                className={cn(
                  "ml-2 shrink-0 flex items-center",
                  isSelected ? "text-primary" : "text-content-placeholder"
                )}
              >
                {suffix}
              </span>
            )}
          </div>
          {body && (
            <span className="text-base font-[375] leading-[22px] text-content-secondary">
              {body}
            </span>
          )}
        </div>
      </button>
    );
  }
);

SelectionItem.displayName = "SelectionItem";

/* ─── SelectionGroup ─── */

export interface DesignSelectionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical";
  layout?: "default" | "scroll";
  styling?: "default" | "tight" | "narrow" | "wide";
}

const stylingPadding = {
  tight: "p-0",
  narrow: "p-2",
  default: "p-4",
  wide: "p-6",
} as const;

const DesignSelectionGroup = React.forwardRef<HTMLDivElement, DesignSelectionGroupProps>(
  ({ className, direction = "horizontal", layout = "default", styling = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3",
          stylingPadding[styling],
          direction === "vertical" ? "flex-col" : "flex-row",
          direction === "horizontal" && layout === "scroll" && "overflow-x-auto scrollbar-hide",
          direction === "horizontal" && layout === "default" && "flex-wrap",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
) as React.ForwardRefExoticComponent<DesignSelectionGroupProps & React.RefAttributes<HTMLDivElement>> & {
  SelectionItem: typeof SelectionItem;
};

DesignSelectionGroup.displayName = "DesignSelectionGroup";
DesignSelectionGroup.SelectionItem = SelectionItem;

export { DesignSelectionGroup, SelectionItem };
