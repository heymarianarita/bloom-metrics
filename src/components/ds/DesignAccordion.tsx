import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type AccordionSize = "narrow" | "default" | "wide";

export interface DesignAccordionProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  size?: AccordionSize;
  disabled?: boolean;
  className?: string;
}

const sizeStyles: Record<AccordionSize, { header: string; body: string }> = {
  narrow: {
    header: "px-2 py-2 gap-2",
    body: "px-2 py-2 gap-2",
  },
  default: {
    header: "px-4 py-4 gap-2",
    body: "px-4 py-4 gap-2",
  },
  wide: {
    header: "px-6 py-6 gap-3",
    body: "px-6 py-6 gap-3",
  },
};

const DesignAccordion = React.forwardRef<HTMLDivElement, DesignAccordionProps>(
  (
    {
      title,
      subtitle,
      children,
      isExpanded = false,
      onToggle,
      size = "default",
      disabled = false,
      className,
    },
    ref
  ) => {
    const styles = sizeStyles[size];

    return (
      <div
        ref={ref}
        className={cn("bg-background", className)}
      >
        {/* Header */}
        <button
          onClick={() => !disabled && onToggle?.(!isExpanded)}
          disabled={disabled}
          className={cn(
            "relative flex items-center justify-between w-full text-left transition-colors",
            styles.header,
            disabled
              ? "opacity-48 cursor-not-allowed"
              : "cursor-pointer hover:bg-[rgba(21,25,26,0.02)] active:bg-[rgba(21,25,26,0.04)]"
          )}
        >
          <div className="flex flex-col gap-[2px] min-w-0 flex-1">
            <span className="text-[16px] font-medium leading-[22px] text-content">
              {title}
            </span>
            {subtitle && (
              <span className="text-[14px] font-normal leading-[18px] text-content-secondary">
                {subtitle}
              </span>
            )}
          </div>
          <ChevronRight
            className={cn(
              "w-6 h-6 shrink-0 ml-2 text-content-secondary transition-transform duration-200 ease-in-out",
              isExpanded && "rotate-90"
            )}
          />
        </button>

        {/* Body */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div
            className={cn(
              "text-[16px] font-normal leading-[22px] text-content-secondary",
              styles.body
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
DesignAccordion.displayName = "DesignAccordion";

export { DesignAccordion };
