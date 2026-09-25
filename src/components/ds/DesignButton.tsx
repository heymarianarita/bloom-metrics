import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[6px] border transition-all duration-150 relative overflow-hidden disabled:opacity-48 disabled:pointer-events-none font-sans gap-2",
  {
    variants: {
      size: {
        default: "min-h-[44px] py-[11px] px-4 text-base font-medium leading-[22px]",
        medium: "min-h-[36px] py-[9px] px-[14px] text-sm font-normal leading-[18px]",
        small: "min-h-[32px] py-2 px-3 text-xs font-normal leading-4",
      },
      theme: {
        primary: "",
        success: "",
        error: "",
        highlight: "",
        muted: "",
        dark: "",
      },
      variant: {
        outlined: "bg-transparent",
        filled: "border-transparent text-primary-foreground",
        flat: "bg-transparent border-transparent",
      },
    },
    compoundVariants: [
      { variant: "outlined", theme: "primary", className: "border-btn-primary text-btn-primary hover:bg-btn-primary-hover-bg active:bg-btn-primary-active-bg" },
      { variant: "outlined", theme: "success", className: "border-btn-success text-btn-success hover:bg-btn-success-hover-bg active:bg-btn-success-active-bg" },
      { variant: "outlined", theme: "error", className: "border-btn-error text-btn-error hover:bg-btn-error-hover-bg active:bg-btn-error-active-bg" },
      { variant: "outlined", theme: "highlight", className: "border-btn-highlight text-btn-highlight-text hover:bg-btn-highlight-hover-bg active:bg-btn-highlight-active-bg" },
      { variant: "outlined", theme: "muted", className: "border-btn-muted text-btn-muted hover:bg-btn-muted-hover-bg active:bg-btn-muted-active-bg" },
      { variant: "outlined", theme: "dark", className: "border-btn-dark text-btn-dark hover:bg-btn-dark-hover-bg active:bg-btn-dark-active-bg" },
      { variant: "filled", theme: "primary", className: "bg-btn-primary hover:brightness-110 active:brightness-90" },
      { variant: "filled", theme: "success", className: "bg-btn-success hover:brightness-110 active:brightness-90" },
      { variant: "filled", theme: "error", className: "bg-btn-error hover:brightness-110 active:brightness-90" },
      { variant: "filled", theme: "highlight", className: "bg-btn-highlight text-btn-highlight-text hover:brightness-105 active:brightness-95" },
      { variant: "filled", theme: "muted", className: "bg-btn-muted hover:brightness-110 active:brightness-90" },
      { variant: "filled", theme: "dark", className: "bg-btn-dark hover:brightness-110 active:brightness-90" },
      { variant: "flat", theme: "primary", className: "text-btn-primary hover:bg-btn-primary-hover-bg active:bg-btn-primary-active-bg" },
      { variant: "flat", theme: "success", className: "text-btn-success hover:bg-btn-success-hover-bg active:bg-btn-success-active-bg" },
      { variant: "flat", theme: "error", className: "text-btn-error hover:bg-btn-error-hover-bg active:bg-btn-error-active-bg" },
      { variant: "flat", theme: "highlight", className: "text-btn-highlight-text hover:bg-btn-highlight-hover-bg active:bg-btn-highlight-active-bg" },
      { variant: "flat", theme: "muted", className: "text-btn-muted hover:bg-btn-muted-hover-bg active:bg-btn-muted-active-bg" },
      { variant: "flat", theme: "dark", className: "text-btn-dark hover:bg-btn-dark-hover-bg active:bg-btn-dark-active-bg" },
    ],
    defaultVariants: {
      size: "default",
      theme: "primary",
      variant: "filled",
    },
  }
);

export interface DesignButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  fullWidth?: boolean;
  isLoading?: boolean;
  inverse?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  url?: string;
}

const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn("animate-spin h-4 w-4", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const DesignButton = React.forwardRef<HTMLButtonElement, DesignButtonProps>(
  ({ className, size, theme, variant, fullWidth, isLoading, inverse, icon, iconPosition = "left", url, children, disabled, ...props }, ref) => {
    const content = (
      <>
        {isLoading && <Spinner />}
        {!isLoading && icon && iconPosition === "left" && icon}
        {children}
        {!isLoading && icon && iconPosition === "right" && icon}
      </>
    );

    const classes = cn(
      buttonVariants({ size, theme, variant, className }),
      fullWidth && "w-full",
      inverse && variant === "filled" && "bg-white text-btn-primary border-transparent",
      isLoading && "pointer-events-none opacity-70"
    );

    if (url) {
      return (
        <a href={url} className={classes}>
          {content}
        </a>
      );
    }

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

DesignButton.displayName = "DesignButton";

export { DesignButton, buttonVariants };