import { useState } from "react";
import { DesignAccordion } from "@/components/ds/DesignAccordion";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";

const props = [
  { name: "title", type: "ReactNode", description: "Header title text" },
  { name: "subtitle", type: "ReactNode", description: "Optional subtitle below the title" },
  { name: "children", type: "ReactNode", description: "Expandable body content" },
  { name: "isExpanded", type: "boolean", default: "false", description: "Controlled expanded state" },
  { name: "onToggle", type: "(expanded: boolean) => void", description: "Called when header is clicked" },
  { name: "size", type: '"narrow" | "default" | "wide"', default: '"default"', description: "Padding density" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables interaction (opacity 0.48)" },
  { name: "className", type: "string", description: "Additional wrapper classes" },
];

const AccordionDocs = () => {
  const [exp1, setExp1] = useState(false);
  const [exp2, setExp2] = useState(true);
  const [exp3, setExp3] = useState<number | null>(null);
  const [expSize, setExpSize] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <PageHeader
          title="Accordion"
          description="Expandable/collapsible content sections with header and body. Supports title, subtitle, three size variants, and disabled state."
        />

        <ComponentSection title="Default" description="Click to expand or collapse.">
          <div className="w-full">
            <DesignAccordion title="What is this design system?" isExpanded={exp1} onToggle={setExp1}>
              A comprehensive set of reusable components built with Tailwind CSS, following the Bloom design language.
            </DesignAccordion>
          </div>
        </ComponentSection>

        <ComponentSection title="With subtitle" description="Title and subtitle in the header.">
          <div className="w-full">
            <DesignAccordion
              title="How do I sell an item?"
              subtitle="Step-by-step guide"
              isExpanded={exp2}
              onToggle={setExp2}
            >
              Take clear photos, write an honest description, set a fair price, and publish. Buyers can message you directly.
            </DesignAccordion>
          </div>
        </ComponentSection>

        <ComponentSection title="Sizes" description="Narrow, default, and wide padding variants.">
          <div className="w-full space-y-4">
            {(["narrow", "default", "wide"] as const).map((size) => (
              <div key={size} className="">
                <DesignAccordion
                  title={`Size: ${size}`}
                  subtitle="Subtitle text"
                  size={size}
                  isExpanded={!!expSize[size]}
                  onToggle={(v) => setExpSize((s) => ({ ...s, [size]: v }))}
                >
                  Body content with {size} padding.
                </DesignAccordion>
              </div>
            ))}
          </div>
        </ComponentSection>

        <ComponentSection title="Multiple items" description="Only one open at a time (single-select pattern).">
          <div className="w-full divide-y divide-divider">
            {["Shipping options", "Return policy", "Payment methods"].map((label, i) => (
              <DesignAccordion
                key={label}
                title={label}
                isExpanded={exp3 === i}
                onToggle={(v) => setExp3(v ? i : null)}
              >
                Content for {label.toLowerCase()} goes here. This section contains detailed information.
              </DesignAccordion>
            ))}
          </div>
        </ComponentSection>

        <ComponentSection title="Disabled" description="Interaction is blocked and opacity is reduced.">
          <div className="w-full">
            <DesignAccordion title="Unavailable section" subtitle="Cannot expand" disabled>
              This content is hidden.
            </DesignAccordion>
          </div>
        </ComponentSection>

        <ComponentSection title="Example: Real-world usage" description="FAQ section in a product help center.">
          <div className="w-full divide-y divide-divider rounded-lg border border-docs-border overflow-hidden">
            {[
              { q: "How do I track my order?", a: "Go to My Orders → tap the order → you'll see real-time tracking with estimated delivery." },
              { q: "Can I cancel after purchasing?", a: "You can cancel within 1 hour of purchase. After that, contact the seller directly via Messages." },
              { q: "What payment methods are accepted?", a: "We accept Visa, Mastercard, Apple Pay, Google Pay, and bank transfers in supported regions." },
              { q: "How does Buyer Protection work?", a: "If your item doesn't arrive or doesn't match the description, you can open a dispute within 2 days of delivery for a full refund." },
            ].map((item, i) => (
              <DesignAccordion
                key={i}
                title={item.q}
                isExpanded={exp3 === i + 10}
                onToggle={(v) => setExp3(v ? i + 10 : null)}
              >
                <span className="text-sm text-content-secondary">{item.a}</span>
              </DesignAccordion>
            ))}
          </div>
        </ComponentSection>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
          <PropsTable props={props} />
        </section>
      </div>
    </div>
  );
};

export default AccordionDocs;
