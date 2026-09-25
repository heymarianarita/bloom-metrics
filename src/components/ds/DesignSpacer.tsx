import * as React from "react";
import { cn } from "@/lib/utils";

const sizeMap: Record<string, number> = {
  "x-small": 4,
  small: 8,
  regular: 12,
  medium: 16,
  large: 24,
  larger: 32,
  "x-large": 40,
  "x-larger": 48,
  "x2-large": 56,
  "x3-large": 64,
  "x4-large": 80,
};

export interface DesignSpacerProps {
  size?: keyof typeof sizeMap;
  orientation?: "vertical" | "horizontal";
  as?: "span";
  className?: string;
}

const DesignSpacer: React.FC<DesignSpacerProps> = ({
  size = "regular",
  orientation = "vertical",
  as,
  className,
}) => {
  const px = sizeMap[size] ?? 12;
  const style: React.CSSProperties =
    orientation === "horizontal"
      ? { display: "inline-block", width: px, height: "auto", flexShrink: 0 }
      : { display: "block", height: px, width: "100%", flexShrink: 0 };

  const Tag = as === "span" ? "span" : "div";

  return <Tag className={cn(className)} style={style} aria-hidden="true" />;
};

DesignSpacer.displayName = "DesignSpacer";

export { DesignSpacer, sizeMap };
