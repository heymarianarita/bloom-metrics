import { DesignBubble } from "@/components/ds/DesignBubble";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignInputBar } from "@/components/ds/DesignInputBar";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "text", type: "ReactNode", description: "Primary text content rendered inside the bubble." },
  { name: "styling", type: '"default" | "narrow" | "tight" | "wide"', default: '"narrow"', description: "Controls internal bubble padding." },
  { name: "children", type: "ReactNode", description: "Additional content rendered after text inside the bubble." },
  { name: "footer", type: "ReactNode", description: "Footer content (for timestamp/status). Footer colors are always inverted." },
  { name: "inverse", type: "boolean", default: "false", description: "Uses inverse visual style for outgoing/sent bubbles." },
  { name: "html", type: "boolean", default: "false", description: "Renders text/footer as HTML when strings are provided." },
];

const sampleText = "Hi, Jenna! Is the sweater still available for sale?";

const BubbleDocs = () => {
  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Bubble"
        description="Bubble is designed to represent a single short chunk of information."
      />

      <ComponentSection title="Overview">
        <div className="rounded-lg border border-docs-border bg-[var(--highlight-tint)] p-6">
          <DesignBubble text={sampleText} styling="default" className="max-w-4xl" />
        </div>
      </ComponentSection>

      <ComponentSection title="Conversation" description="Align bubbles with flexbox for a full chat layout.">
        <div className="space-y-2 max-w-sm">
          <div className="flex justify-start">
            <DesignBubble text="Hi! Is this still available?" footer="12:34" className="max-w-[280px]" />
          </div>
          <div className="flex justify-end">
            <DesignBubble text="Yes! Feel free to make an offer." footer="12:35" inverse className="max-w-[280px]" />
          </div>
          <div className="flex justify-start">
            <DesignBubble text="Great, I'll take it for €20?" footer="12:36" className="max-w-[280px]" />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Styling variants">
        <div className="space-y-3 rounded-lg border border-docs-border bg-[var(--highlight-tint)] p-6">
          <DesignBubble text="Tight bubble" styling="tight" className="max-w-lg" />
          <DesignBubble text="Narrow bubble (default)" styling="narrow" className="max-w-lg" />
          <DesignBubble text="Default bubble" styling="default" className="max-w-lg" />
          <DesignBubble text="Wide bubble" styling="wide" className="max-w-lg" />
        </div>
      </ComponentSection>

      <ComponentSection title="Inverse">
        <div className="rounded-lg border border-docs-border bg-[var(--highlight-tint)] p-6">
          <DesignBubble text={sampleText} inverse className="max-w-4xl" />
        </div>
      </ComponentSection>

      <ComponentSection title="With footer">
        <div className="space-y-3 rounded-lg border border-docs-border bg-[var(--highlight-tint)] p-6">
          <DesignBubble text="I can ship it today." footer="12:34" className="max-w-lg" />
          <DesignBubble text="Perfect, thank you!" footer="12:35" inverse className="max-w-lg" />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Marketplace buyer-seller negotiation thread.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
          <div className="bg-background">
            <DesignCell
              prefix={
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">JD</div>
              }
              title="Jane Doe"
              bodyText="Active now"
              styling="tight"
            />
          </div>
          <DesignDivider margin={0} />
          <div className="p-4 space-y-2 bg-[var(--highlight-tint)]">
            <div className="flex justify-start">
              <DesignBubble text="Hey! Love the vintage lamp. Is €35 okay?" footer="14:02" className="max-w-[260px]" />
            </div>
            <div className="flex justify-end">
              <DesignBubble text="Thanks for the interest! I can do €40 — it includes the original shade." footer="14:05" inverse className="max-w-[260px]" />
            </div>
            <div className="flex justify-start">
              <DesignBubble text="Deal! Can you ship it?" footer="14:06" className="max-w-[260px]" />
            </div>
            <div className="flex justify-end">
              <DesignBubble text="Sure, €4.95 shipping. I'll send it tomorrow!" footer="14:07" inverse className="max-w-[260px]" />
            </div>
          </div>
          <DesignDivider margin={0} />
          <div className="bg-background">
            <DesignInputBar placeholder="Type a message…" />
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock
          code={`import { DesignBubble } from '@/components/ds/DesignBubble';

<DesignBubble text="Hi, Jenna! Is the sweater still available for sale?" />

<DesignBubble
  text="I can ship it today."
  footer="12:34"
/>

<DesignBubble
  text="Perfect, thank you!"
  footer="12:35"
  inverse
/>

<DesignBubble text="Tight" styling="tight" />
<DesignBubble text="Narrow" styling="narrow" />
<DesignBubble text="Default" styling="default" />
<DesignBubble text="Wide" styling="wide" />`}
        />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default BubbleDocs;
