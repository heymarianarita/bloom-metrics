import { useState } from "react";
import { DesignChip } from "@/components/ds/DesignChip";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignImage } from "@/components/ds/DesignImage";
import { Camera } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const filters = ["All", "Clothing", "Shoes", "Bags", "Accessories", "Electronics"];

const props = [
  { name: "children", type: "ReactNode", description: "Label content (required)" },
  { name: "variant", type: '"outlined" | "filled"', default: '"outlined"', description: "Visual variant" },
  { name: "isActive", type: "boolean", default: "false", description: "Active/selected state" },
  { name: "radius", type: '"default" | "round"', default: '"default"', description: "Border radius — round for pill shape" },
  { name: "prefixIcon", type: "ReactNode", description: "Left slot — typically an icon" },
  { name: "suffix", type: "ReactNode", description: "Right slot — typically a count or icon" },
  { name: "onClick", type: "(event) => void", description: "Click handler" },
];

const ChipDocs = () => {
  const [active, setActive] = useState("All");

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Chip"
        description="Compact interactive element for filters, tags, and multi-select UIs. Supports activated state, icons, and two stylings."
      />

      <ComponentSection title="Stylings" description="Two visual variants: outlined and filled.">
        <DesignChip variant="outlined">Outlined</DesignChip>
        <DesignChip variant="filled">Filled</DesignChip>
      </ComponentSection>

      <ComponentSection title="Activated state" description="Toggle between active and inactive.">
        <DesignChip isActive>Selected</DesignChip>
        <DesignChip>Unselected</DesignChip>
      </ComponentSection>

      <ComponentSection title="Rounded variant" description="Fully rounded chip for filter bars.">
        <DesignChip radius="round">Round</DesignChip>
        <DesignChip radius="round" isActive>Round activated</DesignChip>
      </ComponentSection>

      <ComponentSection title="With prefix and suffix" description="Use icon components for prefix/suffix slots.">
        <div className="flex flex-wrap gap-2">
          <DesignChip prefixIcon={<Camera className="w-4 h-4" />}>Photos</DesignChip>
          <DesignChip prefixIcon={<Camera className="w-4 h-4" />} suffix={<span>12</span>} radius="round">Photos</DesignChip>
        </div>
      </ComponentSection>

      <ComponentSection title="Interactive filter group" description="Click to toggle active filter.">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <DesignChip
              key={f}
              isActive={active === f}
              onClick={() => setActive(f)}
              radius="round"
            >
              {f}
            </DesignChip>
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="Truncation & tooltip" description="Long labels are truncated responsively (120px → 160px → 200px). A tooltip reveals the full text on hover.">
        <div className="flex flex-wrap gap-2">
          <DesignChip radius="round">Short</DesignChip>
          <DesignChip radius="round">Very long category name that truncates</DesignChip>
          <DesignChip radius="round" isActive>Another long chip label example</DesignChip>
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Search results page with category filter chips and result count.">
        <div className="w-full max-w-md mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
          <div className="px-4 py-3 border-b border-docs-border">
            <p className="text-sm text-content-secondary">Results for <span className="font-medium text-content">"vintage jacket"</span></p>
          </div>
          <div className="px-4 py-3 flex gap-2 overflow-x-auto border-b border-docs-border">
            {["All", "Women", "Men", "Kids"].map((f) => (
              <DesignChip
                key={f}
                isActive={active === f}
                onClick={() => setActive(f)}
                radius="round"
                suffix={f === "All" ? <span>248</span> : f === "Women" ? <span>142</span> : f === "Men" ? <span>89</span> : <span>17</span>}
              >
                {f}
              </DesignChip>
            ))}
          </div>
          <div className="p-0">
            {[
              { name: "Vintage Denim Jacket", price: "€45", img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=100&q=80" },
              { name: "Retro Leather Bomber", price: "€78", img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100&q=80" },
              { name: "90s Windbreaker", price: "€32", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100&q=80" },
            ].map((item, i, arr) => (
              <DesignCell
                key={item.name}
                title={item.name}
                subtitle={item.price}
                prefix={<DesignImage src={item.img} ratio="square" scaling="cover" alt={item.name} className="w-12 rounded-lg" />}
                showDivider={i < arr.length - 1}
              />
            ))}
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignChip } from '@/components/ds/DesignChip';
import { Camera } from 'lucide-react';
import { useState } from 'react';

// Stylings
<DesignChip variant="outlined">Outlined</DesignChip>
<DesignChip variant="filled">Filled</DesignChip>

// Activated
<DesignChip isActive>Selected</DesignChip>

// Rounded
<DesignChip radius="round">Round</DesignChip>

// With icon prefix & suffix
<DesignChip
  prefixIcon={<Camera className="w-4 h-4" />}
  suffix={<span>12</span>}
>
  Photos
</DesignChip>

// Interactive filter group
const [active, setActive] = useState('All');

{['All', 'Clothing', 'Shoes'].map((item) => (
  <DesignChip
    key={item}
    isActive={active === item}
    onClick={() => setActive(item)}
    radius="round"
  >
    {item}
  </DesignChip>
))}`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default ChipDocs;
