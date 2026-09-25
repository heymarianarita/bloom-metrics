import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { DesignTooltip } from "./DesignTooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const chipVariants = cva(
  "inline-flex items-center justify-center border transition-all duration-150 gap-2 font-sans cursor-pointer",
  {
    variants: {
      variant: {
        outlined: "bg-chip-bg border-chip-border text-chip-text hover:bg-chip-hover-bg hover:border-chip-hover-border active:bg-chip-pressed-bg active:border-chip-active-border",
        filled: "bg-chip-filled-bg border-transparent text-chip-filled-text hover:bg-chip-filled-hover-bg active:bg-chip-filled-pressed-bg",
      },
      radius: {
        default: "rounded-[6px]",
        round: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "outlined",
      radius: "default",
    },
  }
);

export interface DesignChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  isActive?: boolean;
  prefixIcon?: React.ReactNode;
  suffix?: React.ReactNode;
  /** "small" matches small buttons and inputs (32px, 14px text). */
  size?: "default" | "small";
}

const DesignChip = React.forwardRef<HTMLButtonElement, DesignChipProps>(
  ({ className, variant, radius, isActive, prefixIcon, suffix, size = "default", children, ...props }, ref) => {
    const textContent = typeof children === "string" ? children : undefined;
    const chip = (
      <button
        className={cn(
          chipVariants({ variant, radius }),
          size === "small"
            ? "h-8 py-1 px-3 gap-1 text-[14px] font-normal leading-[20px] whitespace-nowrap max-w-[240px]"
            : "min-h-[36px] py-2 px-3 text-base font-medium leading-[22px] whitespace-nowrap max-w-[120px] sm:max-w-[160px] md:max-w-[200px]",
          isActive && (variant === "outlined" || !variant) && "bg-chip-active-bg border-chip-active-border",
          isActive && variant === "filled" && "bg-chip-filled-active-bg",
          className
        )}
        ref={ref}
        {...props}
      >
        {prefixIcon && <span className="flex items-center shrink-0">{prefixIcon}</span>}
        <span className="truncate">{children}</span>
        {suffix && <span className="flex items-center text-sm shrink-0">{suffix}</span>}
      </button>
    );

    if (textContent) {
      return (
        <TooltipPrimitive.Provider delayDuration={300}>
          <DesignTooltip content={textContent} side="top">
            {chip}
          </DesignTooltip>
        </TooltipPrimitive.Provider>
      );
    }

    return chip;
  }
);

DesignChip.displayName = "DesignChip";

export { DesignChip, chipVariants };
