import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Bloom Dropdown (@vinted/web-ui `Dropdown`): a menu of actions or toggles opened from a trigger.
 * The surface matches DesignInputSelect's option list, so menus and selects look the same.
 */
const DesignDropdown = DropdownPrimitive.Root;

const DesignDropdownTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Trigger>
>(({ asChild = true, ...props }, ref) => <DropdownPrimitive.Trigger ref={ref} asChild={asChild} {...props} />);
DesignDropdownTrigger.displayName = "DesignDropdownTrigger";

export interface DesignDropdownContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>, "side" | "align" | "alignOffset"> {
  /** Surface width: "auto" (default) matches the trigger; a number is pixels. */
  width?: "auto" | number;
  /** Surface max-height: "auto" (default) fits the window; a number is pixels. */
  height?: "auto" | number;
}

const DesignDropdownContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  DesignDropdownContentProps
>(({ width = "auto", height = "auto", sideOffset = 4, className, style, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      side="bottom"
      align="start"
      sideOffset={sideOffset}
      collisionPadding={8}
      className={cn(
        "z-[1100] min-w-[160px] max-w-[min(360px,calc(100vw-16px))] overflow-auto py-1 outline-none",
        "rounded-[6px] border border-[var(--border)] bg-[var(--background)] shadow-lg",
        className,
      )}
      style={{
        width: width === "auto" ? "var(--radix-dropdown-menu-trigger-width)" : width,
        maxHeight:
          height === "auto"
            ? "var(--radix-dropdown-menu-content-available-height)"
            : `min(${height}px, var(--radix-dropdown-menu-content-available-height))`,
        ...style,
      }}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DesignDropdownContent.displayName = "DesignDropdownContent";

const itemClass = cn(
  "flex w-full cursor-pointer select-none items-center gap-2 px-4 py-2 text-left text-sm leading-[18px] font-normal",
  "text-[var(--input-value)] outline-none transition-colors",
  "data-[highlighted]:bg-[var(--surface-hover)] active:bg-[var(--surface-active)]",
  "data-[disabled]:pointer-events-none data-[disabled]:text-[var(--greyscale-3)]",
);

export interface DesignDropdownItemProps extends React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> {
  icon?: React.ReactNode;
}

const DesignDropdownItem = React.forwardRef<React.ElementRef<typeof DropdownPrimitive.Item>, DesignDropdownItemProps>(
  ({ icon, children, className, ...props }, ref) => (
    <DropdownPrimitive.Item ref={ref} className={cn(itemClass, className)} {...props}>
      {icon && <span className="flex shrink-0 text-[var(--input-icon)]">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </DropdownPrimitive.Item>
  ),
);
DesignDropdownItem.displayName = "DesignDropdownItem";

/** Toggle row: stays open on select so several can be ticked in a row. */
const DesignDropdownCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>
>(({ children, className, onSelect, ...props }, ref) => (
  <DropdownPrimitive.CheckboxItem
    ref={ref}
    className={cn(itemClass, "data-[state=checked]:text-[var(--primary)]", className)}
    onSelect={(e) => {
      e.preventDefault();
      onSelect?.(e);
    }}
    {...props}
  >
    <span className="flex-1 truncate">{children}</span>
    <DropdownPrimitive.ItemIndicator className="flex shrink-0">
      <Check size={16} />
    </DropdownPrimitive.ItemIndicator>
  </DropdownPrimitive.CheckboxItem>
));
DesignDropdownCheckboxItem.displayName = "DesignDropdownCheckboxItem";

const DesignDropdownLabel = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Label
    ref={ref}
    className={cn("px-4 py-2 text-xs leading-[16px] font-normal text-muted-foreground", className)}
    {...props}
  />
));
DesignDropdownLabel.displayName = "DesignDropdownLabel";

const DesignDropdownSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator ref={ref} className={cn("my-1 h-px bg-[var(--border)]", className)} {...props} />
));
DesignDropdownSeparator.displayName = "DesignDropdownSeparator";

export {
  DesignDropdown,
  DesignDropdownTrigger,
  DesignDropdownContent,
  DesignDropdownItem,
  DesignDropdownCheckboxItem,
  DesignDropdownLabel,
  DesignDropdownSeparator,
};
