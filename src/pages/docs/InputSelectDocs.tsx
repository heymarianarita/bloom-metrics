import { useState } from "react";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Globe } from "lucide-react";

const countryOptions = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
];

const roleOptions = [
  { value: "admin", label: "Administrator" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
];

const props = [
  { name: "label", type: "string", description: "Label text above the select" },
  { name: "placeholder", type: "string", default: '"Select"', description: "Placeholder text when no value selected" },
  { name: "options", type: "Array<{ value, label, icon? }>", description: "List of selectable options (required)" },
  { name: "value", type: "string", description: "Controlled value" },
  { name: "defaultValue", type: "string", description: "Default value (uncontrolled)" },
  { name: "onChange", type: "(value: string) => void", description: "Change handler" },
  { name: "validation", type: "string", description: "Validation message below the select" },
  { name: "helperText", type: "string", description: "Helper text below the select" },
  { name: "error", type: "boolean", default: "false", description: "Error state (red border + validation)" },
  { name: "disabled", type: "boolean", default: "false", description: "Disabled state (gray bg, no interaction)" },
  { name: "size", type: '"default" | "medium" | "small"', default: '"default"', description: "Height variant: default (44px), medium (36px), or small (32px)" },
  { name: "style", type: '"placeholder" | "filled"', default: '"placeholder"', description: "Text style: placeholder (light) or filled (dark bg)" },
  { name: "icon", type: "ReactNode", description: "Leading icon before text" },
];

const InputSelectDocs = () => {
  const [controlled, setControlled] = useState("");

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader title="InputSelect" description="Boxed select input with rounded border, dropdown, validation, helper text, sizes, and style variants." />

      {/* Visual Variations: Size */}
      <ComponentSection title="Size">
        <div className="flex gap-8 items-end">
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Default (44px)</p>
            <DesignInputSelect placeholder="Default" options={countryOptions} />
          </div>
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Medium (36px)</p>
            <DesignInputSelect placeholder="Medium" options={countryOptions} size="medium" />
          </div>
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Small (32px)</p>
            <DesignInputSelect placeholder="Small" options={countryOptions} size="small" />
          </div>
        </div>
      </ComponentSection>

      {/* Visual Variations: Text configuration */}
      <ComponentSection title="Text Configuration">
        <div className="flex gap-8 items-end">
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Placeholder</p>
            <DesignInputSelect placeholder="Placeholder" options={countryOptions} />
          </div>
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Filled</p>
            <DesignInputSelect placeholder="Filled" options={countryOptions} style="filled" />
          </div>
        </div>
      </ComponentSection>

      {/* Visual Variations: Validation */}
      <ComponentSection title="Validation">
        <div className="flex gap-8 items-start">
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Default</p>
            <DesignInputSelect label="Label" placeholder="Select" options={countryOptions} />
          </div>
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Error</p>
            <DesignInputSelect label="Label" placeholder="Select" options={countryOptions} error validation="Validation text" />
          </div>
        </div>
      </ComponentSection>

      {/* Visual Variations: Action & Helper text */}
      <ComponentSection title="Action & Helper Text">
        <div className="flex gap-8 items-start">
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">Dropdown</p>
            <DesignInputSelect placeholder="Dropdown" options={countryOptions} />
          </div>
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-2">With helper text</p>
            <DesignInputSelect placeholder="Select" options={countryOptions} helperText="Helper text" />
          </div>
        </div>
      </ComponentSection>

      {/* States */}
      <ComponentSection title="States" description="Theme: Light — Business unit: Marketplace">
        <div className="flex gap-6 items-start flex-wrap">
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-2">Enabled/Default</p>
            <DesignInputSelect placeholder="Select" options={countryOptions} />
          </div>
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-2">Hover</p>
            <p className="text-[11px] text-muted-foreground mb-1 italic">Hover over to see</p>
            <DesignInputSelect placeholder="Select" options={countryOptions} />
          </div>
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-2">Active/Focused</p>
            <p className="text-[11px] text-muted-foreground mb-1 italic">Click to focus</p>
            <DesignInputSelect placeholder="Select" options={countryOptions} />
          </div>
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-2">Disabled</p>
            <DesignInputSelect placeholder="Disabled" options={countryOptions} disabled />
          </div>
        </div>
      </ComponentSection>

      {/* Error States */}
      <ComponentSection title="Error States" description="Theme: Light — Validation: Error">
        <div className="flex gap-6 items-start">
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-2">Enabled/Default</p>
            <DesignInputSelect placeholder="Select" options={countryOptions} error validation="Validation Error" />
          </div>
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-2">Error</p>
            <DesignInputSelect placeholder="Select" options={countryOptions} error validation="Validation Error" />
          </div>
        </div>
      </ComponentSection>

      {/* Controlled */}
      <ComponentSection title="Controlled">
        <div className="w-64">
          <DesignInputSelect
            label="Status"
            placeholder="Select status"
            options={statusOptions}
            value={controlled}
            onChange={setControlled}
            helperText={controlled ? `Selected: ${controlled}` : "Nothing selected yet"}
          />
        </div>
      </ComponentSection>

      {/* With icon */}
      <ComponentSection title="With Icon">
        <div className="w-64">
          <DesignInputSelect
            label="Country"
            placeholder="Select country"
            options={countryOptions}
            icon={<Globe className="w-4 h-4" />}
          />
        </div>
      </ComponentSection>

      {/* Real-world example */}
      <ComponentSection title="Example: Shipping Form">
        <div className="w-full max-w-sm mx-auto rounded-[6px] border border-[var(--border)] overflow-hidden bg-background p-4 space-y-4">
          <p className="text-base font-medium text-foreground">Shipping address</p>
          <DesignInputText title="Full name" placeholder="Jane Smith" />
          <DesignInputText title="Street address" placeholder="123 Main Street" />
          <div className="flex gap-3">
            <div className="flex-1">
              <DesignInputText title="City" placeholder="Berlin" />
            </div>
            <div className="flex-1">
              <DesignInputText title="Postal code" placeholder="10115" />
            </div>
          </div>
          <DesignInputSelect
            label="Country"
            placeholder="Select country"
            options={countryOptions}
            icon={<Globe className="w-4 h-4" />}
          />
          <DesignButton variant="filled" theme="primary" fullWidth>Save address</DesignButton>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-3">Usage</h2>
        <CodeBlock code={`import { DesignInputSelect } from '@/components/ds/DesignInputSelect';

<DesignInputSelect
  label="Country"
  placeholder="Select"
  options={[{ value: 'us', label: 'United States' }]}
  value={value}
  onChange={setValue}
  size="default"       // or "small"
  style="placeholder"  // or "filled"
  error
  validation="Required field"
  helperText="Choose your country"
  icon={<Globe />}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};
export default InputSelectDocs;
