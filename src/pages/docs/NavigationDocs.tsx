import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputBar } from "@/components/ds/DesignInputBar";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignList } from "@/components/ds/DesignList";
import { DesignBottomNavigation } from "@/components/ds/DesignBottomNavigation";
import { DesignImage } from "@/components/ds/DesignImage";
import { DesignCard } from "@/components/ds/DesignCard";
import { Search, Heart, ShoppingBag, Filter } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "title", type: "string", description: "Center title text" },
  { name: "theme", type: '"none" | "transparent"', default: '"none"', description: "Background color theme" },
  { name: "showDivider", type: "boolean", default: "true", description: "Show bottom border" },
  { name: "leftButton", type: "ReactNode", description: "Left slot content" },
  { name: "rightButton", type: "ReactNode", description: "Right slot content" },
  { name: "showBackButton", type: "boolean", default: "false", description: "Shows a back chevron button" },
  { name: "onBackClick", type: "() => void", description: "Back button click handler" },
  { name: "children", type: "ReactNode", description: "Custom content (replaces slots)" },
];

const NavigationDocs = () => (
  <div className="p-10 max-w-4xl">
    <PageHeader title="Navigation" description="Top app bar with left, body, and right slots for headers and toolbars." />

    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Layout tip:</strong> Navigation should almost always sit in a container with <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">p-0</code> (zero padding) so it spans the full width edge-to-edge.
    </div>

    <ComponentSection title="Basic with back button">
      <div className="w-full"><DesignNavigation title="My Items" showBackButton /></div>
    </ComponentSection>
    <ComponentSection title="With right actions">
      <div className="w-full"><DesignNavigation title="Item Details" showBackButton rightButton={<button className="h-10 w-10 flex items-center justify-center"><Heart className="w-5 h-5" /></button>} /></div>
    </ComponentSection>
    <ComponentSection title="Custom content (Search)">
      <div className="w-full"><DesignNavigation><DesignInputBar placeholder="Search…" leftIcon={<Search className="w-4 h-4" />} /></DesignNavigation></div>
    </ComponentSection>
    <ComponentSection title="Theme variants">
      <div className="w-full space-y-2">
        <DesignNavigation title="Theme: none" theme="none" />
        <DesignNavigation title="Theme: transparent" theme="transparent" />
      </div>
    </ComponentSection>

    <ComponentSection title="Example: Real-world usage" description="Product detail screen with navigation header, image, and actions.">
      <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
        <DesignNavigation
          title="Item Details"
          showBackButton
          rightButton={
            <button className="h-10 w-10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-content" />
            </button>
          }
        />
        <DesignImage
          src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80"
          ratio="landscape"
          scaling="cover"
          alt="Vintage denim jacket"
        />
        <div className="p-4 space-y-2">
          <p className="text-base font-medium text-content">Vintage Denim Jacket</p>
          <p className="text-lg font-semibold text-primary">€45.00</p>
          <p className="text-sm text-content-secondary">Size M · Berlin · Excellent condition</p>
        </div>
        <div className="p-4 pt-0 space-y-2">
          <DesignButton variant="filled" theme="primary" fullWidth>Buy now</DesignButton>
          <DesignButton variant="outlined" theme="primary" fullWidth>Make an offer</DesignButton>
        </div>
      </div>
    </ComponentSection>

    <div className="mb-10"><h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2><CodeBlock code={`import { DesignNavigation } from '@/components/ds/DesignNavigation';\n\n{/* Parent container should have zero padding */}\n<div className="p-0">\n  <DesignNavigation\n    title="My Profile"\n    showBackButton\n    onBackClick={() => navigate(-1)}\n    rightButton={<Button>Edit</Button>}\n  />\n</div>`} /></div>
    <div className="mb-10"><h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2><PropsTable props={props} /></div>
  </div>
);
export default NavigationDocs;
