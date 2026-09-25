import { useState } from "react";
import { DesignSelectionGroup } from "@/components/ds/DesignSelectionGroup";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Check, Truck, Store, MapPin, Smile, Circle } from "lucide-react";

const groupProps = [
  { name: "children", type: "Array<SelectionItem>", description: "SelectionItem children" },
  { name: "direction", type: '"vertical" | "horizontal"', default: '"horizontal"', description: "Layout direction" },
  { name: "layout", type: '"default" | "scroll"', default: '"default"', description: "Scroll or wrap behavior" },
  { name: "styling", type: '"default" | "tight" | "narrow" | "wide"', default: '"default"', description: "Container padding" },
];

const itemProps = [
  { name: "title", type: "string", description: "Item label text (required)" },
  { name: "body", type: "string", description: "Secondary description text" },
  { name: "isSelected", type: "boolean", default: "false", description: "Whether the item is selected" },
  { name: "size", type: '"default" | "small"', default: '"default"', description: "Item padding size" },
  { name: "prefix", type: "ReactNode", description: "Leading element (icon, avatar, etc.)" },
  { name: "suffix", type: "ReactNode", description: "Trailing element (icon, badge, etc.)" },
  { name: "onClick", type: "() => void", description: "Click handler" },
];

const SelectionGroupDocs = () => {
  const [selected, setSelected] = useState("m");
  const [selectedCat, setSelectedCat] = useState("clothing");
  const [multiSelected, setMultiSelected] = useState<string[]>(["home"]);
  const [shipping, setShipping] = useState("standard");

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const categories = ["Clothing", "Shoes", "Bags", "Accessories"];

  const toggleMulti = (val: string) => {
    setMultiSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="SelectionGroup"
        description="Container for selectable items. Supports single or multi-select, vertical or horizontal layout."
      />

      <ComponentSection title="Horizontal scroll (sizes)" description="Single-select size picker.">
        <DesignSelectionGroup direction="horizontal" layout="scroll" styling="tight">
          {sizes.map((s) => (
            <DesignSelectionGroup.SelectionItem
              key={s}
              title={s}
              size="small"
              isSelected={selected === s.toLowerCase()}
              onClick={() => setSelected(s.toLowerCase())}
            />
          ))}
        </DesignSelectionGroup>
      </ComponentSection>

      <ComponentSection title="Horizontal wrap" description="Wraps items when space is limited.">
        <div className="w-64">
          <DesignSelectionGroup direction="horizontal" layout="default" styling="tight">
            {sizes.map((s) => (
              <DesignSelectionGroup.SelectionItem
                key={s}
                title={s}
                size="small"
                isSelected={selected === s.toLowerCase()}
                onClick={() => setSelected(s.toLowerCase())}
              />
            ))}
          </DesignSelectionGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Vertical with body text" description="Items with title and description.">
        <div className="w-full max-w-sm">
          <DesignSelectionGroup direction="vertical" styling="tight">
            {categories.map((cat) => (
              <DesignSelectionGroup.SelectionItem
                key={cat}
                title={cat}
                body={`Browse all ${cat.toLowerCase()}`}
                isSelected={selectedCat === cat.toLowerCase()}
                onClick={() => setSelectedCat(cat.toLowerCase())}
                suffix={selectedCat === cat.toLowerCase() ? <Check className="w-5 h-5" /> : undefined}
              />
            ))}
          </DesignSelectionGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Multi-select" description="Multiple items can be selected.">
        <DesignSelectionGroup direction="horizontal" styling="tight">
          {["Home", "Garden", "Electronics", "Sports"].map((item) => {
            const val = item.toLowerCase();
            return (
              <DesignSelectionGroup.SelectionItem
                key={val}
                title={item}
                isSelected={multiSelected.includes(val)}
                onClick={() => toggleMulti(val)}
              />
            );
          })}
        </DesignSelectionGroup>
      </ComponentSection>

      <ComponentSection title="Styling variants" description="Container padding options.">
        <div className="space-y-4 w-full">
          {(["tight", "narrow", "default", "wide"] as const).map((s) => (
            <div key={s}>
              <span className="text-xs text-content-secondary mb-1 block capitalize">{s}</span>
              <div className="border border-docs-border rounded-lg">
                <DesignSelectionGroup direction="horizontal" styling={s}>
                  {["A", "B", "C", "D"].map((item) => (
                    <DesignSelectionGroup.SelectionItem key={item} title={item} size="small" />
                  ))}
                </DesignSelectionGroup>
              </div>
            </div>
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="With prefix icon and radio suffix" description="Items with leading icon, body text, and radio-style indicator.">
        <div className="w-full max-w-2xl">
          <DesignSelectionGroup direction="vertical" styling="tight">
            {[
              { id: "option1", title: "Title", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
              { id: "option2", title: "Title", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
            ].map((opt) => (
              <DesignSelectionGroup.SelectionItem
                key={opt.id}
                title={opt.title}
                body={opt.body}
                isSelected={shipping === opt.id}
                onClick={() => setShipping(opt.id)}
                prefix={<Smile className="w-6 h-6" />}
                suffix={
                  shipping === opt.id
                    ? <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                    : <Circle className="w-6 h-6" />
                }
              />
            ))}
          </DesignSelectionGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Delivery method selector in a checkout flow.">
        <div className="w-full max-w-sm">
          <DesignSelectionGroup direction="vertical" styling="tight">
            {[
              { id: "standard", title: "Standard shipping", body: "3–5 business days · Free", icon: Truck },
              { id: "express", title: "Express shipping", body: "1–2 business days · €4.50", icon: Truck },
              { id: "pickup", title: "Pick-up point", body: "Choose a nearby location", icon: MapPin },
              { id: "instore", title: "In-store collection", body: "Ready in 24 hours · Free", icon: Store },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <DesignSelectionGroup.SelectionItem
                  key={opt.id}
                  title={opt.title}
                  body={opt.body}
                  isSelected={selectedCat === opt.id}
                  onClick={() => setSelectedCat(opt.id)}
                  suffix={
                    selectedCat === opt.id
                      ? <Check className="w-5 h-5" />
                      : <Icon className="w-5 h-5" />
                  }
                />
              );
            })}
          </DesignSelectionGroup>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignSelectionGroup } from '@/components/ds/DesignSelectionGroup';
import { useState } from 'react';

const [selected, setSelected] = useState('m');

// Single-select horizontal
<DesignSelectionGroup direction="horizontal" layout="scroll">
  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
    <DesignSelectionGroup.SelectionItem
      key={size}
      title={size}
      isSelected={selected === size.toLowerCase()}
      onClick={() => setSelected(size.toLowerCase())}
    />
  ))}
</DesignSelectionGroup>

// With body text and suffix
<DesignSelectionGroup.SelectionItem
  title="Express shipping"
  body="1–2 business days"
  isSelected={true}
  suffix={<Check className="w-5 h-5" />}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">SelectionGroup Props</h2>
        <PropsTable props={groupProps} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">SelectionItem Props</h2>
        <PropsTable props={itemProps} />
      </div>
    </div>
  );
};

export default SelectionGroupDocs;
