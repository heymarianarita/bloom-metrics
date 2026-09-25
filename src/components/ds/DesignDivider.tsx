import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignDividerProps extends React.HTMLAttributes<HTMLHRElement> {
  margin?: string | number;
}

const DesignDivider = React.forwardRef<HTMLHRElement, DesignDividerProps>(
  ({ className, margin = 24, style, ...props }, ref) => {
    return (
      <hr
        ref={ref}
        className={cn("w-full h-px border-0 bg-divider", className)}
        style={{
          marginTop: typeof margin === 'number' ? `${margin}px` : margin,
          marginBottom: typeof margin === 'number' ? `${margin}px` : margin,
          ...style,
        }}
        {...props}
      />
    );
  }
);

DesignDivider.displayName = "DesignDivider";

export { DesignDivider };
