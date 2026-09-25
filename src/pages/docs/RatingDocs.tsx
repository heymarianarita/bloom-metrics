import { useState } from "react";
import { DesignRating } from "@/components/ds/DesignRating";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Heart, MapPin } from "lucide-react";

const props = [
  { name: "value", type: "number", description: "Rating value (0–5, supports 0.5 precision)" },
  { name: "max", type: "number", default: "5", description: "Maximum star count" },
  { name: "size", type: '"small" | "normal" | "large"', default: '"normal"', description: "Star and text size" },
  { name: "interactive", type: "boolean", default: "false", description: "Enables click/hover selection" },
  { name: "onSelect", type: "(value: number) => void", description: "Called on star click (requires interactive)" },
  { name: "showRating", type: "boolean", default: "false", description: "Show numeric rating text" },
  { name: "reviewCount", type: "number", description: "Show review count in parentheses" },
];

const RatingDocs = () => {
  const [selected, setSelected] = useState(0);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Rating"
        description="Star rating display with half-star precision and optional interactive input."
      />

      <ComponentSection title="Stars only" description="Display rating without text.">
        <div className="space-y-3">
          <DesignRating value={5} />
          <DesignRating value={3.5} />
          <DesignRating value={1} />
          <DesignRating value={0} />
        </div>
      </ComponentSection>

      <ComponentSection title="With rating text" description="Show numeric value next to stars.">
        <div className="space-y-3">
          <DesignRating value={4.8} showRating />
          <DesignRating value={3.5} showRating />
          <DesignRating value={2.0} showRating />
        </div>
      </ComponentSection>

      <ComponentSection title="With count" description="Show rating and review count.">
        <div className="space-y-3">
          <DesignRating value={4.8} showRating reviewCount={1243} />
          <DesignRating value={3.5} showRating reviewCount={89} />
          <DesignRating value={4.0} reviewCount={512} />
        </div>
      </ComponentSection>

      <ComponentSection title="Sizes">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-rating-text w-16">Small</span>
            <DesignRating value={4.5} size="small" showRating reviewCount={42} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-rating-text w-16">Normal</span>
            <DesignRating value={4.5} size="normal" showRating reviewCount={42} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-rating-text w-16">Large</span>
            <DesignRating value={4.5} size="large" showRating reviewCount={42} />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Half-star precision" description="Supports 0.5 increments.">
        <div className="space-y-3">
          {[0.5, 1.5, 2.5, 3.5, 4.5].map((v) => (
            <div key={v} className="flex items-center gap-4">
              <span className="text-sm text-rating-text w-8">{v}</span>
              <DesignRating value={v} showRating />
            </div>
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="Interactive" description="Click or hover to select a rating.">
        <div>
          <DesignRating
            value={selected}
            interactive
            onSelect={setSelected}
            size="large"
          />
          <p className="text-sm text-rating-text mt-3">
            Selected: {selected} star{selected !== 1 ? "s" : ""}
          </p>
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Rating used in a seller profile card and product listings.">
        <div className="w-full max-w-sm rounded-xl border border-docs-border overflow-hidden bg-background">
          <div className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-lg shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">anna_vintage</div>
              <div className="flex items-center gap-1 mt-0.5">
                <DesignRating value={4.8} size="small" showRating reviewCount={186} />
              </div>
            </div>
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Heart className="w-5 h-5 text-content-secondary" />
            </button>
          </div>
          <div className="border-t border-docs-border px-4 py-3 flex items-center gap-1.5 text-xs text-docs-muted">
            <MapPin className="w-3.5 h-3.5" />
            <span>Vilnius, Lithuania</span>
            <span className="mx-1">·</span>
            <span>Last seen 2h ago</span>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Product listing" description="Compact rating in a product card.">
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {[
            { name: "Vintage denim jacket", price: "€25.00", rating: 4.5, reviews: 12 },
            { name: "Wool sweater", price: "€18.00", rating: 5.0, reviews: 8 },
          ].map((item) => (
            <div key={item.name} className="rounded-xl border border-docs-border overflow-hidden bg-background">
              <div className="aspect-square bg-muted" />
              <div className="p-3">
                <div className="text-xs text-foreground font-medium truncate">{item.name}</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{item.price}</div>
                <div className="mt-1.5">
                  <DesignRating value={item.rating} size="small" showRating reviewCount={item.reviews} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignRating } from '@/components/ds/DesignRating';

// Stars only
<DesignRating value={4.5} />

// With rating text
<DesignRating value={4.5} showRating />

// With rating and count
<DesignRating value={4.5} showRating reviewCount={1243} />

// Interactive
const [rating, setRating] = useState(0);
<DesignRating
  value={rating}
  interactive
  onSelect={setRating}
  size="large"
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default RatingDocs;
