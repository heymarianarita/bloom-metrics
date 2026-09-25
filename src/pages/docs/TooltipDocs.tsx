import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignButton } from "@/components/ds/DesignButton";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Info, HelpCircle } from "lucide-react";

const props = [
  { name: "content", type: "ReactNode", description: "Tooltip text or content (required)" },
  { name: "children", type: "ReactNode", description: "Trigger element (required)" },
  { name: "side", type: '"top" | "bottom"', default: '"top"', description: "Tooltip placement" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const TooltipDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Tooltip"
        description="Small popup providing additional information on hover or focus, with arrow pointer."
      />

      <ComponentSection title="Top (default)" description="Tooltip appears above the trigger.">
        <DesignTooltip content="This is a helpful hint">
          <DesignButton variant="outlined" theme="primary">Hover me</DesignButton>
        </DesignTooltip>
      </ComponentSection>

      <ComponentSection title="Bottom" description="Tooltip appears below the trigger.">
        <DesignTooltip content="Tooltip below the element" side="bottom">
          <DesignButton variant="outlined" theme="primary">Hover me</DesignButton>
        </DesignTooltip>
      </ComponentSection>

      <ComponentSection title="Long text" description="Text wraps within max-width constraint.">
        <DesignTooltip content="This tooltip has longer content to demonstrate how text wraps within the maximum width of 276 pixels.">
          <DesignButton variant="outlined" theme="primary">Hover for details</DesignButton>
        </DesignTooltip>
      </ComponentSection>

      <ComponentSection title="Icon trigger" description="Tooltip on non-button elements.">
        <div className="flex items-center gap-6">
          <DesignTooltip content="More information">
            <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <Info className="w-5 h-5 text-content-secondary" />
            </button>
          </DesignTooltip>
          <DesignTooltip content="Need help?" side="bottom">
            <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <HelpCircle className="w-5 h-5 text-content-secondary" />
            </button>
          </DesignTooltip>
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Checkout summary with tooltips explaining fees.">
        <div className="w-full max-w-xs">
          <div className="flex flex-col gap-4 rounded-xl border border-docs-border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Subtotal</span>
              <span className="text-sm text-foreground">€25.00</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground">Buyer protection</span>
                <DesignTooltip content="Covers you if the item doesn't arrive or doesn't match the description." side="bottom">
                  <button className="p-0.5 rounded-full hover:bg-muted transition-colors">
                    <HelpCircle className="w-4 h-4 text-content-secondary" />
                  </button>
                </DesignTooltip>
              </div>
              <span className="text-sm text-foreground">€0.70</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground">Shipping</span>
                <DesignTooltip content="Shipping cost is set by the seller and depends on the parcel size.">
                  <button className="p-0.5 rounded-full hover:bg-muted transition-colors">
                    <HelpCircle className="w-4 h-4 text-content-secondary" />
                  </button>
                </DesignTooltip>
              </div>
              <span className="text-sm text-foreground">€4.50</span>
            </div>
            <div className="border-t border-docs-border pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-sm font-semibold text-foreground">€30.20</span>
            </div>
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignTooltip } from '@/components/ds/DesignTooltip';

// Basic
<DesignTooltip content="Helpful hint">
  <button>Hover me</button>
</DesignTooltip>

// Bottom placement
<DesignTooltip content="Below the trigger" side="bottom">
  <button>Hover me</button>
</DesignTooltip>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default TooltipDocs;
