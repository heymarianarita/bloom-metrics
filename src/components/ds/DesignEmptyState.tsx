import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  body?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const DesignEmptyState = React.forwardRef<HTMLDivElement, DesignEmptyStateProps>(
  ({ title, body, icon, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}
        {...props}
      >
        {icon && <div className="mb-4 text-content-secondary">{icon}</div>}
        <h3 className="text-lg font-medium text-content mb-2">{title}</h3>
        {body && <p className="text-sm text-content-secondary mb-6 max-w-xs">{body}</p>}
        {action && <div>{action}</div>}
      </div>
    );
  }
);

DesignEmptyState.displayName = "DesignEmptyState";

export { DesignEmptyState };
