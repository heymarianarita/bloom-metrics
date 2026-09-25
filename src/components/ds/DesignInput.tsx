import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Text Input ─── */

export interface DesignInputTextProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  /** Label displayed above the input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Validation message below the input */
  validation?: string;
  /** Helper text below the input (shown when no validation) */
  helperText?: string;
  /** Error state — red border + red validation */
  error?: boolean;
  /** Success state — green validation text */
  success?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size: default (44px) or small (36px) */
  size?: "default" | "small";
  /** Leading icon or text */
  prefix?: React.ReactNode;
  /** Trailing icon or text */
  suffix?: React.ReactNode;
  /** Additional className */
  className?: string;

  // Legacy aliases
  /** @deprecated Use `label` */
  title?: string;
  /** @deprecated Use `helperText` */
  note?: string;
}

const DesignInputText = React.forwardRef<HTMLInputElement, DesignInputTextProps>(
  (
    {
      className,
      label,
      title,
      placeholder,
      validation,
      helperText,
      note,
      error = false,
      success = false,
      disabled = false,
      size = "default",
      prefix,
      suffix,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false);
    const resolvedLabel = label || title;
    const resolvedHelper = helperText || note;
    const isSmall = size === "small";

    return (
      <div className={cn("flex flex-col", className)}>
        {/* Label */}
        {resolvedLabel && (
          <label className="text-[14px] leading-[18px] font-normal text-[var(--input-title)] mb-1">
            {resolvedLabel}
          </label>
        )}

        {/* Input container */}
        <div
          className={cn(
            "flex items-center rounded-[6px] border transition-all bg-[var(--background)]",
            // Height
            isSmall ? "min-h-[36px]" : "min-h-[44px]",
            // Padding
            isSmall ? "px-3" : "px-3",
            // Border color
            error
              ? "border-[var(--error-default)]"
              : success && focused
              ? "border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
              : focused
              ? "border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
              : disabled
              ? "border-[var(--greyscale-4)] bg-[var(--greyscale-5)]"
              : "border-[var(--border)]",
            // Hover
            !disabled && !focused && !error && "hover:border-[var(--greyscale-3)]",
            disabled && "cursor-not-allowed"
          )}
        >
          {/* Prefix */}
          {prefix && (
            <span className="mr-2 flex-shrink-0 text-[var(--input-icon)] flex items-center">
              {prefix}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "flex-1 bg-transparent outline-none min-w-0",
              isSmall ? "text-[14px] leading-[18px]" : "text-[16px] leading-[22px]",
              "font-normal",
              "text-[var(--input-value)] placeholder:text-[var(--input-placeholder)]",
              "caret-[var(--primary)]",
              disabled && "cursor-not-allowed text-[var(--greyscale-3)]"
            )}
            {...props}
          />

          {/* Suffix */}
          {suffix && (
            <span className="ml-2 flex-shrink-0 text-[var(--input-icon)] flex items-center">
              {suffix}
            </span>
          )}
        </div>

        {/* Validation */}
        {validation && (
          <span
            className={cn(
              "text-[12px] leading-[16px] font-normal mt-1",
              error
                ? "text-[var(--error-default)]"
                : success
                ? "text-[var(--btn-success)]"
                : "text-[var(--input-title)]"
            )}
          >
            {validation}
          </span>
        )}

        {/* Helper text */}
        {resolvedHelper && !validation && (
          <span className="text-[12px] leading-[16px] font-normal mt-1 text-[var(--input-title)]">
            {resolvedHelper}
          </span>
        )}
      </div>
    );
  }
);

DesignInputText.displayName = "DesignInputText";

/* ─── Text Area ─── */

export interface DesignInputTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label displayed above the textarea */
  label?: string;
  /** Validation message */
  validation?: string;
  /** Helper text */
  helperText?: string;
  /** Error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Number of rows */
  rows?: number;
  /** Trailing content */
  suffix?: React.ReactNode;
  /** Additional className */
  className?: string;

  /** @deprecated Use `label` */
  title?: string;
  /** @deprecated Use `helperText` */
  note?: string;
}

const DesignInputTextArea = React.forwardRef<
  HTMLTextAreaElement,
  DesignInputTextAreaProps
>(
  (
    {
      className,
      label,
      title,
      validation,
      helperText,
      note,
      error = false,
      success = false,
      disabled = false,
      rows = 5,
      suffix,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false);
    const resolvedLabel = label || title;
    const resolvedHelper = helperText || note;

    return (
      <div className={cn("flex flex-col", className)}>
        {/* Label */}
        {resolvedLabel && (
          <label className="text-[14px] leading-[18px] font-normal text-[var(--input-title)] mb-1">
            {resolvedLabel}
          </label>
        )}

        {/* Textarea container */}
        <div
          className={cn(
            "flex rounded-[6px] border transition-all bg-[var(--background)] px-3 py-2.5",
            error
              ? "border-[var(--error-default)]"
              : focused
              ? "border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
              : disabled
              ? "border-[var(--greyscale-4)] bg-[var(--greyscale-5)]"
              : "border-[var(--border)]",
            !disabled && !focused && !error && "hover:border-[var(--greyscale-3)]",
            disabled && "cursor-not-allowed"
          )}
        >
          <textarea
            ref={ref}
            rows={rows}
            disabled={disabled}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "flex-1 bg-transparent outline-none resize-none min-w-0",
              "text-[16px] leading-[22px] font-normal",
              "text-[var(--input-value)] placeholder:text-[var(--input-placeholder)]",
              "caret-[var(--primary)]",
              disabled && "cursor-not-allowed text-[var(--greyscale-3)]"
            )}
            {...props}
          />
          {suffix && (
            <span className="ml-2 flex-shrink-0 text-[var(--input-icon)] flex items-start pt-0.5">
              {suffix}
            </span>
          )}
        </div>

        {/* Validation */}
        {validation && (
          <span
            className={cn(
              "text-[12px] leading-[16px] font-normal mt-1",
              error
                ? "text-[var(--error-default)]"
                : success
                ? "text-[var(--btn-success)]"
                : "text-[var(--input-title)]"
            )}
          >
            {validation}
          </span>
        )}

        {/* Helper text */}
        {resolvedHelper && !validation && (
          <span className="text-[12px] leading-[16px] font-normal mt-1 text-[var(--input-title)]">
            {resolvedHelper}
          </span>
        )}
      </div>
    );
  }
);

DesignInputTextArea.displayName = "DesignInputTextArea";

export { DesignInputText, DesignInputTextArea };
