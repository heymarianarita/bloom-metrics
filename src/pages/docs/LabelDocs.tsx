import { DesignLabel } from "@/components/ds/DesignLabel";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "text", type: "ReactNode", description: "The label text content (required)" },
  { name: "type", type: '"stacked" | "leading"', default: '"stacked"', description: "Layout type: stacked shows text above, leading shows it inline" },
  { name: "styling", type: '"default" | "narrow" | "wide"', default: '"default"', description: "Controls vertical padding / density" },
  { name: "suffix", type: "ReactNode", description: "Optional content rendered to the right of the label text" },
];

const LabelDocs = () => (
  <div className="p-10 max-w-4xl">
    <PageHeader title="Label" description="A text label used to annotate form fields or content rows. Supports stacked (above content) and leading (inline) layouts." />

    <ComponentSection title="Types" description="Stacked places the label above its content area; leading places it inline.">
      <div className="w-full space-y-4">
        <div>
          <span className="text-xs text-content-secondary mb-1 block">stacked</span>
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <DesignLabel text="Email address" type="stacked" />
          </div>
        </div>
        <div>
          <span className="text-xs text-content-secondary mb-1 block">leading</span>
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <DesignLabel text="Country" type="leading" />
          </div>
        </div>
      </div>
    </ComponentSection>

    <ComponentSection title="Styling variants" description="Controls the density of the label.">
      <div className="w-full space-y-3">
        {(["default", "narrow", "wide"] as const).map((s) => (
          <div key={s}>
            <span className="text-xs text-content-secondary mb-1 block">{s}</span>
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <DesignLabel text={`Label (${s})`} styling={s} />
            </div>
          </div>
        ))}
      </div>
    </ComponentSection>

    <ComponentSection title="With suffix" description="Use the suffix prop for optional badges or actions alongside the label.">
      <div className="w-full bg-background border border-border rounded-lg overflow-hidden">
        <DesignLabel text="Phone number" suffix={<span className="text-xs text-content-secondary">Optional</span>} />
      </div>
    </ComponentSection>

    <ComponentSection title="Real-world usage" description="Account settings screen with labelled sections grouping related cells.">
      <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
        <DesignNavigation title="Settings" showBackButton />
        <DesignDivider />
        <DesignLabel text="Account" styling="default" />
        <DesignCell title="Email" subtitle="anna@example.com" showChevron showDivider />
        <DesignCell title="Password" subtitle="Last changed 3 months ago" showChevron showDivider />
        <DesignCell title="Two-factor auth" suffix={<DesignBadge>Off</DesignBadge>} showChevron />
        <DesignDivider />
        <DesignLabel text="Preferences" styling="default" />
        <DesignCell title="Language" subtitle="English" showChevron showDivider />
        <DesignCell title="Currency" subtitle="EUR (€)" showChevron />
      </DesignCard>
    </ComponentSection>

    <div className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
      <CodeBlock code={`import { DesignLabel } from '@/components/ds/DesignLabel';

// Stacked label (above content)
<DesignLabel text="Email address" type="stacked" />

// Leading label (inline)
<DesignLabel text="Country" type="leading" />

// With optional suffix
<DesignLabel
  text="Phone number"
  suffix={<span>Optional</span>}
/>

// Narrow density
<DesignLabel text="Compact label" styling="narrow" />`} />
    </div>

    <div className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
      <PropsTable props={props} />
    </div>
  </div>
);

export default LabelDocs;
