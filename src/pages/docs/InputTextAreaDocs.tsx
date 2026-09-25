import { useState } from "react";
import { DesignInputTextArea, DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignNote } from "@/components/ds/DesignNote";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "title", type: "string", description: "Label above the textarea" },
  { name: "placeholder", type: "string", description: "Placeholder text" },
  { name: "rows", type: "number", default: "5", description: "Visible row count" },
  { name: "validation", type: "string", description: "Validation message below textarea" },
  { name: "note", type: "string", description: "Helper text below textarea" },
  { name: "error", type: "boolean", default: "false", description: "Error state (red validation text)" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the textarea" },
];

const InputTextAreaDocs = () => {
  const [description, setDescription] = useState("");

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader title="InputTextArea" description="Multi-line text input with bottom border, label, validation, and helper text." />

      <ComponentSection title="Basic">
        <div className="flex flex-col gap-6 w-72">
          <DesignInputTextArea placeholder="Enter text..." />
          <DesignInputTextArea title="Description" placeholder="Enter description..." />
          <DesignInputTextArea title="Bio" placeholder="Tell us about yourself..." rows={3} />
        </div>
      </ComponentSection>

      <ComponentSection title="States">
        <div className="flex flex-col gap-6 w-72">
          <div>
            <p className="text-sm text-docs-muted mb-2">Default</p>
            <DesignInputTextArea title="Message" placeholder="Enter your message..." />
          </div>
          <div>
            <p className="text-sm text-docs-muted mb-2">Focused (click to see)</p>
            <DesignInputTextArea title="Description" placeholder="Enter description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <p className="text-sm text-docs-muted mb-2">Disabled</p>
            <DesignInputTextArea title="Notes" placeholder="Enter notes..." disabled />
          </div>
          <div>
            <p className="text-sm text-docs-muted mb-2">Error</p>
            <DesignInputTextArea title="Feedback" placeholder="Enter feedback..." error validation="Feedback is required" />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="With validation & notes">
        <div className="flex flex-col gap-6 w-72">
          <DesignInputTextArea title="Bio" placeholder="Tell us about yourself..." note="Max 500 characters" />
          <DesignInputTextArea title="Description" placeholder="Enter description..." validation="Description looks good" defaultValue="This is a sample description that meets all requirements." />
          <DesignInputTextArea title="Comments" placeholder="Enter comments..." error validation="Comments must be at least 10 characters" defaultValue="Too short" />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Create listing form with title, description, category, and price.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background p-4 space-y-4">
          <p className="text-base font-medium text-content">List an item</p>
          <DesignInputText title="Title" placeholder="e.g. Vintage Denim Jacket" defaultValue="Wool Blend Sweater" />
          <DesignInputTextArea
            title="Description"
            placeholder="Describe your item: condition, size, brand, defects…"
            defaultValue="Beautiful wool blend sweater in great condition. Worn only a few times. Size M, fits true to size. No stains or damage."
            rows={4}
            note="Be honest about the condition — buyers appreciate it"
          />
          <DesignInputSelect
            title="Category"
            placeholder="Select category..."
            options={[
              { value: "tops", label: "Tops & T-shirts" },
              { value: "outerwear", label: "Coats & Jackets" },
              { value: "bottoms", label: "Trousers & Jeans" },
              { value: "dresses", label: "Dresses" },
              { value: "shoes", label: "Shoes" },
            ]}
            defaultValue="tops"
          />
          <DesignInputText title="Price" placeholder="€0.00" defaultValue="38.00" />
          <DesignNote text="Listing is free. We charge a small fee only when your item sells." styling="narrow" className="px-0" />
          <DesignButton variant="filled" theme="primary" fullWidth>Publish listing</DesignButton>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignInputTextArea } from '@/components/ds/DesignInput';

<DesignInputTextArea
  title="Description"
  placeholder="Enter description..."
  rows={4}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};
export default InputTextAreaDocs;
