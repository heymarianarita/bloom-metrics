import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCell } from "@/components/ds/DesignCell";
import { CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const themes = ["primary", "dark", "muted", "success", "error", "highlight"] as const;

const props = [
  { name: "children", type: "ReactNode", description: "Badge label content (required)" },
  { name: "theme", type: '"primary" | "dark" | "muted" | "success" | "error" | "highlight"', description: "Color theme" },
  { name: "styling", type: '"filled" | "light"', default: '"filled"', description: "Filled (solid background) or light (tinted)" },
  { name: "icon", type: "ReactNode", description: "Icon element rendered before text" },
];

const BadgeDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Badge"
        description="Small status indicators used to highlight categories, states, or counts. Supports filled and light styling with multiple color themes."
      />

      <ComponentSection title="Themes — Filled" description="Solid background — default styling.">
        {themes.map((t) => (
          <DesignBadge key={t} theme={t} styling="filled">{t.charAt(0).toUpperCase() + t.slice(1)}</DesignBadge>
        ))}
      </ComponentSection>

      <ComponentSection title="Themes — Light" description="Tinted background — softer presence, use on coloured surfaces.">
        {themes.map((t) => (
          <DesignBadge key={t} theme={t} styling="light">{t.charAt(0).toUpperCase() + t.slice(1)}</DesignBadge>
        ))}
      </ComponentSection>

      <ComponentSection title="With icon" description="Pass an icon element via the icon prop.">
        <DesignBadge theme="success" styling="filled" icon={<CheckCircle className="w-3 h-3" />}>Verified</DesignBadge>
        <DesignBadge theme="success" styling="light" icon={<CheckCircle className="w-3 h-3" />}>Verified</DesignBadge>
      </ComponentSection>

      <ComponentSection title="Common patterns" description="Badge used inside a Cell suffix slot.">
        <div className="w-full">
          <DesignCell
            title="Order #999"
            suffix={<DesignBadge theme="success" styling="filled">Shipped</DesignBadge>}
            showDivider
          />
          <DesignCell
            title="Listing"
            suffix={<DesignBadge theme="muted" styling="light">Clothing</DesignBadge>}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Order history list with status badges.">
        <div className="w-full max-w-md rounded-lg border border-docs-border overflow-hidden">
          <DesignCell
            title="Nike Air Max 90"
            subtitle="Order #10234 · Mar 12"
            suffix={<DesignBadge theme="success" styling="filled">Delivered</DesignBadge>}
            showDivider
          />
          <DesignCell
            title="Levi's 501 Jeans"
            subtitle="Order #10291 · Mar 14"
            suffix={<DesignBadge theme="primary" styling="filled">Shipped</DesignBadge>}
            showDivider
          />
          <DesignCell
            title="Vintage Polaroid Camera"
            subtitle="Order #10310 · Mar 16"
            suffix={<DesignBadge theme="highlight" styling="light">Pending</DesignBadge>}
            showDivider
          />
          <DesignCell
            title="Broken headphones"
            subtitle="Order #10105 · Feb 28"
            suffix={<DesignBadge theme="error" styling="filled">Refunded</DesignBadge>}
          />
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignBadge } from '@/components/ds/DesignBadge';
import { CheckCircle } from 'lucide-react';

// Basic badge
<DesignBadge theme="primary">New</DesignBadge>

// Light styling
<DesignBadge theme="success" styling="light">In stock</DesignBadge>

// With icon
<DesignBadge theme="success" icon={<CheckCircle className="w-3 h-3" />}>Verified</DesignBadge>

// Inside Cell suffix
<DesignCell
  title="Order #999"
  suffix={<DesignBadge theme="success">Shipped</DesignBadge>}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default BadgeDocs;