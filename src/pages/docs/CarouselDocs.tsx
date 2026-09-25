import { DesignCarousel } from "@/components/ds/DesignCarousel";
import { DesignImage } from "@/components/ds/DesignImage";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "slides", type: "Array<ReactNode>", description: "Slide content array (required)" },
  { name: "isInfinite", type: "boolean", default: "false", description: "Loop slides infinitely" },
  { name: "hideNavigation", type: "boolean", default: "false", description: "Hide dot navigation" },
  { name: "arrows", type: '"inside" | "outside" | "hidden"', default: '"inside"', description: "Arrow button position" },
  { name: "styling", type: '"floating"', description: "Floating navigation dots overlay" },
  { name: "index", type: "number", description: "Controlled active slide index" },
  { name: "onSlideInteract", type: "(index: number) => void", description: "Called on slide change" },
];

const images = [
  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80",
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
];

const CarouselDocs = () => {
  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Carousel"
        description="Horizontal slide container with optional navigation and arrow controls."
      />

      <ComponentSection title="Basic">
        <div className="w-full max-w-md">
          <DesignCarousel
            slides={images.map((src, i) => (
              <DesignImage key={i} src={src} ratio="landscape" scaling="cover" alt={`Slide ${i + 1}`} />
            ))}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Infinite + floating nav">
        <div className="w-full max-w-md">
          <DesignCarousel
            isInfinite
            styling="floating"
            slides={images.map((src, i) => (
              <DesignImage key={i} src={src} ratio="landscape" scaling="cover" alt={`Slide ${i + 1}`} />
            ))}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Arrows outside">
        <div className="w-full max-w-md">
          <DesignCarousel
            arrows="outside"
            slides={images.map((src, i) => (
              <DesignImage key={i} src={src} ratio="landscape" scaling="cover" alt={`Slide ${i + 1}`} />
            ))}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Product detail page photo gallery with floating dots and infinite scroll.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
          <DesignCarousel
            isInfinite
            styling="floating"
            slides={images.map((src, i) => (
              <DesignImage key={i} src={src} ratio="portrait" scaling="cover" alt={`Product photo ${i + 1}`} />
            ))}
          />
          <div className="p-4 space-y-1">
            <p className="text-base font-medium text-content">Vintage Wool Sweater</p>
            <p className="text-lg font-semibold text-primary">€38.00</p>
            <p className="text-sm text-content-secondary">Size L · Great condition · 3 photos</p>
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignCarousel } from '@/components/ds/DesignCarousel';
import { DesignImage } from '@/components/ds/DesignImage';

// Basic image gallery
<DesignCarousel
  slides={[
    <DesignImage src="/photo1.jpg" ratio="landscape" scaling="cover" alt="Slide 1" />,
    <DesignImage src="/photo2.jpg" ratio="landscape" scaling="cover" alt="Slide 2" />,
  ]}
/>

// Infinite loop + floating nav
<DesignCarousel
  isInfinite
  styling="floating"
  slides={photos.map((src, i) => (
    <DesignImage key={i} src={src} ratio="landscape" scaling="cover" alt={\`Photo \${i + 1}\`} />
  ))}
/>

// Arrows outside
<DesignCarousel arrows="outside" slides={slides} />`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default CarouselDocs;
