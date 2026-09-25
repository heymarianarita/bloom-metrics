import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Click handler — omit for the current (last) crumb */
  onClick?: () => void;
}

export interface DesignPageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title — should be concise and fit a single line */
  title: string;
  /** Optional status indicator rendered inline with the title */
  statusIndicator?: React.ReactNode;
  /** Optional subtitle / additional information below the title */
  subtitle?: string;
  /** Breadcrumb trail — last item is treated as the current page */
  breadcrumbs?: BreadcrumbItem[];
  /** Primary action (right-most, filled button) */
  primaryAction?: React.ReactNode;
  /** Secondary / tertiary actions placed left of the primary action */
  secondaryActions?: React.ReactNode;
  /** Icon-button group rendered before the text actions */
  iconActions?: React.ReactNode;
  /** Whether to show the back chevron before breadcrumbs */
  showBackChevron?: boolean;
  /** Click handler for the back chevron */
  onBackClick?: () => void;
}

export const DesignPageHeader = React.forwardRef<HTMLDivElement, DesignPageHeaderProps>(
  (
    {
      title,
      statusIndicator,
      subtitle,
      breadcrumbs,
      primaryAction,
      secondaryActions,
      iconActions,
      showBackChevron = true,
      onBackClick,
      className,
      ...props
    },
    ref
  ) => {
    const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0;

    return (
      <div ref={ref} className={cn("flex flex-col gap-6", className)} {...props}>
        {/* Breadcrumbs */}
        {hasBreadcrumbs && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            {showBackChevron && (
              <button
                onClick={onBackClick ?? breadcrumbs[0]?.onClick}
                className="flex items-center justify-center w-5 h-5 text-primary hover:text-primary/80 transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-muted-foreground">/</span>}
                  {isLast ? (
                    <span className="text-muted-foreground">{crumb.label}</span>
                  ) : (
                    <button
                      onClick={crumb.onClick}
                      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      {crumb.label}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1
                className="text-[22px] font-[580] text-foreground truncate"
                title={title}
              >
                {title}
              </h1>
              {statusIndicator}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* Actions */}
          {(iconActions || secondaryActions || primaryAction) && (
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {iconActions && (
                <div className="flex items-center gap-1">{iconActions}</div>
              )}
              {secondaryActions}
              {primaryAction}
            </div>
          )}
        </div>
      </div>
    );
  }
);

DesignPageHeader.displayName = "DesignPageHeader";
