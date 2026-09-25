import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from "lucide-react";

const notificationVariants = cva(
  "flex items-start gap-2 rounded-[6px] bg-background px-4 py-4 min-w-[320px] max-w-[480px] shadow-[0_4px_16px_0_rgba(21,25,26,0.24)]",
  {
    variants: {
      variant: {
        info: "",
        success: "",
        warning: "",
        error: "",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const variantIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const variantIconColors = {
  info: "text-note",
  success: "text-note",
  warning: "text-note",
  error: "text-note",
};

export interface DesignNotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  body: React.ReactNode;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  showClose?: boolean;
  forceVisibility?: boolean;
  displayDuration?: number;
  onClose?: (closeType: "timeout" | "manual") => void;
}

const DesignNotification = React.forwardRef<HTMLDivElement, DesignNotificationProps>(
  (
    {
      className,
      variant = "info",
      body,
      icon,
      suffix,
      showClose,
      forceVisibility = false,
      displayDuration,
      onClick,
      onClose,
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = React.useState(true);

    React.useEffect(() => {
      if (displayDuration && !forceVisibility) {
        const timer = setTimeout(() => {
          setVisible(false);
          onClose?.("timeout");
        }, displayDuration);
        return () => clearTimeout(timer);
      }
    }, [displayDuration, forceVisibility, onClose]);

    if (!visible && !forceVisibility) return null;

    const resolvedVariant = variant || "info";
    const IconComponent = variantIcons[resolvedVariant];
    const iconColorClass = variantIconColors[resolvedVariant];

    const handleClose = (e: React.MouseEvent) => {
      e.stopPropagation();
      setVisible(false);
      onClose?.("manual");
    };

    return (
      <div
        ref={ref}
        className={cn(
          notificationVariants({ variant }),
          onClick && "cursor-pointer transition-colors",
          className
        )}
        onClick={onClick}
        role={onClick ? "button" : "status"}
        tabIndex={onClick ? 0 : undefined}
        {...props}
      >
        {/* Icon */}
        {icon !== null && (
          <span className={cn("flex-shrink-0 mt-px", iconColorClass)}>
            {icon || <IconComponent className="w-6 h-6" />}
          </span>
        )}

        {/* Body */}
        <span className="flex-1 text-base font-normal leading-[22px] tracking-[0] text-note">
          {body}
        </span>

        {/* Suffix or Close */}
        {suffix && (
          <span className="flex-shrink-0 text-note ml-3">
            {suffix}
          </span>
        )}
        {showClose && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-3 w-6 h-6 flex items-center justify-center rounded transition-colors text-note hover:bg-[rgba(21,25,26,0.02)] active:bg-[rgba(21,25,26,0.04)]"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

DesignNotification.displayName = "DesignNotification";

export { DesignNotification, notificationVariants };
