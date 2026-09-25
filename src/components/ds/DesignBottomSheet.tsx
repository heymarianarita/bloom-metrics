import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { X } from "lucide-react";

interface DesignBottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

const DesignBottomSheet = ({
  open,
  onOpenChange,
  title,
  children,
  trigger,
}: DesignBottomSheetProps) => {
  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerPrimitive.Trigger asChild>{trigger}</DrawerPrimitive.Trigger>}
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay-bg-light)]" />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[51] flex flex-col bg-background",
            "rounded-t-[12px] max-h-[84%]"
          )}
        >
          <div className="flex justify-center pt-2 pb-0">
            <div className="h-[5px] w-[40px] rounded-full bg-muted-foreground/40" style={{ marginTop: "-28px" }} />
          </div>
          <DesignNavigation
            theme="none"
            title={title}
            rightButton={
              <DrawerPrimitive.Close asChild>
                <button
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </DrawerPrimitive.Close>
            }
          />
          <DesignDivider margin={0} />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
};

DesignBottomSheet.displayName = "DesignBottomSheet";

export { DesignBottomSheet };
