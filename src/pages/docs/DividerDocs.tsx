import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignImage } from "@/components/ds/DesignImage";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { MapPin, Star } from "lucide-react";

const props = [
  { name: "margin", type: "number", description: "Vertical margin in pixels" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const DividerDocs = () => (
  <div className="p-10 max-w-4xl">
    <PageHeader title="Divider" description="A thin line that separates sections of content." />
    <ComponentSection title="Horizontal" description="Full-width horizontal separator.">
      <div className="w-full flex flex-col gap-3">
        <span className="text-sm text-foreground">Section A</span>
        <DesignDivider />
        <span className="text-sm text-foreground">Section B</span>
        <DesignDivider />
        <span className="text-sm text-foreground">Section C</span>
      </div>
    </ComponentSection>
    <ComponentSection title="Margin variants">
      <div className="w-full flex flex-col">
        <span className="text-sm">margin=0</span><DesignDivider margin={0} /><span className="text-sm">margin=8</span><DesignDivider margin={8} /><span className="text-sm">margin=16</span><DesignDivider margin={16} /><span className="text-sm">default (24)</span><DesignDivider />
      </div>
    </ComponentSection>

    <ComponentSection title="Example: Real-world usage" description="Seller profile card with dividers separating info sections.">
      <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background p-4">
        <div className="flex items-center gap-3">
          <DesignImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" ratio="square" scaling="cover" styling="circle" alt="Marie Laurent" className="w-12" />
          <div>
            <p className="text-base font-medium text-content">Marie Laurent</p>
            <div className="flex items-center gap-1 text-xs text-content-secondary">
              <MapPin className="w-3 h-3" /> Paris, France
            </div>
          </div>
        </div>
        <DesignDivider margin={12} />
        <div className="flex justify-between text-sm">
          <div className="text-center">
            <p className="font-semibold text-content">142</p>
            <p className="text-xs text-content-secondary">Items</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-content">4.9</p>
            <p className="text-xs text-content-secondary">Rating</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-content">89</p>
            <p className="text-xs text-content-secondary">Sold</p>
          </div>
        </div>
        <DesignDivider margin={12} />
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
          <span className="text-sm text-content">Trusted seller</span>
          <DesignBadge theme="success" styling="light">Verified</DesignBadge>
        </div>
      </div>
    </ComponentSection>

    <div className="mb-10"><h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2><CodeBlock code={`import { DesignDivider } from '@/components/ds/DesignDivider';\n\n<DesignDivider />\n<DesignDivider margin={16} />`} /></div>
    <div className="mb-10"><h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2><PropsTable props={props} /></div>
  </div>
);
export default DividerDocs;