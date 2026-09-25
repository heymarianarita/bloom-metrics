import { DesignImage } from "@/components/ds/DesignImage";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCell } from "@/components/ds/DesignCell";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "src", type: "string | null", description: "Image source URL" },
  { name: "alt", type: "string", description: "Accessible alt text (required)" },
  { name: "ratio", type: '"square" | "portrait" | "small-portrait" | "landscape" | "small-landscape"', default: '"square"', description: "Aspect ratio" },
  { name: "scaling", type: '"contain" | "cover" | "fill" | "scale-down"', default: '"cover"', description: "Object-fit strategy" },
  { name: "styling", type: '"default" | "rounded" | "circle"', default: '"default"', description: "Border radius variant" },
  { name: "label", type: "string", description: "Caption text below the image" },
  { name: "fallbackSrc", type: "string | null", description: "Fallback URL on load error" },
  { name: "loading", type: '"lazy" | "eager"', default: '"lazy"', description: "Native loading hint" },
];

const src = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80";

const ImageDocs = () => {
  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Image"
        description="Responsive image with aspect ratio control, styling variants, and fallback support. Use instead of native <img> tags for consistent sizing."
      />

      <ComponentSection title="Aspect ratios">
        <div className="flex flex-wrap gap-4">
          {(["square", "portrait", "small-portrait", "landscape", "small-landscape"] as const).map((r) => (
            <div key={r} style={{ width: 128 }}>
              <p className="text-xs text-muted-foreground mb-1">{r}</p>
              <DesignImage src={src} ratio={r} scaling="cover" alt={r} />
            </div>
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="Styling variants" description="Default (sharp corners), rounded, and circle.">
        <div className="flex gap-4">
          <div style={{ width: 96 }}>
            <p className="text-xs text-muted-foreground mb-1">default</p>
            <DesignImage src={src} ratio="square" scaling="cover" alt="default" />
          </div>
          <div style={{ width: 96 }}>
            <p className="text-xs text-muted-foreground mb-1">rounded</p>
            <DesignImage src={src} ratio="square" scaling="cover" styling="rounded" alt="rounded" />
          </div>
          <div style={{ width: 96 }}>
            <p className="text-xs text-muted-foreground mb-1">circle</p>
            <DesignImage src={src} ratio="square" scaling="cover" styling="circle" alt="circle" />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="With fallback" description="Use fallbackSrc for user-generated content that may fail to load.">
        <div style={{ width: 128 }}>
          <DesignImage
            src="https://broken-url.example/missing.jpg"
            fallbackSrc={src}
            ratio="square"
            scaling="cover"
            alt="Fallback demo"
          />
        </div>
      </ComponentSection>

      <ComponentSection title="With label">
        <div style={{ width: 192 }}>
          <DesignImage src={src} ratio="landscape" scaling="cover" alt="Fashion item" label="Summer dress" />
        </div>
      </ComponentSection>

      <ComponentSection title="Common patterns" description="Avatar, product photo, and banner usage.">
        <div className="flex gap-4 items-start">
          <div style={{ width: 64 }}>
            <p className="text-xs text-muted-foreground mb-1">Avatar</p>
            <DesignImage src={src} ratio="square" scaling="cover" styling="circle" alt="User avatar" />
          </div>
          <div style={{ width: 128 }}>
            <p className="text-xs text-muted-foreground mb-1">Product</p>
            <DesignImage src={src} ratio="portrait" scaling="cover" alt="Product photo" />
          </div>
          <div style={{ width: 256 }}>
            <p className="text-xs text-muted-foreground mb-1">Banner</p>
            <DesignImage src={src} ratio="landscape" scaling="cover" alt="Banner" />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Product listing grid using DesignImage with Card and Badge.">
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {[
            { name: "Wool Sweater", price: "€38", badge: null, img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80" },
            { name: "Leather Boots", price: "€95", badge: "Reserved", img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80" },
            { name: "Silk Blouse", price: "€28", badge: null, img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80" },
            { name: "Denim Jacket", price: "€52", badge: "Sold", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80" },
          ].map((item) => (
            <DesignCard key={item.name} variant="lifted" className="overflow-hidden">
              <div className="relative">
                <DesignImage src={item.img} ratio="portrait" scaling="cover" alt={item.name} />
                {item.badge && (
                  <div className="absolute top-2 left-2">
                    <DesignBadge theme={item.badge === "Sold" ? "muted" : "primary"} styling="filled">{item.badge}</DesignBadge>
                  </div>
                )}
                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-content-secondary" />
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-content truncate">{item.name}</p>
                <p className="text-sm font-semibold text-primary mt-0.5">{item.price}</p>
              </div>
            </DesignCard>
          ))}
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignImage } from '@/components/ds/DesignImage';

// User avatar
<DesignImage src={user.avatarUrl} ratio="square" scaling="cover" styling="circle" alt={user.name} />

// Product photo
<DesignImage src={item.photoUrl} ratio="portrait" scaling="cover" alt={item.title} />

// Banner / hero
<DesignImage src={banner.src} ratio="landscape" scaling="cover" alt={banner.alt} />

// With fallback
<DesignImage
  src={user.avatar}
  fallbackSrc="/placeholder-avatar.png"
  ratio="square"
  scaling="cover"
  styling="circle"
  alt="User avatar"
/>

// With label
<DesignImage src={item.photo} ratio="landscape" scaling="cover" alt={item.title} label={item.title} />`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default ImageDocs;
