import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignDoubleImageProps extends React.HTMLAttributes<HTMLDivElement> {
  primary: React.ReactElement;
  secondary: React.ReactElement;
  secondaryBorder?: "default";
  relationship?: "default" | "tight";
}

const DesignDoubleImage = React.forwardRef<HTMLDivElement, DesignDoubleImageProps>(
  ({ className, primary, secondary, secondaryBorder, relationship = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative inline-flex", className)}
        {...props}
      >
        <div className="relative">{primary}</div>
        <div
          className={cn(
            "absolute bottom-0",
            relationship === "tight" ? "right-[-8px]" : "right-[-16px]",
            secondaryBorder && "rounded-full ring-2 ring-[var(--double-image-border)]"
          )}
        >
          {secondary}
        </div>
      </div>
    );
  }
);

DesignDoubleImage.displayName = "DesignDoubleImage";

export { DesignDoubleImage };
