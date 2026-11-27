import { DesignNote } from "@/components/ds/DesignNote";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignToggle } from "@/components/ds/DesignToggle";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignCard } from "@/components/ds/DesignCard";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "text", type: "ReactNode", description: "Note text content (required)" },
  { name: "styling", type: '"default" | "narrow" | "wide"', default: '"default"', description: "Padding variant" },
  { name: "alignment", type: '"left" | "center" | "right"', default: '"left"', description: "Text alignment" },
  { name: "inverse", type: "boolean", default: "false", description: "Switches top/bottom padding" },
];

const NoteDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Note"
        description="Small helper text placed above or below form fields and sections."
      />

      <ComponentSection title="Default">
        <DesignNote text="Your personal data is encrypted and never shared with third parties." />
      </ComponentSection>

      <ComponentSection title="Alignment">
        <div className="w-full space-y-2">
          <DesignNote text="Left aligned (default)" alignment="left" />
          <DesignNote text="Center aligned" alignment="center" />
          <DesignNote text="Right aligned" alignment="right" />
        </div>
      </ComponentSection>

      <ComponentSection title="Styling variants">
        <div className="w-full space-y-2">
          {(["narrow", "default", "wide"] as const).map((s) => (
            <DesignNote key={s} text={`Styling: ${s}`} styling={s} />
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="Inverse" description="Switches top/bottom padding for placement below content.">
        <div className="w-full space-y-2">
          <DesignNote text="Normal note" />
          <DesignNote text="Inverse note (padding flipped)" inverse />
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Account settings screen with helper notes beneath fields and toggles.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <div className="px-4 pt-4 space-y-1">
            <DesignInputText title="Email" value="anna@example.com" readOnly />
            <DesignNote text="This email is used for login and cannot be changed." styling="narrow" className="px-0" />
          </div>
          <div className="px-4 pt-2 space-y-1">
            <DesignInputText title="Display name" value="Anna K." />
            <DesignNote text="Visible to other users in comments and reviews." styling="narrow" className="px-0" />
          </div>
          <DesignDivider className="my-3" />
          <div className="px-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Push notifications</span>
              <DesignToggle checked />
            </div>
            <DesignNote text="You'll receive alerts for messages and order updates." styling="narrow" className="px-0" />
          </div>
          <div className="px-4 pt-3 pb-4">
            <DesignButton variant="filled" theme="primary" fullWidth>Save changes</DesignButton>
          </div>
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignNote } from '@/components/ds/DesignNote';

// Basic
<DesignNote text="Your personal data is encrypted and never shared." />

// Alignment
<DesignNote text="Left aligned (default)" alignment="left" />
<DesignNote text="Centered note"          alignment="center" />
<DesignNote text="Right aligned"          alignment="right" />

// Density
<DesignNote text="Narrow" styling="narrow" />
<DesignNote text="Default" styling="default" />
<DesignNote text="Wide"    styling="wide" />`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default NoteDocs;
