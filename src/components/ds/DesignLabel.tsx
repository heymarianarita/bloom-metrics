import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  text: React.ReactNode;
  type?: "stacked" | "leading";
  styling?: "default" | "narrow" | "wide";
  suffix?: React.ReactNode;
}

const stylingPadding = {
  default: "py-3",
  narrow: "py-2",
  wide: "py-4",
} as const;

const DesignLabel = React.forwardRef<HTMLDivElement, DesignLabelProps>(
  ({ className, text, type = "stacked", styling = "default", suffix, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "px-4",
          stylingPadding[styling],
          type === "leading" && "flex items-center gap-3",
          className
        )}
        {...props}
      >
        <div className={cn("flex items-center justify-between", type === "leading" && "flex-shrink-0")}>
          <span className="text-sm font-normal leading-[18px] text-content-secondary">{text}</span>
          {suffix && <span className="ml-2">{suffix}</span>}
        </div>
        {children}
      </div>
    );
  }
);

DesignLabel.displayName = "DesignLabel";

export { DesignLabel };
