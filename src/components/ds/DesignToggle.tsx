import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const DesignToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
      "bg-toggle-unchecked data-[state=checked]:bg-toggle-checked",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-48",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-6 w-6 rounded-full border-[1.5px] border-transparent bg-toggle-checker bg-clip-content shadow-sm transition-transform",
        "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-3"
      )}
    />
  </SwitchPrimitive.Root>
));
DesignToggle.displayName = "DesignToggle";

export { DesignToggle };
