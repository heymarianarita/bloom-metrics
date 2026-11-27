import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignImage } from "@/components/ds/DesignImage";
import { Camera, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "children", type: "ReactNode", description: "Button label content" },
  { name: "variant", type: '"filled" | "outlined" | "flat"', default: '"filled"', description: "Visual variant of the button" },
  { name: "size", type: '"default" | "medium" | "small"', default: '"default"', description: "Size of the button" },
  { name: "theme", type: '"primary" | "muted" | "success" | "error" | "highlight" | "dark"', default: '"primary"', description: "Color theme" },
  { name: "fullWidth", type: "boolean", default: "false", description: "Renders button full-width" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables interactions and dims the button" },
  { name: "inverse", type: "boolean", default: "false", description: "Inverts the button colors (for dark backgrounds)" },
  { name: "isLoading", type: "boolean", default: "false", description: "Shows a loading spinner" },
  { name: "icon", type: "ReactNode", description: "Icon element" },
  { name: "iconPosition", type: '"left" | "right"', default: '"left"', description: "Position of the icon relative to text" },
  { name: "url", type: "string", description: "Renders as an anchor tag with this href" },
  { name: "onClick", type: "(event) => void", description: "Click handler" },
];

const ButtonDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Button"
        description="Triggers actions and navigation. Supports multiple stylings, sizes, themes, icon support, and loading states."
      />

      <ComponentSection title="Stylings" description="Three visual variants: filled, outlined, and flat.">
        <DesignButton variant="filled" theme="primary">Filled</DesignButton>
        <DesignButton variant="outlined" theme="primary">Outlined</DesignButton>
        <DesignButton variant="flat" theme="primary">Flat</DesignButton>
      </ComponentSection>

      <ComponentSection title="Sizes" description="Three sizes available for different contexts.">
        <DesignButton variant="filled" size="default">Default</DesignButton>
        <DesignButton variant="filled" size="medium">Medium</DesignButton>
        <DesignButton variant="filled" size="small">Small</DesignButton>
      </ComponentSection>

      <ComponentSection title="Themes" description="Color themes applied to filled buttons.">
        <DesignButton variant="filled" theme="primary">Primary</DesignButton>
        <DesignButton variant="filled" theme="muted">Muted</DesignButton>
        <DesignButton variant="filled" theme="success">Success</DesignButton>
        <DesignButton variant="filled" theme="error">Error</DesignButton>
        <DesignButton variant="filled" theme="highlight">Highlight</DesignButton>
        <DesignButton variant="filled" theme="dark">Dark</DesignButton>
      </ComponentSection>

      <ComponentSection title="Outlined themes">
        <DesignButton variant="outlined" theme="primary">Primary</DesignButton>
        <DesignButton variant="outlined" theme="muted">Muted</DesignButton>
        <DesignButton variant="outlined" theme="success">Success</DesignButton>
        <DesignButton variant="outlined" theme="error">Error</DesignButton>
        <DesignButton variant="outlined" theme="highlight">Highlight</DesignButton>
      </ComponentSection>

      <ComponentSection title="States">
        <DesignButton variant="filled">Default</DesignButton>
        <DesignButton variant="filled" disabled>Disabled</DesignButton>
        <DesignButton variant="filled" isLoading>Loading</DesignButton>
      </ComponentSection>

      <ComponentSection title="Full width vs Inline" description="By default Button is inline. Pass fullWidth to stretch it.">
        <div className="w-full flex flex-col gap-4">
          <DesignButton variant="filled" fullWidth>Full width</DesignButton>
          <DesignButton variant="filled">Inline</DesignButton>
        </div>
      </ComponentSection>

      <ComponentSection title="With icons" description="Use icon and iconPosition props.">
        <DesignButton variant="filled" icon={<Camera className="w-4 h-4" />} iconPosition="left">Add photo</DesignButton>
        <DesignButton variant="outlined" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">Next</DesignButton>
      </ComponentSection>

      <ComponentSection title="As link" description="Use the url prop to render as an anchor tag.">
        <DesignButton variant="flat" url="/docs">View profile</DesignButton>
        <DesignButton variant="flat" url="https://example.com">External</DesignButton>
      </ComponentSection>

      <ComponentSection title="Inverse (dark backgrounds)" description="Pass inverse to invert colors for dark backgrounds.">
        <div className="rounded-xl p-6 bg-btn-primary">
          <DesignButton variant="filled" inverse>White on dark</DesignButton>
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Product listing action bar with primary and secondary actions.">
        <div className="w-full max-w-sm mx-auto">
          <DesignCard variant="lifted" className="overflow-hidden">
            <DesignImage
              src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80"
              ratio="landscape"
              scaling="cover"
              alt="Vintage Denim Jacket"
            />
            <div className="p-4 space-y-2">
              <h3 className="text-base font-medium text-content">Vintage Denim Jacket</h3>
              <p className="text-sm text-content-secondary">Size M · Excellent condition · Worn twice</p>
              <p className="text-lg font-semibold text-primary">€55.00</p>
            </div>
            <div className="p-4 pt-0 space-y-2">
              <DesignButton variant="filled" theme="primary" fullWidth>Buy now</DesignButton>
              <DesignButton variant="outlined" theme="primary" fullWidth>Make an offer</DesignButton>
              <div className="flex gap-2">
                <DesignButton variant="flat" theme="muted" size="small">Share</DesignButton>
                <DesignButton variant="flat" theme="muted" size="small">Save</DesignButton>
              </div>
            </div>
          </DesignCard>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignButton } from '@/components/ds/DesignButton';
import { Camera } from 'lucide-react';

// Filled primary (default)
<DesignButton variant="filled" onClick={handleClick}>Submit</DesignButton>

// Outlined with theme
<DesignButton variant="outlined" theme="muted">Cancel</DesignButton>

// With icon
<DesignButton variant="filled" icon={<Camera className="w-4 h-4" />} iconPosition="left">
  Add photo
</DesignButton>

// As link
<DesignButton variant="flat" url="/profile">View profile</DesignButton>

// Loading state
<DesignButton variant="filled" isLoading>Saving…</DesignButton>

// Inverse on dark background
<DesignButton variant="filled" inverse>White on dark</DesignButton>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default ButtonDocs;