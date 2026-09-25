import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type DialogStyle = "modal" | "fullScreen";

interface DesignDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  style?: DialogStyle;
  hideClose?: boolean;
  icon?: React.ReactNode;
}

const DesignDialog = ({
  open,
  onOpenChange,
  title,
  children,
  trigger,
  style = "modal",
  hideClose = false,
  icon,
}: DesignDialogProps) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[999] bg-[var(--overlay-bg)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[1000] flex flex-col bg-background focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            style === "fullScreen"
              ? "inset-0"
              : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[358px] max-h-[84%] rounded-[12px] shadow-lg overflow-hidden"
          )}
        >
          {/* Close button row - only when showClose and no icon */}
          {!hideClose && !icon && (
            <div className="flex items-center justify-between px-4 pt-3 shrink-0">
              {title ? (
                <DialogPrimitive.Title className="flex-1 text-center text-[17px] font-semibold text-foreground">
                  {title}
                </DialogPrimitive.Title>
              ) : <span />}
              <DialogPrimitive.Close asChild>
                <button
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active -mr-1"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Title without close button (alert-style) */}
          {hideClose && !icon && title && (
            <div className="px-4 pt-4 pb-2 shrink-0">
              <DialogPrimitive.Title className="text-[22px] font-semibold text-foreground text-center">
                {title}
              </DialogPrimitive.Title>
            </div>
          )}

          {/* Icon + title (warning-style) */}
          {icon && (
            <div className="flex flex-col items-center px-4 pt-4 pb-2 shrink-0">
              <div className="mb-4">{icon}</div>
              {title && (
                <DialogPrimitive.Title className="text-[22px] font-semibold text-foreground text-center">
                  {title}
                </DialogPrimitive.Title>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

DesignDialog.displayName = "DesignDialog";

export { DesignDialog };
export type { DesignDialogProps, DialogStyle };
