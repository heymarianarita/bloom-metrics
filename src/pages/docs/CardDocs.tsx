import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "children", type: "ReactNode", description: "Card content (required)" },
  { name: "variant", type: '"default" | "lifted" | "elevated"', default: '"default"', description: "Shadow depth variant" },
  { name: "theme", type: '"default" | "primaryLight" | "highlightLight"', default: '"default"', description: "Background color theme" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const CardDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Card"
        description="A white surface container with rounded corners and optional shadow. Use to group related content."
      />

      <ComponentSection title="Stylings" description="Lifted has a subtle shadow; Elevated has a stronger drop shadow.">
        <div className="w-48">
          <DesignCard variant="lifted" className="p-4">
            <p className="text-sm font-medium text-foreground">Lifted</p>
            <p className="text-xs text-muted-foreground mt-1">Subtle shadow</p>
          </DesignCard>
        </div>
        <div className="w-48">
          <DesignCard variant="elevated" className="p-4">
            <p className="text-sm font-medium text-foreground">Elevated</p>
            <p className="text-xs text-muted-foreground mt-1">Stronger shadow</p>
          </DesignCard>
        </div>
        <div className="w-48">
          <DesignCard variant="default" className="p-4">
            <p className="text-sm font-medium text-foreground">Default</p>
            <p className="text-xs text-muted-foreground mt-1">No shadow</p>
          </DesignCard>
        </div>
      </ComponentSection>

      <ComponentSection title="Themes" description="Tinted background variants for emphasis.">
        <div className="w-56">
          <DesignCard theme="primaryLight" className="p-4">
            <p className="text-sm font-medium text-foreground">Primary light</p>
            <p className="text-xs text-muted-foreground mt-1">Teal-tinted background</p>
          </DesignCard>
        </div>
        <div className="w-56">
          <DesignCard theme="highlightLight" className="p-4">
            <p className="text-sm font-medium text-foreground">Highlight light</p>
            <p className="text-xs text-muted-foreground mt-1">Yellow-tinted background</p>
          </DesignCard>
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Marketplace product feed with card grid.">
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {[
            { name: "Vintage Denim Jacket", price: "€45", size: "M", loc: "Berlin" },
            { name: "Air Jordan 1 Retro", price: "€120", size: "42", loc: "Paris" },
            { name: "Silk Summer Dress", price: "€32", size: "S", loc: "Milan" },
            { name: "Leather Crossbody Bag", price: "€58", size: "—", loc: "London" },
          ].map((item) => (
            <DesignCard key={item.name} variant="lifted" className="overflow-hidden">
              <div className="h-28 bg-muted flex items-center justify-center">
                <span className="text-xs text-content-secondary">Photo</span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-content truncate">{item.name}</p>
                <p className="text-sm font-semibold text-primary mt-0.5">{item.price}</p>
                <p className="text-xs text-content-secondary mt-1">{item.size} · {item.loc}</p>
              </div>
            </DesignCard>
          ))}
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignCard } from '@/components/ds/DesignCard';

// Default — no shadow
<DesignCard>
  <div className="p-4">Content</div>
</DesignCard>

// Lifted — subtle shadow
<DesignCard variant="lifted">
  <div className="p-4">Content</div>
</DesignCard>

// Elevated — strong drop shadow
<DesignCard variant="elevated">
  <div className="p-4">Content</div>
</DesignCard>

// Themed card
<DesignCard theme="primaryLight">
  <div className="p-4">Tinted primary card</div>
</DesignCard>

// Real-world product card
<DesignCard variant="lifted" className="overflow-hidden">
  <img src={item.image} alt={item.title} className="w-full h-48 object-cover" />
  <div className="p-4">
    <p className="text-sm font-medium">{item.title}</p>
    <p className="text-sm font-semibold text-foreground">€{item.price}</p>
    <DesignButton size="small">Buy now</DesignButton>
  </div>
</DesignCard>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default CardDocs;