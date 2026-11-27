import { PageHeader } from "@/components/preview/PageHeader";
import { PropsTable } from "@/components/preview/PropsTable";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { DesignGrid, DesignGridItem } from "@/components/ds/DesignGrid";

const gridProps = [
  { name: "maxWidth", type: "number", default: "1280", description: "Max container width in px" },
  { name: "margin", type: "number", default: "24", description: "Outer horizontal margin in px" },
  { name: "gutter", type: "number", default: "12", description: "Gap between columns / rows in px" },
  { name: "centered", type: "boolean", default: "true", description: "Centre-align the container" },
  { name: "columns", type: "boolean", default: "true", description: "Enable the 12-column CSS grid. Set false for a plain max-width wrapper." },
];

const itemProps = [
  { name: "colSpan", type: "number (1–12)", default: "12", description: "Columns spanned at ≥ 768 px (md)" },
  { name: "colSpanSm", type: "number (1–8)", default: "colSpan", description: "Columns spanned at ≥ 480 px. Falls back to colSpan." },
  { name: "colSpanXs", type: "number (1–4)", default: "4", description: "Columns spanned below 480 px" },
  { name: "colStart", type: "number (1–12)", default: "—", description: "Starting column position (md)" },
  { name: "rowSpan", type: "number (1–6)", default: "—", description: "How many rows to span" },
];

const Cell = ({ label }: { label: string }) => (
  <div className="rounded-[6px] bg-primary/10 border border-primary/20 px-3 py-4 text-center text-xs font-medium text-primary truncate">
    {label}
  </div>
);

const GridDocs = () => (
  <div>
    <PageHeader
      title="Grid"
      description="A responsive 12-column layout grid following the Bloom 4 px baseline. Columns adapt to 8 on tablet and 4 on mobile while maintaining 24 px outer margins and 12 px gutters."
    />

    {/* Spec overview */}
    <ComponentSection title="Specifications" description="Core grid tokens used across all layouts.">
      <div className="w-full text-sm space-y-2">
        <p><strong>Columns:</strong> 12 (desktop) → 8 (≥ 480 px) → 4 (&lt; 480 px)</p>
        <p><strong>Gutter:</strong> 12 px</p>
        <p><strong>Outer margin:</strong> 24 px</p>
        <p><strong>Max-width:</strong> 1280 px, centre-aligned</p>
        <p><strong>Baseline:</strong> 4 px grid</p>
      </div>
    </ComponentSection>

    {/* 12-column demo */}
    <ComponentSection title="12-Column Grid" description="Each cell spans 1 column at the md breakpoint.">
      <DesignGrid className="w-full">
        {Array.from({ length: 12 }, (_, i) => (
          <DesignGridItem key={i} colSpan={1} colSpanSm={1} colSpanXs={1}>
            <Cell label={`${i + 1}`} />
          </DesignGridItem>
        ))}
      </DesignGrid>
    </ComponentSection>

    {/* Mixed spans */}
    <ComponentSection title="Mixed Column Spans" description="Items spanning different column counts.">
      <DesignGrid className="w-full">
        <DesignGridItem colSpan={12}>
          <Cell label="12 cols — Full width" />
        </DesignGridItem>
        <DesignGridItem colSpan={8} colSpanSm={8}>
          <Cell label="8 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={4} colSpanSm={4}>
          <Cell label="4 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={6} colSpanSm={4}>
          <Cell label="6 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={6} colSpanSm={4}>
          <Cell label="6 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={4} colSpanSm={4}>
          <Cell label="4 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={4} colSpanSm={4}>
          <Cell label="4 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={4} colSpanSm={4}>
          <Cell label="4 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={3} colSpanSm={2}>
          <Cell label="3 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={3} colSpanSm={2}>
          <Cell label="3 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={3} colSpanSm={2}>
          <Cell label="3 cols" />
        </DesignGridItem>
        <DesignGridItem colSpan={3} colSpanSm={2}>
          <Cell label="3 cols" />
        </DesignGridItem>
      </DesignGrid>
    </ComponentSection>

    {/* Dashboard-like layout */}
    <ComponentSection title="Dashboard Layout" description="Header spans full width. Stats use 4-col items. A table card sits below at full width, and a sidebar section occupies one third.">
      <DesignGrid className="w-full">
        {/* Header */}
        <DesignGridItem colSpan={12}>
          <Cell label="Header (12 cols)" />
        </DesignGridItem>
        {/* Section card full width */}
        <DesignGridItem colSpan={12}>
          <Cell label="Section card (12 cols)" />
        </DesignGridItem>
        {/* Two-thirds + one-third */}
        <DesignGridItem colSpan={8} colSpanSm={5}>
          <Cell label="Main content (8 cols)" />
        </DesignGridItem>
        <DesignGridItem colSpan={4} colSpanSm={3}>
          <Cell label="Sidebar (4 cols)" />
        </DesignGridItem>
      </DesignGrid>
    </ComponentSection>

    {/* Container-only mode */}
    <ComponentSection title="Container Only (no columns)" description="Use columns={false} for a simple max-width wrapper with consistent margins.">
      <DesignGrid columns={false} className="w-full">
        <Cell label="Plain container — no column grid, just max-width + margins" />
      </DesignGrid>
    </ComponentSection>

    {/* Props */}
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-4">DesignGrid Props</h2>
      <PropsTable props={gridProps} />
    </div>
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-4">DesignGridItem Props</h2>
      <PropsTable props={itemProps} />
    </div>
  </div>
);

export default GridDocs;
