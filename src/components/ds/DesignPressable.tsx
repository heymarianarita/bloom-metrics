import * as React from "react";
import { cn } from "@/lib/utils";

type PressableState = "none" | "default";

export interface DesignPressableProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Hover tint (web-ui: neutral overlay at 4%). */
  hover?: PressableState;
  /** Pressed tint (neutral overlay at 8%). */
  active?: PressableState;
  /** Focus ring and tint (neutral overlay at 2%). */
  focus?: PressableState;
  /** Corner radius of the tint and focus ring. */
  borderRadius?: "none" | "small" | "default" | "medium" | "round" | "full";
  display?: "block" | "inline";
  type?: "button" | "submit" | "reset";
}

const radius: Record<NonNullable<DesignPressableProps["borderRadius"]>, string> = {
  none: "rounded-none",
  small: "rounded-md",
  default: "rounded-md",
  medium: "rounded-xl",
  round: "rounded-full",
  full: "rounded-full",
};

/**
 * Bloom Pressable (@vinted/web-ui `Pressable`): makes any content clickable with Bloom's hover,
 * pressed and focus states, for rows, tiles and controls no other component covers. It adds no
 * size or padding of its own.
 */
const DesignPressable = React.forwardRef<HTMLButtonElement, DesignPressableProps>(
  (
    {
      hover = "default",
      active = "default",
      focus = "default",
      borderRadius = "none",
      display = "block",
      type = "button",
      disabled,
      className,
      onClick,
      onKeyDown,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-disabled={disabled || undefined}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      onKeyDown={(e) => {
        if (disabled && (e.key === "Enter" || e.key === " ")) e.preventDefault();
        onKeyDown?.(e);
      }}
      className={cn(
        "relative m-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-[inherit] text-inherit",
        display === "block" ? "block" : "inline",
        radius[borderRadius],
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:transition-colors before:content-['']",
        hover === "default" && "hover:before:bg-surface-hover",
        active === "default" && "active:before:bg-surface-active",
        "focus-visible:outline-none",
        focus === "default" && "focus-visible:ring-2 focus-visible:ring-primary",
        disabled && "cursor-not-allowed opacity-48 before:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
DesignPressable.displayName = "DesignPressable";

export { DesignPressable };
