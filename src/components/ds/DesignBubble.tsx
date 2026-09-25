import * as React from "react";
import { cn } from "@/lib/utils";

const stylingMap: Record<string, string> = {
  tight: "p-0",
  narrow: "p-2",
  default: "p-4",
  wide: "p-6",
};

export interface DesignBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  text: React.ReactNode;
  footer?: React.ReactNode;
  styling?: "default" | "narrow" | "tight" | "wide";
  inverse?: boolean;
  html?: boolean;
  children?: React.ReactNode;
}

const DesignBubble = React.forwardRef<HTMLDivElement, DesignBubbleProps>(
  ({ className, text, footer, styling = "narrow", inverse = false, html = false, children, ...props }, ref) => {
    const renderContent = (content: React.ReactNode) => {
      if (html && typeof content === "string") {
        return <span dangerouslySetInnerHTML={{ __html: content }} />;
      }

      return content;
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-full rounded-[var(--radius)] border border-[var(--bubble-border)]",
          stylingMap[styling],
          inverse
            ? "bg-[var(--bubble-sent-bg)] text-[var(--bubble-sent-text)]"
            : "bg-[var(--bubble-received-bg)] text-[var(--bubble-received-text)]",
          className
        )}
        {...props}
      >
        <p className="text-base leading-6 whitespace-pre-wrap">{renderContent(text)}</p>

        {children && <div className="mt-2">{children}</div>}

        {footer && (
          <p className="mt-1 text-right text-xs leading-4 text-[var(--bubble-footer-text)]">
            {renderContent(footer)}
          </p>
        )}
      </div>
    );
  }
);

DesignBubble.displayName = "DesignBubble";

export { DesignBubble };
