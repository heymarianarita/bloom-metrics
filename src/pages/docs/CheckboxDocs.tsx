import { useState } from "react";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "checked", type: "boolean", description: "Controlled checked state" },
  { name: "onCheckedChange", type: "(checked: boolean) => void", description: "Change handler" },
  { name: "defaultChecked", type: "boolean", default: "false", description: "Initial checked state (uncontrolled)" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the checkbox" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const CheckboxDocs = () => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Checkbox"
        description="Boolean toggle input with optional label. Supports controlled and uncontrolled usage."
      />

      <ComponentSection title="Basic" description="Uncontrolled checkbox with label.">
        <div className="flex items-center gap-3">
          <DesignCheckbox />
          <label className="text-sm text-foreground">Accept terms</label>
        </div>
      </ComponentSection>

      <ComponentSection title="Controlled">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <DesignCheckbox checked={checked} onCheckedChange={(v) => setChecked(v as boolean)} />
            <label className="text-sm text-foreground">Receive newsletter</label>
          </div>
          <p className="text-xs text-docs-muted">State: {checked ? "checked" : "unchecked"}</p>
        </div>
      </ComponentSection>

      <ComponentSection title="States">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <DesignCheckbox />
            <label className="text-sm text-foreground">Unchecked</label>
          </div>
          <div className="flex items-center gap-3">
            <DesignCheckbox defaultChecked />
            <label className="text-sm text-foreground">Pre-checked</label>
          </div>
          <div className="flex items-center gap-3">
            <DesignCheckbox disabled />
            <label className="text-sm text-docs-muted">Disabled unchecked</label>
          </div>
          <div className="flex items-center gap-3">
            <DesignCheckbox defaultChecked disabled />
            <label className="text-sm text-docs-muted">Disabled checked</label>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Checkout consent form with required and optional checkboxes.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background p-4 space-y-4">
          <p className="text-base font-medium text-content">Before you pay</p>
          <div className="flex items-start gap-3">
            <DesignCheckbox defaultChecked />
            <div>
              <label className="text-sm font-medium text-content">I agree to the Terms & Conditions</label>
              <p className="text-xs text-content-secondary mt-0.5">You must accept to complete your purchase.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <DesignCheckbox defaultChecked />
            <div>
              <label className="text-sm font-medium text-content">I accept the Buyer Protection policy</label>
              <p className="text-xs text-content-secondary mt-0.5">A €1.95 fee applies for purchase protection.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <DesignCheckbox />
            <div>
              <label className="text-sm font-medium text-content">Subscribe to newsletter</label>
              <p className="text-xs text-content-secondary mt-0.5">Optional — get deals and style tips.</p>
            </div>
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignCheckbox } from '@/components/ds/DesignCheckbox';
import { useState } from 'react';

// Uncontrolled
<DesignCheckbox />

// Controlled
const [checked, setChecked] = useState(false);
<DesignCheckbox
  checked={checked}
  onCheckedChange={(v) => setChecked(v)}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default CheckboxDocs;
