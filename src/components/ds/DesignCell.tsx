import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, LucideIcon } from "lucide-react";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignToggle } from "@/components/ds/DesignToggle";

export interface DesignCellProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'prefix'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  bodyText?: string;
  prefix?: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  suffix?: React.ReactNode;
  suffixIcon?: LucideIcon;
  suffixIconClassName?: string;
  showChevron?: boolean;
  showDivider?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  clickable?: boolean;
  styling?: "default" | "tight" | "narrow" | "wide";
  theme?: "default" | "primary" | "muted" | "success" | "transparent";
  validation?: React.ReactNode;
  onClick?: () => void;
  url?: string;
  controlType?: "checkbox" | "radio" | "toggle";
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  radioValue?: string;
}

const stylingMap: Record<string, string> = {
  default: "px-4 py-4",
  tight: "px-4 py-2",
  narrow: "px-2 py-3",
  wide: "px-6 py-5",
};

const DesignCell = React.forwardRef<HTMLDivElement, DesignCellProps>(
  ({
    className, title, subtitle, bodyText, prefix, icon: Icon, iconClassName,
    suffix, suffixIcon: SuffixIcon, suffixIconClassName, showChevron = false,
    showDivider = false, disabled = false, highlighted = false, clickable = false,
    styling = "default", theme = "default", validation, onClick, url, controlType,
    checked, onCheckedChange, radioValue, ...props
  }, ref) => {
    const isClickable = (!!onClick || !!controlType || clickable) && !disabled;

    const handleClick = () => {
      if (disabled) return;
      if (controlType && onCheckedChange) onCheckedChange(!checked);
      onClick?.();
    };

    const handleControlClick = (e: React.MouseEvent) => e.stopPropagation();

    const content = (
      <>
        {prefix && <div className="mr-4 flex-shrink-0 flex items-center">{prefix}</div>}
        {Icon && <Icon className={cn("w-6 h-6 text-muted-foreground mr-4 flex-shrink-0", iconClassName)} />}
        <div className="flex-1 min-w-0">
          <span className="text-base font-medium leading-[22px] text-foreground">{title}</span>
          {bodyText && <p className="text-sm font-normal leading-[18px] text-muted-foreground mt-0.5">{bodyText}</p>}
        </div>
        {subtitle && <span className="text-sm font-normal leading-[18px] text-muted-foreground ml-2 flex-shrink-0">{subtitle}</span>}
        {suffix && <div className="ml-2 flex-shrink-0">{suffix}</div>}
        {controlType === "checkbox" && (
          <div onClick={handleControlClick} className="ml-2 flex-shrink-0">
            <DesignCheckbox checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
          </div>
        )}
        {controlType === "radio" && (
          <div onClick={handleControlClick} className="ml-2 flex-shrink-0">
            <div
              className={cn(
                "h-6 w-6 rounded-full border transition-all duration-150",
                checked
                  ? "border-radio-checked bg-radio-checked"
                  : "border-radio-border bg-transparent hover:bg-radio-hover",
                disabled && "opacity-48 cursor-not-allowed"
              )}
            >
              {checked && (
                <div className="flex items-center justify-center h-full w-full">
                  <div className="h-2 w-2 rounded-full bg-radio-checker" />
                </div>
              )}
            </div>
          </div>
        )}
        {controlType === "toggle" && (
          <div onClick={handleControlClick} className="ml-2 flex-shrink-0">
            <DesignToggle checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
          </div>
        )}
        {SuffixIcon && <SuffixIcon className={cn("w-5 h-5 text-muted-foreground ml-2 flex-shrink-0", suffixIconClassName)} />}
        {showChevron && <ChevronRight className="w-6 h-6 text-muted-foreground ml-2 flex-shrink-0" />}
      </>
    );

    const themeClasses = {
      default: "bg-background",
      primary: "bg-primary-light",
      muted: "bg-muted",
      success: "bg-[var(--success-extra-light,#EBFCEF)]",
      transparent: "bg-transparent",
    };

    const classes = cn(
      "relative flex flex-col transition-colors",
      themeClasses[theme],
      stylingMap[styling],
      isClickable && "cursor-pointer",
      isClickable && "hover:bg-surface-hover active:bg-surface-active",
      highlighted && "bg-cell-hover",
      disabled && "opacity-[0.48] cursor-not-allowed",
      showDivider && "border-b border-divider",
      className
    );

    const inner = (
      <div className="flex items-center w-full">
        {content}
      </div>
    );

    if (url) {
      return (
        <a href={url} className={cn(classes, "no-underline")} {...(props as any)}>
          {inner}
          {validation && <div className="mt-1">{validation}</div>}
        </a>
      );
    }

    return (
      <div ref={ref} onClick={handleClick} className={classes} {...props}>
        {inner}
        {validation && <div className="mt-1">{validation}</div>}
      </div>
    );
  }
);

DesignCell.displayName = "DesignCell";

export { DesignCell };
