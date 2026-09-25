import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DesignCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-6 w-6 shrink-0 rounded-[6px] border border-checkbox-border bg-transparent transition-colors duration-150",
      "hover:bg-checkbox-hover data-[state=checked]:hover:bg-checkbox-checked",
      "data-[state=checked]:bg-checkbox-checked data-[state=checked]:border-checkbox-checked",
      "disabled:data-[state=checked]:opacity-48",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center h-full w-full">
      <Check className="h-4 w-4 text-checkbox-icon" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
DesignCheckbox.displayName = "DesignCheckbox";

export { DesignCheckbox };
