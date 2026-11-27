import { useState } from "react";
import { DesignRadioGroup, DesignRadioGroupItem } from "@/components/ds/DesignRadio";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Package, Truck, MapPin } from "lucide-react";

const props = [
  { name: "value", type: "string", description: "Value of this radio option" },
  { name: "checked", type: "boolean", description: "Controlled checked state" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables this option" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const shippingOptions = [
  {
    value: "standard",
    label: "Standard shipping",
    description: "3–5 business days",
    price: "Free",
    icon: Package,
  },
  {
    value: "express",
    label: "Express shipping",
    description: "1–2 business days",
    price: "€4.50",
    icon: Truck,
  },
  {
    value: "pickup",
    label: "Pick-up point",
    description: "Choose a nearby location",
    price: "€2.00",
    icon: MapPin,
  },
];

const RadioDocs = () => {
  const [value, setValue] = useState("standard");
  const [shipping, setShipping] = useState("standard");

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Radio"
        description="Single-selection input for use in radio groups. Controlled or uncontrolled."
      />

      <ComponentSection title="Uncontrolled group">
        <div className="flex flex-col gap-3">
          <DesignRadioGroup defaultValue="standard">
            {[
              { value: "standard", label: "Standard (3–5 days)" },
              { value: "express", label: "Express (1–2 days)" },
              { value: "pickup", label: "Pick-up point" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-3">
                <DesignRadioGroupItem value={opt.value} />
                <label className="text-sm text-foreground">{opt.label}</label>
              </div>
            ))}
          </DesignRadioGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Controlled group">
        <div className="flex flex-col gap-3">
          <DesignRadioGroup value={value} onValueChange={setValue}>
            {["standard", "express", "pickup"].map((v) => (
              <div key={v} className="flex items-center gap-3">
                <DesignRadioGroupItem value={v} />
                <label className="text-sm text-foreground capitalize">{v}</label>
              </div>
            ))}
          </DesignRadioGroup>
          <p className="text-xs text-docs-muted">Selected: {value}</p>
        </div>
      </ComponentSection>

      <ComponentSection title="Disabled">
        <div className="flex flex-col gap-3">
          <DesignRadioGroup defaultValue="a">
            <div className="flex items-center gap-3">
              <DesignRadioGroupItem value="a" />
              <label className="text-sm text-foreground">Available option</label>
            </div>
            <div className="flex items-center gap-3">
              <DesignRadioGroupItem value="b" disabled />
              <label className="text-sm text-docs-muted">Disabled unchecked</label>
            </div>
          </DesignRadioGroup>
          <DesignRadioGroup defaultValue="c">
            <div className="flex items-center gap-3">
              <DesignRadioGroupItem value="c" disabled />
              <label className="text-sm text-docs-muted">Disabled checked</label>
            </div>
          </DesignRadioGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Shipping method selector in a checkout flow.">
        <div className="w-full max-w-sm">
          <DesignRadioGroup value={shipping} onValueChange={setShipping}>
            <div className="flex flex-col rounded-xl border border-docs-border overflow-hidden">
              {shippingOptions.map((opt, idx) => {
                const Icon = opt.icon;
                const isSelected = shipping === opt.value;
                const isLast = idx === shippingOptions.length - 1;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                      ${!isLast ? "border-b border-docs-border" : ""}
                      ${isSelected ? "bg-primary-light" : "hover:bg-muted"}
                    `}
                  >
                    <DesignRadioGroupItem value={opt.value} />
                    <Icon className="w-5 h-5 text-content-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{opt.label}</div>
                      <div className="text-xs text-docs-muted">{opt.description}</div>
                    </div>
                    <span className={`text-sm font-medium shrink-0 ${opt.price === "Free" ? "text-primary" : "text-foreground"}`}>
                      {opt.price}
                    </span>
                  </label>
                );
              })}
            </div>
          </DesignRadioGroup>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignRadioGroup, DesignRadioGroupItem } from '@/components/ds/DesignRadio';

<DesignRadioGroup defaultValue="standard">
  <DesignRadioGroupItem value="standard" />
  <DesignRadioGroupItem value="express" />
</DesignRadioGroup>

// Controlled
const [value, setValue] = useState('standard');
<DesignRadioGroup value={value} onValueChange={setValue}>
  <DesignRadioGroupItem value="standard" />
  <DesignRadioGroupItem value="express" />
</DesignRadioGroup>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default RadioDocs;
