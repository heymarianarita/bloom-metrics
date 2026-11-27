import { useState } from "react";
import { DesignPromoBanner } from "@/components/ds/DesignPromoBanner";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Zap, Gift, Truck, Star, Heart } from "lucide-react";

const props = [
  { name: "title", type: "string", description: "Bold heading (16px/500)" },
  { name: "body", type: "string", description: "Body text (14px/375)" },
  { name: "icon", type: "ReactNode", description: "Leading icon — rendered at 32×32" },
  { name: "actionText", type: "string", description: "CTA link label with trailing arrow" },
  { name: "onAction", type: "() => void", description: "Callback when action link is clicked" },
  { name: "closable", type: "boolean", default: "false", description: "Shows a dismiss button (44px hit area)" },
  { name: "onClose", type: "() => void", description: "Callback when dismiss button is clicked" },
  { name: "spacing", type: '"tight" | "narrow" | "default" | "wide"', default: '"tight"', description: "Outer margin style" },
];

const PromoBannerDocs = () => {
  const [vis, setVis] = useState({ a: true, b: true, c: true });

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="PromoBanner"
        description="Dismissable promotional or informational banner strip with icon, title, body, and action link."
      />

      <ComponentSection title="Basic" description="Icon + title + body. No close button.">
        <div className="w-full space-y-3">
          <DesignPromoBanner
            title="Get Vinted Pro"
            body="Boost your listings and sell 3× faster with a Pro subscription."
            icon={<Zap className="w-8 h-8 text-primary" />}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Closable" description="Dismissable with a 44px close hit area.">
        <div className="w-full space-y-3">
          {vis.a ? (
            <DesignPromoBanner
              title="Free shipping today"
              body="Orders over €20 ship for free."
              icon={<Truck className="w-8 h-8 text-primary" />}
              closable
              onClose={() => setVis((p) => ({ ...p, a: false }))}
            />
          ) : (
            <button className="text-sm text-primary hover:underline" onClick={() => setVis((p) => ({ ...p, a: true }))}>
              Reset
            </button>
          )}
        </div>
      </ComponentSection>

      <ComponentSection title="With action link" description="CTA with trailing chevron icon.">
        <div className="w-full space-y-3">
          {vis.b ? (
            <DesignPromoBanner
              title="Your item sold!"
              body="Transfer your earnings to your bank account."
              actionText="Transfer now"
              onAction={() => alert("CTA clicked")}
              icon={<Gift className="w-8 h-8 text-primary" />}
              closable
              onClose={() => setVis((p) => ({ ...p, b: false }))}
            />
          ) : (
            <button className="text-sm text-primary hover:underline" onClick={() => setVis((p) => ({ ...p, b: true }))}>
              Reset
            </button>
          )}
        </div>
      </ComponentSection>

      <ComponentSection title="Spacing variants" description="Controls outer margins: tight (0), narrow (8px), default (16px), wide (24px).">
        <div className="w-full bg-muted rounded-lg overflow-hidden">
          <DesignPromoBanner
            spacing="tight"
            title="Tight (0px margin)"
            body="No outer margin."
            icon={<Star className="w-8 h-8 text-primary" />}
          />
          <DesignPromoBanner
            spacing="narrow"
            title="Narrow (8px margin)"
            body="Compact outer margin."
            icon={<Star className="w-8 h-8 text-primary" />}
          />
          <DesignPromoBanner
            spacing="default"
            title="Default (16px margin)"
            body="Standard outer margin."
            icon={<Star className="w-8 h-8 text-primary" />}
          />
          <DesignPromoBanner
            spacing="wide"
            title="Wide (24px margin)"
            body="Generous outer margin."
            icon={<Star className="w-8 h-8 text-primary" />}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Home feed with promotional banner above product listings.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <DesignNavigation title="Home" />
          <DesignDivider />
          <DesignPromoBanner
            title="Spring Sale"
            body="Up to 50% off on selected items. Limited time only!"
            icon={<Gift className="w-8 h-8 text-primary" />}
            actionText="Shop now"
            onAction={() => {}}
            closable
          />
          <DesignDivider />
          <DesignCell title="Vintage Denim Jacket" subtitle="Size M · Excellent condition" suffix={<Heart className="w-5 h-5 text-note" />} showDivider />
          <DesignCell title="Running Shoes" subtitle="Size 42 · Barely worn" suffix={<Heart className="w-5 h-5 text-note" />} showDivider />
          <DesignCell title="Leather Backpack" subtitle="One size · Like new" suffix={<Heart className="w-5 h-5 text-note" />} />
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignPromoBanner } from '@/components/ds/DesignPromoBanner';
import { Zap } from 'lucide-react';

// Basic
<DesignPromoBanner
  title="Get Vinted Pro"
  body="Sell 3× faster."
  icon={<Zap className="w-8 h-8 text-primary" />}
/>

// With action and close
<DesignPromoBanner
  title="Your item sold!"
  body="Transfer your earnings."
  actionText="Transfer now"
  onAction={handleTransfer}
  closable
  onClose={handleClose}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default PromoBannerDocs;
