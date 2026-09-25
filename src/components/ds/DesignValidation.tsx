import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

const themeMap: Record<string, { color: string; Icon: React.FC<{ className?: string }> }> = {
  primary: { color: "var(--primary)", Icon: Info },
  dark: { color: "var(--text-strong)", Icon: AlertCircle },
  muted: { color: "var(--text-subtle)", Icon: Info },
  success: { color: "var(--success-default)", Icon: CheckCircle },
  caution: { color: "var(--highlight-default)", Icon: AlertTriangle },
  destructive: { color: "var(--destructive)", Icon: AlertCircle },
};

export interface DesignValidationProps extends React.HTMLAttributes<HTMLDivElement> {
  text: React.ReactNode;
  theme?: "primary" | "dark" | "muted" | "success" | "caution" | "destructive";
  hideIcon?: boolean;
}

const DesignValidation = React.forwardRef<HTMLDivElement, DesignValidationProps>(
  ({ className, text, theme = "primary", hideIcon = false, ...props }, ref) => {
    const { color, Icon } = themeMap[theme] ?? themeMap.primary;

    return (
      <div
        ref={ref}
        className={cn("flex items-start gap-1.5 mt-1", className)}
        style={{ color }}
        {...props}
      >
        {!hideIcon && <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <span className="text-xs leading-4">{text}</span>
      </div>
    );
  }
);

DesignValidation.displayName = "DesignValidation";

export { DesignValidation };