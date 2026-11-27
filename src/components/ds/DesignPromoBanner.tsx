import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X, ChevronRight } from "lucide-react";

const promoBannerVariants = cva(
  "relative rounded-[12px] bg-promo-bg p-4",
  {
    variants: {
      spacing: {
        tight: "",
        narrow: "m-2",
        default: "m-4",
        wide: "m-6",
      },
    },
    defaultVariants: {
      spacing: "tight",
    },
  }
);

export interface DesignPromoBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof promoBannerVariants> {
  title?: string;
  body?: string;
  actionText?: string;
  onAction?: () => void;
  closable?: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
}

const DesignPromoBanner = React.forwardRef<HTMLDivElement, DesignPromoBannerProps>(
  (
    {
      className,
      spacing,
      title,
      body,
      actionText,
      onAction,
      closable,
      onClose,
      icon,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(promoBannerVariants({ spacing, className }))}
        {...props}
      >
        {/* Interaction overlay */}
        <div className="absolute inset-0 rounded-[12px] bg-promo-overlay opacity-0 hover:opacity-[0.02] active:opacity-[0.08] transition-opacity pointer-events-none" />

        <div className="relative flex gap-3">
          {/* Main icon – 32px */}
          {icon && (
            <div className="shrink-0 w-8 h-8 flex items-center justify-center">
              {icon}
            </div>
          )}

          {/* Content container */}
          <div className="flex-1 min-w-0 max-w-[600px] space-y-1">
            {title && (
              <h4 className="text-base font-medium leading-[22px] tracking-[0] text-promo-text">
                {title}
              </h4>
            )}
            {body && (
              <p className="text-sm font-normal leading-[18px] tracking-[0] text-promo-text">
                {body}
              </p>
            )}
            {actionText && (
              <button
                onClick={onAction}
                className="mt-0.5 inline-flex items-center gap-0.5 text-sm font-medium leading-[18px] tracking-[0] text-promo-action hover:underline"
              >
                {actionText}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Close button – 44px interaction area */}
          {closable && (
            <button
              onClick={onClose}
              className="shrink-0 w-11 h-11 -mr-1 -mt-[5px] ml-auto flex items-center justify-center text-promo-text hover:opacity-70 transition-opacity"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

DesignPromoBanner.displayName = "DesignPromoBanner";

export { DesignPromoBanner, promoBannerVariants };
