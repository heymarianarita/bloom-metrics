import { DesignSpacer, sizeMap } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignRating } from "@/components/ds/DesignRating";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "size", type: '"x-small" | "small" | "regular" | "medium" | "large" | "larger" | "x-large" | "x-larger" | "x2-large" | "x3-large" | "x4-large"', default: '"regular"', description: "Design-token size" },
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"vertical"', description: "Axis of spacing" },
  { name: "as", type: '"span"', description: 'Render as <span> for inline contexts' },
];

const SIZES = Object.keys(sizeMap) as (keyof typeof sizeMap)[];

const SpacerDocs = () => {
  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Spacer"
        description="An invisible element that inserts consistent whitespace between layout elements using design tokens."
      />

      <ComponentSection title="Vertical spacer sizes" description="Each row shows a spacer between two labels; the teal bar visualises the gap.">
        <div className="w-full space-y-3">
          {SIZES.map((size) => (
            <div key={size} className="flex items-start gap-4">
              <span className="text-xs font-mono text-[var(--text-secondary)] w-20 pt-1 shrink-0">{size}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)] w-10 pt-1 shrink-0 text-right">{sizeMap[size]}px</span>
              <div className="flex flex-col rounded overflow-hidden border border-[var(--border)]">
                <div className="text-xs text-[var(--text-secondary)] px-2 py-0.5 bg-[var(--secondary)]">↑</div>
                <div className="bg-[var(--primary)]/15 w-10">
                  <DesignSpacer size={size} orientation="vertical" />
                </div>
                <div className="text-xs text-[var(--text-secondary)] px-2 py-0.5 bg-[var(--secondary)]">↓</div>
              </div>
            </div>
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="Horizontal spacer" description="Inserts horizontal space between inline elements.">
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-sm text-foreground">Left</span>
            <DesignSpacer size="large" orientation="horizontal" />
            <span className="text-sm text-foreground">Right (large gap)</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-foreground">Left</span>
            <DesignSpacer size="x-small" orientation="horizontal" />
            <span className="text-sm text-foreground">Right (x-small gap)</span>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Product detail card using spacers to separate content sections.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <div className="aspect-[4/3] bg-muted" />
          <div className="px-4 pt-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Vintage Denim Jacket</h3>
            <DesignSpacer size="x-small" />
            <span className="text-sm text-note">Size M · Excellent condition</span>
            <DesignSpacer size="small" />
            <DesignRating value={4.5} size="small" showRating reviewCount={23} />
            <DesignSpacer size="medium" />
            <span className="text-xl font-semibold text-[var(--text-primary)]">€25.00</span>
          </div>
          <DesignSpacer size="medium" />
          <DesignDivider />
          <DesignSpacer size="small" />
          <div className="px-4 pb-4 flex gap-2">
            <DesignButton variant="filled" theme="primary" fullWidth>Buy now</DesignButton>
            <DesignButton variant="outlined" theme="primary">♡</DesignButton>
          </div>
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignSpacer } from '@/components/ds/DesignSpacer';

// Vertical space (default)
<h2>Title</h2>
<DesignSpacer size="medium" />
<p>Body text here.</p>

// Horizontal space
<div className="flex items-center">
  <span>Left</span>
  <DesignSpacer size="regular" orientation="horizontal" />
  <span>Right</span>
</div>

// Inline as span
<DesignSpacer size="small" orientation="horizontal" as="span" />`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default SpacerDocs;
