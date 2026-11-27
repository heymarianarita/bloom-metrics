import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const loaderVariants = cva(
  "inline-flex items-center justify-center rounded-full",
  {
    variants: {
      size: {
        small: "w-4 h-4",
        medium: "w-6 h-6",
        default: "w-8 h-8",
        large: "w-10 h-10",
        "x-large": "w-12 h-12",
      },
      theme: {
        primary: "text-btn-primary",
        success: "text-btn-success",
        error: "text-btn-error",
        highlight: "text-btn-highlight",
        muted: "text-btn-muted",
        dark: "text-btn-dark",
      },
    },
    defaultVariants: {
      size: "default",
      theme: "primary",
    },
  }
);

const iconSizes: Record<string, number> = {
  small: 10,
  medium: 14,
  default: 18,
  large: 22,
  "x-large": 26,
};

export interface DesignLoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loaderVariants> {
  lifted?: boolean;
  state?: "loading" | "success" | "failed";
}

const DesignLoader = React.forwardRef<HTMLDivElement, DesignLoaderProps>(
  ({ className, size = "default", theme = "primary", lifted, state = "loading", ...props }, ref) => {
    const iconSize = iconSizes[size || "default"];

    const content = (
      <div
        ref={ref}
        className={cn(loaderVariants({ size, theme }), className)}
        role="status"
        aria-label={state === "loading" ? "Loading" : state === "success" ? "Success" : "Failed"}
        {...props}
      >
        {state === "loading" && (
          <div className="w-full h-full rounded-full border-[3px] border-current border-t-transparent animate-spin" />
        )}
        {state === "success" && (
          <Check size={iconSize} strokeWidth={2.5} className="text-btn-success" />
        )}
        {state === "failed" && (
          <X size={iconSize} strokeWidth={2.5} className="text-btn-error" />
        )}
      </div>
    );

    if (lifted) {
      return (
        <div className="inline-flex items-center justify-center p-4 rounded-lg bg-background shadow-card-lifted">
          {content}
        </div>
      );
    }

    return content;
  }
);
DesignLoader.displayName = "DesignLoader";

export { DesignLoader, loaderVariants };
