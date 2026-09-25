import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const sizes = ["small", "medium", "default", "large", "x-large"] as const;
const themes = ["primary", "success", "error", "highlight", "muted", "dark"] as const;

const props = [
  { name: "size", type: '"small" | "medium" | "default" | "large" | "x-large"', default: '"default"', description: "Spinner diameter" },
  { name: "theme", type: '"primary" | "success" | "error" | "highlight" | "muted" | "dark"', default: '"primary"', description: "Color theme" },
  { name: "state", type: '"loading" | "success" | "failed"', default: '"loading"', description: "Visual state — spinning, checkmark, or cross" },
  { name: "lifted", type: "boolean", default: "false", description: "Renders on an elevated card surface" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const LoaderDocs = () => (
  <div className="p-10 max-w-4xl">
    <PageHeader title="Loader" description="Animated spinner with success and failed result states." />

    <ComponentSection title="Sizes" description="Available diameter options.">
      <div className="flex items-end gap-6">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <DesignLoader size={size} />
            <span className="text-xs text-content-secondary capitalize">{size}</span>
          </div>
        ))}
      </div>
    </ComponentSection>

    <ComponentSection title="Themes" description="Color variants matching the button palette.">
      <div className="flex items-center gap-6">
        {themes.map((theme) => (
          <div key={theme} className="flex flex-col items-center gap-2">
            <DesignLoader size="large" theme={theme} />
            <span className="text-xs text-content-secondary capitalize">{theme}</span>
          </div>
        ))}
      </div>
    </ComponentSection>

    <ComponentSection title="States" description="Loading, success (checkmark), and failed (cross) states.">
      <div className="flex items-center gap-8">
        {(["loading", "success", "failed"] as const).map((state) => (
          <div key={state} className="flex flex-col items-center gap-2">
            <DesignLoader size="large" state={state} />
            <span className="text-xs text-content-secondary capitalize">{state}</span>
          </div>
        ))}
      </div>
    </ComponentSection>

    <ComponentSection title="States across sizes" description="Result icons scale with the loader size.">
      <div className="flex items-end gap-6">
        {sizes.map((size) => (
          <div key={size} className="flex flex-col items-center gap-3">
            <DesignLoader size={size} state="success" />
            <DesignLoader size={size} state="failed" />
            <span className="text-xs text-content-secondary capitalize">{size}</span>
          </div>
        ))}
      </div>
    </ComponentSection>

    <ComponentSection title="Lifted" description="On an elevated card surface.">
      <div className="flex items-center gap-6">
        <DesignLoader size="large" lifted />
        <DesignLoader size="large" state="success" lifted />
        <DesignLoader size="large" state="failed" lifted />
      </div>
    </ComponentSection>

    <ComponentSection title="Example: Real-world usage" description="Payment processing overlay showing loading → success states.">
      <div className="w-full max-w-xs mx-auto">
        <DesignCard variant="elevated" className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <DesignLoader size="x-large" state="success" lifted />
            <div>
              <p className="text-base font-medium text-content">Payment successful!</p>
              <p className="text-sm text-content-secondary mt-1">€49.95 charged to Visa •••• 4242</p>
            </div>
            <DesignButton variant="filled" theme="primary" fullWidth>View order</DesignButton>
            <DesignButton variant="flat" theme="muted" fullWidth>Continue shopping</DesignButton>
          </div>
        </DesignCard>
      </div>
    </ComponentSection>

    <div className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
      <CodeBlock code={`import { DesignLoader } from '@/components/ds/DesignLoader';

// Spinning loader
<DesignLoader size="large" theme="primary" />

// Success state
<DesignLoader size="large" state="success" />

// Failed state
<DesignLoader size="large" state="failed" />

// On elevated surface
<DesignLoader size="large" state="success" lifted />`} />
    </div>

    <div className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
      <PropsTable props={props} />
    </div>
  </div>
);

export default LoaderDocs;
