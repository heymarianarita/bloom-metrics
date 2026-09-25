import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-1 text-xs font-normal leading-4 tracking-normal gap-1",
  {
    variants: {
      theme: {
        primary: "",
        dark: "",
        muted: "",
        success: "",
        error: "",
        highlight: "",
      },
      styling: {
        filled: "border-transparent",
        light: "border-transparent",
      },
    },
    compoundVariants: [
      { theme: "primary", styling: "filled", className: "bg-badge-primary text-badge-primary-text" },
      { theme: "dark", styling: "filled", className: "bg-badge-dark text-badge-dark-text" },
      { theme: "muted", styling: "filled", className: "bg-badge-muted text-badge-muted-text" },
      { theme: "success", styling: "filled", className: "bg-badge-success text-badge-success-text" },
      { theme: "error", styling: "filled", className: "bg-badge-error text-badge-error-text" },
      { theme: "highlight", styling: "filled", className: "bg-badge-highlight text-badge-highlight-text" },
      { theme: "primary", styling: "light", className: "bg-badge-primary-light-bg text-badge-primary-light-text" },
      { theme: "dark", styling: "light", className: "bg-badge-dark-light-bg text-badge-dark-light-text" },
      { theme: "muted", styling: "light", className: "bg-badge-muted-light-bg text-badge-muted-light-text" },
      { theme: "success", styling: "light", className: "bg-badge-success-light-bg text-badge-success-light-text" },
      { theme: "error", styling: "light", className: "bg-badge-error-light-bg text-badge-error-light-text" },
      { theme: "highlight", styling: "light", className: "bg-badge-highlight-light-bg text-badge-highlight-light-text" },
    ],
    defaultVariants: {
      theme: "primary",
      styling: "filled",
    },
  }
);

export interface DesignBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

const DesignBadge = React.forwardRef<HTMLDivElement, DesignBadgeProps>(
  ({ className, theme, styling, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ theme, styling }), className)}
        {...props}
      >
        {icon && <span className="flex items-center">{icon}</span>}
        {children}
      </div>
    );
  }
);
DesignBadge.displayName = "DesignBadge";

export { DesignBadge, badgeVariants };