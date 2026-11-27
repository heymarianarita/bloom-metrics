import * as React from "react";
import { cn } from "@/lib/utils";
import { DesignDivider } from "@/components/ds/DesignDivider";

export interface DesignListProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "vertical" | "horizontal";
  dividerBetween?: boolean;
  showStartDivider?: boolean;
  showEndDivider?: boolean;
  scroll?: boolean;
}

const DesignList = React.forwardRef<HTMLDivElement, DesignListProps>(
  (
    {
      className,
      children,
      direction = "vertical",
      dividerBetween = false,
      showStartDivider = false,
      showEndDivider = false,
      scroll = false,
      ...props
    },
    ref
  ) => {
    const items = React.Children.toArray(children);

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          direction === "vertical" ? "flex-col" : "flex-row",
          scroll && (direction === "horizontal" ? "overflow-x-auto" : "overflow-y-auto"),
          className
        )}
        {...props}
      >
        {showStartDivider && <DesignDivider margin={0} />}

        {items.map((child, i) => (
          <React.Fragment key={i}>
            {child}
            {dividerBetween && i < items.length - 1 && <DesignDivider margin={0} />}
          </React.Fragment>
        ))}

        {showEndDivider && <DesignDivider margin={0} />}
      </div>
    );
  }
);

DesignList.displayName = "DesignList";

export { DesignList };
