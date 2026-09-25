import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export interface DesignTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const DesignTooltip: React.FC<DesignTooltipProps> = ({
  content,
  children,
  side = "top",
  className,
}) => {
  // Nothing to say (e.g. a table cell holding only a control): don't open an empty bubble.
  const isEmpty =
    content === null ||
    content === undefined ||
    content === false ||
    (typeof content === "string" && content.trim() === "");
  if (isEmpty) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={4}
          className={cn(
            "z-50 max-w-[276px] rounded-[6px] bg-tooltip-bg px-2 py-2 text-tooltip-text",
            "text-sm font-[375] leading-[18px] text-left",
            "animate-in fade-in-0 data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow
            width={16}
            height={8}
            className="fill-tooltip-bg"
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
DesignTooltip.displayName = "DesignTooltip";

export { DesignTooltip };
