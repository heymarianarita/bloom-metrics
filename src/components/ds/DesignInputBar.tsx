import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignInputBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftIconClick?: () => void;
  onRightIconClick?: () => void;
  multiline?: boolean;
  maxRows?: number;
  /** "small" matches DesignInputSelect size="small" (32px, 14px text) */
  size?: "default" | "small";
}

export interface TextAreaBarProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftIconClick?: () => void;
  onRightIconClick?: () => void;
  maxRows?: number;
}

const DesignInputBar = React.forwardRef<HTMLInputElement, DesignInputBarProps>(
  ({ className, leftIcon, rightIcon, onLeftIconClick, onRightIconClick, multiline, maxRows = 5, size = "default", ...props }, ref) => {
    if (multiline) {
      return (
        <DesignTextAreaBar
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          onLeftIconClick={onLeftIconClick}
          onRightIconClick={onRightIconClick}
          maxRows={maxRows}
          className={className}
          {...(props as unknown as TextAreaBarProps)}
        />
      );
    }

    return (
      <div className={cn(
        "flex items-center gap-1 bg-inputbar rounded-md",
        size === "small" ? "min-h-[32px] px-3 py-1" : "min-h-[36px] px-[11px] py-[7px]",
        className
      )}>
        {leftIcon && (
          <span
            className={cn(
              "flex-shrink-0 text-inputbar-icon w-4 h-4 flex items-center justify-center",
              onLeftIconClick && "cursor-pointer hover:opacity-70"
            )}
            onClick={onLeftIconClick}
          >
            {leftIcon}
          </span>
        )}
        <input
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            size === "small" ? "text-[14px] font-normal leading-[18px] tracking-normal" : "text-base font-normal leading-[22px] tracking-normal",
            "text-inputbar-text placeholder:text-inputbar-placeholder",
            "caret-inputbar-cursor"
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <span
            className={cn(
              "flex-shrink-0 text-primary w-4 h-4 flex items-center justify-center",
              onRightIconClick && "cursor-pointer hover:opacity-70"
            )}
            onClick={onRightIconClick}
          >
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

const DesignTextAreaBar = React.forwardRef<HTMLTextAreaElement, TextAreaBarProps>(
  ({ className, leftIcon, rightIcon, onLeftIconClick, onRightIconClick, maxRows = 5, ...props }, ref) => {
    return (
      <div className={cn(
        "flex items-start gap-1 bg-inputbar rounded-md min-h-[36px] px-[11px] py-[7px]",
        className
      )}>
        {leftIcon && (
          <span
            className={cn(
              "flex-shrink-0 text-inputbar-icon w-4 h-4 flex items-center justify-center mt-[3px]",
              onLeftIconClick && "cursor-pointer hover:opacity-70"
            )}
            onClick={onLeftIconClick}
          >
            {leftIcon}
          </span>
        )}
        <textarea
          className={cn(
            "flex-1 bg-transparent border-none outline-none resize-none",
            "text-base font-normal leading-[22px] tracking-normal",
            "text-inputbar-text placeholder:text-inputbar-placeholder",
            "caret-inputbar-cursor"
          )}
          ref={ref}
          rows={1}
          style={{ maxHeight: `${maxRows * 22}px` }}
          {...props}
        />
        {rightIcon && (
          <span
            className={cn(
              "flex-shrink-0 text-primary w-4 h-4 flex items-center justify-center mt-[3px]",
              onRightIconClick && "cursor-pointer hover:opacity-70"
            )}
            onClick={onRightIconClick}
          >
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

DesignInputBar.displayName = "DesignInputBar";
DesignTextAreaBar.displayName = "DesignTextAreaBar";

export { DesignInputBar, DesignTextAreaBar };
