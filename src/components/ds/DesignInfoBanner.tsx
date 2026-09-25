import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { DesignButton } from "./DesignButton";
import {
  InfoFilledIcon,
  SuccessFilledIcon,
  WarningFilledIcon,
  ErrorFilledIcon,
} from "./icons/BannerIcons";

const bannerVariants = cva(
  "relative rounded-[6px] p-4 font-sans",
  {
    variants: {
      type: {
        info: "bg-banner-info",
        success: "bg-banner-success",
        warning: "bg-banner-warning",
        error: "bg-banner-error",
      },
    },
    defaultVariants: {
      type: "info",
    },
  }
);

const iconColors = {
  info: "text-banner-info-icon",
  success: "text-banner-success-icon",
  warning: "text-banner-warning-icon",
  error: "text-banner-error-icon",
};

const linkColors = {
  info: "text-banner-info-link hover:underline",
  success: "text-banner-success-link hover:underline",
  warning: "text-banner-warning-link hover:underline",
  error: "text-banner-error-link hover:underline",
};

const IconMap = {
  info: InfoFilledIcon,
  success: SuccessFilledIcon,
  warning: WarningFilledIcon,
  error: ErrorFilledIcon,
};

const buttonThemes = {
  info: "primary",
  success: "success",
  warning: "highlight",
  error: "error",
} as const;

export interface DesignInfoBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  linkLabel?: string;
  linkHref?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const DesignInfoBanner = React.forwardRef<HTMLDivElement, DesignInfoBannerProps>(
  ({ className, type = "info", title, description, actionLabel, onAction, linkLabel, linkHref, onClose, showCloseButton = true, ...props }, ref) => {
    const Icon = IconMap[type || "info"];
    const buttonTheme = buttonThemes[type || "info"];

    return (
      <div className={cn(bannerVariants({ type, className }))} ref={ref} {...props}>
        <div className="flex gap-3">
          <div className={cn("shrink-0 -mt-[1px]", iconColors[type || "info"])}>
            <Icon size={24} />
          </div>
          <div className="flex-1 max-w-[600px] space-y-3">
            <div className="space-y-0.5">
              {title && <h4 className="text-base font-medium leading-[22px] text-banner-text">{title}</h4>}
              {description && <p className="text-sm font-normal leading-[18px] text-banner-text">{description}</p>}
            </div>
            {(actionLabel || linkLabel) && (
              <div className="flex flex-wrap items-center gap-2">
                {actionLabel && (
                  <DesignButton size="small" theme={buttonTheme} variant="filled" onClick={onAction}>
                    {actionLabel}
                  </DesignButton>
                )}
                {linkLabel && linkHref && (
                  <a href={linkHref} className={cn("text-sm font-medium", linkColors[type || "info"])}>{linkLabel}</a>
                )}
              </div>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="shrink-0 w-11 h-11 -mr-1 -mt-[5px] ml-auto flex items-center justify-center text-banner-text hover:opacity-70 transition-opacity"
              aria-label="Close banner"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

DesignInfoBanner.displayName = "DesignInfoBanner";

export { DesignInfoBanner, bannerVariants };