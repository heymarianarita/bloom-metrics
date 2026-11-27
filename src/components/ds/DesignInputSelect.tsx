import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
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
  /**
   * Bloom input sizes: default (44px) or compact (36px). This project uses compact
   * everywhere to save space, so it's the default here. "medium" and "small" are old
   * names for compact.
   */
  size?: "default" | "compact" | "medium" | "small";
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
      size = "compact",
      style = "placeholder",
      icon,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
    const labelId = React.useId();
    const valueId = React.useId();

    const currentValue = value !== undefined ? value : internalValue;
    const selectedOption = options.find((opt) => opt.value === currentValue);
    const resolvedLabel = label || title;
    const resolvedHelper = helperText || note;
    const hasValue = !!selectedOption;
    const isFilled = style === "filled";
    // Only the two Bloom sizes exist: anything but "default" is compact (36px).
    const isCompact = size !== "default";

    const handleSelect = (optionValue: string) => {
      if (value === undefined) setInternalValue(optionValue);
      onChange?.(optionValue);
      setIsOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
      if (disabled) return;
      // Inside a dialog or sheet the menu must live in it: they block scrolling everywhere else.
      if (open) setPortalContainer(triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null);
      setIsOpen(open);
    };

    // Arrow keys, Home and End move between options; Enter or Space picks the focused one.
    const optionButtons = () => [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
    const handleListKeyDown = (e: React.KeyboardEvent) => {
      const items = optionButtons();
      if (!items.length) return;
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === "ArrowDown" ? Math.min(at + 1, items.length - 1)
        : e.key === "ArrowUp" ? Math.max(at - 1, 0)
        : e.key === "Home" ? 0
        : e.key === "End" ? items.length - 1
        : undefined;
      if (next === undefined) return;
      e.preventDefault();
      items[next].focus();
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col relative", className)}
      >
        {/* Label */}
        {resolvedLabel && (
          <label id={labelId} className="text-sm leading-[18px] font-medium text-[var(--input-title)] mb-1">
            {resolvedLabel}
          </label>
        )}

        <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
          {/* Select trigger — boxed style */}
          <PopoverPrimitive.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-labelledby={resolvedLabel ? `${labelId} ${valueId}` : undefined}
            onKeyDown={(e) => {
              if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isOpen) {
                e.preventDefault();
                handleOpenChange(true);
              }
            }}
            className={cn(
              "w-full flex items-center justify-between rounded-[6px] transition-all outline-none cursor-pointer",
              !disabled && !error && "focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_1px_var(--primary)]",
              error && "focus-visible:shadow-[0_0_0_1px_var(--error-default)]",
              // Padding
              isCompact ? "px-4" : "px-4 py-2.5",
              // Height
              isCompact ? "h-[36px]" : "min-h-[44px]",
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
              id={valueId}
              className={cn(
                "flex-1 text-left truncate",
                "text-sm leading-[18px]",
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
          </PopoverPrimitive.Trigger>

          {/* Dropdown */}
          <PopoverPrimitive.Portal container={portalContainer}>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={4}
              collisionPadding={8}
              ref={listRef}
              onOpenAutoFocus={(e) => {
                // Focus the chosen option (or the first) so the keyboard can move through the list.
                e.preventDefault();
                const items = optionButtons();
                (items.find((b) => b.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
              }}
              onKeyDown={handleListKeyDown}
              className="z-[1100] w-[var(--radix-popover-trigger-width)] min-w-[160px] max-w-[min(360px,calc(100vw-16px))] bg-[var(--background)] border border-[var(--border)] rounded-[6px] shadow-lg max-h-[min(240px,var(--radix-popover-content-available-height))] overflow-auto py-1 outline-none"
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
                      "w-full text-left px-4 flex items-center gap-2 transition-colors cursor-pointer",
                      "py-2 text-sm leading-[18px]",
                      "font-normal",
                      "outline-none hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] active:bg-[var(--surface-active)]",
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
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        {/* Validation message */}
        {validation && (
          <span
            className={cn(
              "text-xs leading-[16px] font-normal mt-1",
              error ? "text-[var(--error-default)]" : "text-[var(--input-title)]"
            )}
          >
            {validation}
          </span>
        )}

        {/* Helper text */}
        {resolvedHelper && !validation && (
          <span className="text-xs leading-[16px] font-normal mt-1 text-[var(--input-title)]">
            {resolvedHelper}
          </span>
        )}
      </div>
    );
  }
);

DesignInputSelect.displayName = "DesignInputSelect";

export { DesignInputSelect };
