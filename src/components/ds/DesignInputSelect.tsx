import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

export interface DesignInputSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DesignInputSelectProps {
  /** Label text displayed above the select */
  label?: string;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** List of selectable options */
  options: DesignInputSelectOption[];
  /** Controlled value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Validation message displayed below the select */
  validation?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error state — red border + red validation text */
  error?: boolean;
  /** Disabled state — gray background, no interaction */
  disabled?: boolean;
  /** Size variant: default (44px), medium (36px), or small (32px) */
  size?: "default" | "medium" | "small";
  /** Text configuration: placeholder (default) or filled (dark bg) */
  style?: "placeholder" | "filled";
  /** Leading icon */
  icon?: React.ReactNode;
  /** Additional class name */
  className?: string;

  // Legacy aliases
  /** @deprecated Use `label` instead */
  title?: string;
  /** @deprecated Use `helperText` instead */
  note?: string;
}

const DesignInputSelect = React.forwardRef<HTMLDivElement, DesignInputSelectProps>(
  (
    {
      className,
      label,
      title,
      placeholder = "Select",
      options,
      value,
      defaultValue,
      onChange,
      validation,
      helperText,
      note,
      error = false,
      disabled = false,
      size = "default",
      style = "placeholder",
      icon,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const currentValue = value !== undefined ? value : internalValue;
    const selectedOption = options.find((opt) => opt.value === currentValue);
    const resolvedLabel = label || title;
    const resolvedHelper = helperText || note;
    const hasValue = !!selectedOption;
    const isFilled = style === "filled";
    const isSmall = size === "small";
    const isMedium = size === "medium";

    // Close dropdown on outside click
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close on Escape
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
      }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
      if (value === undefined) setInternalValue(optionValue);
      onChange?.(optionValue);
      setIsOpen(false);
    };

    const handleToggle = () => {
      if (disabled) return;
      setIsOpen((prev) => !prev);
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col relative", className)}
      >
        {/* Label */}
        {resolvedLabel && (
          <label className="text-[14px] leading-[18px] font-normal text-[var(--input-title)] mb-1">
            {resolvedLabel}
          </label>
        )}

        <div ref={dropdownRef} className="relative">
          {/* Select trigger — boxed style */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={cn(
              "w-full flex items-center justify-between rounded-[6px] transition-all outline-none cursor-pointer",
              // Padding
              isSmall ? "px-3 py-1" : isMedium ? "px-3 py-1.5" : "px-3 py-2.5",
              // Height
              isSmall ? "min-h-[32px]" : isMedium ? "min-h-[36px]" : "min-h-[44px]",
              // Background
              disabled
                ? "bg-[var(--greyscale-5)] cursor-not-allowed"
                : isFilled
                ? "bg-[var(--background)]"
                : "bg-[var(--background)]",
              // Border
              "border",
              error
                ? "border-[var(--error-default)]"
                : isOpen
                ? "border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
                : disabled
                ? "border-[var(--greyscale-4)]"
                : "border-[var(--border)]",
              // Hover (not disabled, not open, not error)
              !disabled && !isOpen && !error && "hover:border-[var(--greyscale-3)]",
            )}
          >
            {/* Leading icon */}
            {icon && (
              <span className={cn(
                "mr-2 flex-shrink-0",
                "text-[var(--input-icon)]"
              )}>
                {icon}
              </span>
            )}

            {/* Value / Placeholder */}
            <span
              className={cn(
                "flex-1 text-left truncate",
                isSmall ? "text-[14px] leading-[18px]" : "text-[16px] leading-[22px]",
                "font-normal",
                disabled
                  ? "text-[var(--greyscale-3)]"
                  : hasValue
                  ? "text-[var(--input-value)]"
                  : isFilled
                  ? "text-[var(--input-value)]"
                  : "text-[var(--input-placeholder)]"
              )}
            >
              {hasValue ? selectedOption.label : placeholder}
            </span>

            {/* Chevron */}
            <ChevronDown
              className={cn(
                "w-4 h-4 ml-2 flex-shrink-0 transition-transform",
                isOpen && "rotate-180",
                disabled
                  ? "text-[var(--greyscale-3)]"
                  : isFilled
                  ? "text-[var(--input-icon)]"
                  : "text-[var(--input-icon)]"
              )}
            />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-[var(--background)] border border-[var(--border)] rounded-[6px] shadow-lg z-50 max-h-[240px] overflow-auto py-1"
              role="listbox"
            >
              {options.map((option) => {
                const isSelected = option.value === currentValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full text-left px-3 flex items-center gap-2 transition-colors cursor-pointer",
                      isSmall
                        ? "py-1.5 text-[14px] leading-[18px]"
                        : "py-2 text-[16px] leading-[22px]",
                      "font-normal",
                      "hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)]",
                      isSelected
                        ? "text-[var(--primary)]"
                        : "text-[var(--input-value)]"
                    )}
                  >
                    {option.icon && (
                      <span className="flex-shrink-0">{option.icon}</span>
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 flex-shrink-0 text-[var(--primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Validation message */}
        {validation && (
          <span
            className={cn(
              "text-[12px] leading-[16px] font-normal mt-1",
              error ? "text-[var(--error-default)]" : "text-[var(--input-title)]"
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

DesignInputSelect.displayName = "DesignInputSelect";

export { DesignInputSelect };
