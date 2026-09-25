import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

const navigationVariants = cva(
  "flex items-center justify-between h-[52px] p-1 font-sans",
  {
    variants: {
      theme: {
        none: "bg-nav-none text-nav-none-title",
        transparent: "bg-transparent text-nav-transparent-title",
      },
      showDivider: {
        true: "border-b border-divider",
        false: "",
      },
    },
    defaultVariants: {
      theme: "none",
      showDivider: true,
    },
  }
);

export interface DesignNavigationProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof navigationVariants> {
  title?: string;
  leftButton?: React.ReactNode;
  rightButton?: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  children?: React.ReactNode;
}

const DesignNavigation = React.forwardRef<HTMLElement, DesignNavigationProps>(
  ({ className, theme = "none", showDivider = true, title, leftButton, rightButton, showBackButton, onBackClick, children, ...props }, ref) => {
    const hasCustomContent = !!children;

    return (
      <nav ref={ref} className={cn(navigationVariants({ theme, showDivider, className }))} {...props}>
        {hasCustomContent ? (
          <div className="flex-1 px-4">{children}</div>
        ) : (
          <>
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {showBackButton ? (
                <button
                  onClick={onBackClick}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-nav-none-title hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              ) : leftButton}
            </div>
            <div className="flex-1 text-center px-1">
              <span className="text-base font-medium leading-[22px] tracking-[0]">{title}</span>
            </div>
            <div className="w-10 h-10 flex items-center justify-center shrink-0">{rightButton}</div>
          </>
        )}
      </nav>
    );
  }
);

DesignNavigation.displayName = "DesignNavigation";

export { DesignNavigation, navigationVariants };
