import { DesignDoubleImage } from "@/components/ds/DesignDoubleImage";
import { DesignImage } from "@/components/ds/DesignImage";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "primary", type: "ReactElement", description: "Background (primary) image element (required)" },
  { name: "secondary", type: "ReactElement", description: "Foreground (secondary) image element (required)" },
  { name: "secondaryBorder", type: '"default"', description: "Adds a white border around the secondary image" },
  { name: "relationship", type: '"default" | "tight"', default: '"default"', description: "How close the secondary overlaps the primary" },
];

const img1 = "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&q=80";
const img2 = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&q=80";

const DoubleImageDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="DoubleImage"
        description="Two overlapping images — used to represent user + item bundles, or grouped listings."
      />

      <ComponentSection title="Default">
        <DesignDoubleImage
          primary={<DesignImage src={img1} ratio="square" scaling="cover" alt="Primary item" className="w-24" />}
          secondary={<DesignImage src={img2} ratio="square" scaling="cover" styling="circle" alt="Secondary user" className="w-12" />}
        />
      </ComponentSection>

      <ComponentSection title="With border">
        <DesignDoubleImage
          primary={<DesignImage src={img1} ratio="square" scaling="cover" alt="Primary item" className="w-24" />}
          secondary={<DesignImage src={img2} ratio="square" scaling="cover" styling="circle" alt="Secondary user" className="w-12" />}
          secondaryBorder="default"
        />
      </ComponentSection>

      <ComponentSection title="With tight relationship">
        <DesignDoubleImage
          primary={<DesignImage src={img1} ratio="square" scaling="cover" alt="Primary item" className="w-24" />}
          secondary={<DesignImage src={img2} ratio="square" scaling="cover" styling="circle" alt="Secondary user" className="w-12" />}
          secondaryBorder="default"
          relationship="tight"
        />
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Bundle listing card showing seller avatar overlapping the product photo.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
          <div className="p-4 flex items-center gap-6">
            <DesignDoubleImage
              primary={<DesignImage src={img1} ratio="square" scaling="cover" alt="Wool sweater" className="w-20" />}
              secondary={<DesignImage src={img2} ratio="square" scaling="cover" styling="circle" alt="Seller avatar" className="w-10" />}
              secondaryBorder="default"
            />
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-content truncate">Wool Blend Sweater</p>
              <p className="text-sm text-content-secondary">by @marie_vintage</p>
              <p className="text-sm font-semibold text-primary mt-1">€38.00</p>
            </div>
          </div>
          <div className="px-4 pb-3 flex gap-6">
            <DesignDoubleImage
              primary={<DesignImage src={img2} ratio="square" scaling="cover" alt="Denim jacket" className="w-20" />}
              secondary={<DesignImage src={img1} ratio="square" scaling="cover" styling="circle" alt="Seller avatar" className="w-10" />}
              secondaryBorder="default"
            />
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-content truncate">Denim Trucker Jacket</p>
              <p className="text-sm text-content-secondary">by @retro_closet</p>
              <p className="text-sm font-semibold text-primary mt-1">€52.00</p>
            </div>
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignDoubleImage } from '@/components/ds/DesignDoubleImage';
import { DesignImage } from '@/components/ds/DesignImage';

<DesignDoubleImage
  primary={<DesignImage src={itemSrc} ratio="square" scaling="cover" alt="Item" className="w-24" />}
  secondary={<DesignImage src={userSrc} ratio="square" scaling="cover" styling="circle" alt="User" className="w-12" />}
  secondaryBorder="default"
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default DoubleImageDocs;
