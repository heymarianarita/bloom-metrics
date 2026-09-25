import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "lifted" | "elevated";
  theme?: "default" | "primaryLight" | "highlightLight";
  /** medium (12px) for top-level containers; small (6px) for nested cards. */
  radius?: "medium" | "small";
}

const DesignCard = React.forwardRef<HTMLDivElement, DesignCardProps>(
  ({ className, variant = "default", theme = "default", radius = "medium", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          radius === "medium" ? "rounded-[12px]" : "rounded-[6px]",
          theme === "default" && "bg-design-card",
          theme === "primaryLight" && "bg-design-card-primary-bg",
          theme === "highlightLight" && "bg-design-card-highlight-bg",
          variant === "default" && "border border-design-card-border shadow-none",
          variant === "lifted" && "border-0 shadow-card-lifted",
          variant === "elevated" && "border-0 shadow-card-elevated",
          className
        )}
        {...props}
      />
    );
  }
);
DesignCard.displayName = "DesignCard";

export { DesignCard };
