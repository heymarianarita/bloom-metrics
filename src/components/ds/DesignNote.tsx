import * as React from "react";
import { cn } from "@/lib/utils";

const stylingMap: Record<string, string> = {
  narrow: "px-2 py-1",
  default: "px-4 py-2",
  wide: "px-6 py-3",
};

const alignmentMap: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export interface DesignNoteProps extends React.HTMLAttributes<HTMLParagraphElement> {
  text: React.ReactNode;
  styling?: "default" | "narrow" | "wide";
  alignment?: "left" | "center" | "right";
  inverse?: boolean;
}

const DesignNote = React.forwardRef<HTMLParagraphElement, DesignNoteProps>(
  ({ className, text, styling = "default", alignment = "left", inverse = false, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-xs leading-4 text-[var(--note-text)]",
          stylingMap[styling],
          alignmentMap[alignment],
          inverse && "pt-0 pb-2",
          className
        )}
        {...props}
      >
        {text}
      </p>
    );
  }
);

DesignNote.displayName = "DesignNote";

export { DesignNote };
