import { useState } from "react";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Search, Eye, EyeOff, Mail, DollarSign, X } from "lucide-react";

const props = [
  { name: "label", type: "string", description: "Label displayed above the input" },
  { name: "placeholder", type: "string", description: "Placeholder text" },
  { name: "value", type: "string", description: "Controlled value" },
  { name: "onChange", type: "(e: ChangeEvent) => void", description: "Change handler" },
  { name: "type", type: "string", default: '"text"', description: "HTML input type" },
  { name: "size", type: '"default" | "small"', default: '"default"', description: "Input height: default (44px) or small (36px)" },
  { name: "prefix", type: "ReactNode", description: "Leading icon or text" },
  { name: "suffix", type: "ReactNode", description: "Trailing icon or text" },
  { name: "validation", type: "string", description: "Validation message below input" },
  { name: "helperText", type: "string", description: "Helper text below input (shown when no validation)" },
  { name: "error", type: "boolean", default: "false", description: "Error state — red border and validation text" },
  { name: "success", type: "boolean", default: "false", description: "Success state — green validation text" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the input" },
];

const InputTextDocs = () => {
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="InputText"
        description="Boxed single-line text input with label, prefix/suffix, validation, and helper text. Supports default (44px) and small (36px) sizes."
      />

      {/* ── Size ── */}
      <ComponentSection title="Size">
        <div className="flex items-start gap-6">
          <div className="w-64">
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Default (44px)</p>
            <DesignInputText label="Label" placeholder="Placeholder" />
          </div>
          <div className="w-64">
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Small (36px)</p>
            <DesignInputText label="Label" placeholder="Placeholder" size="small" />
          </div>
        </div>
      </ComponentSection>

      {/* ── Prefix & Suffix ── */}
      <ComponentSection title="Prefix & Suffix">
        <div className="flex flex-col gap-6 w-72">
          <DesignInputText
            label="With prefix icon"
            placeholder="Search..."
            prefix={<Search className="w-4 h-4" />}
          />
          <DesignInputText
            label="With suffix icon"
            placeholder="Enter email"
            suffix={<Mail className="w-4 h-4" />}
          />
          <DesignInputText
            label="With both"
            placeholder="Amount"
            prefix={<DollarSign className="w-4 h-4" />}
            suffix={<span className="text-sm text-[var(--muted-foreground)]">USD</span>}
          />
        </div>
      </ComponentSection>

      {/* ── States ── */}
      <ComponentSection title="States">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-w-xl">
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Default</p>
            <DesignInputText label="Label" placeholder="Placeholder" />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Hover (hover to see)</p>
            <DesignInputText label="Label" placeholder="Placeholder" />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Focused (click to see)</p>
            <DesignInputText
              label="Label"
              placeholder="Placeholder"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Disabled</p>
            <DesignInputText label="Label" placeholder="Placeholder" disabled />
          </div>
        </div>
      </ComponentSection>

      {/* ── Validation ── */}
      <ComponentSection title="Validation">
        <div className="grid grid-cols-3 gap-6 max-w-2xl">
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Default</p>
            <DesignInputText label="Label" defaultValue="Value" validation="Validation message" />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Error</p>
            <DesignInputText
              label="Label"
              defaultValue="Invalid value"
              error
              validation="This field is required"
            />
          </div>
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-2">Success</p>
            <DesignInputText
              label="Label"
              defaultValue="Valid value"
              success
              validation="Looks good!"
            />
          </div>
        </div>
      </ComponentSection>

      {/* ── Helper text ── */}
      <ComponentSection title="Helper text">
        <div className="flex flex-col gap-6 w-72">
          <DesignInputText
            label="Password"
            type="password"
            placeholder="Enter password"
            helperText="Must be at least 8 characters"
          />
        </div>
      </ComponentSection>

      {/* ── Real-world example ── */}
      <ComponentSection title="Example: Sign-up form">
        <div className="w-full max-w-sm mx-auto rounded-[6px] border border-[var(--border)] bg-[var(--background)] p-4 space-y-4">
          <p className="text-base font-medium text-[var(--foreground)]">Create your account</p>
          <DesignInfoBanner type="info" description="Join millions of members." showCloseButton={false} />
          <DesignInputText label="Full name" placeholder="Jane Smith" />
          <DesignInputText
            label="Email"
            placeholder="you@example.com"
            prefix={<Mail className="w-4 h-4" />}
          />
          <DesignInputText
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            helperText="Must include a number and special character"
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <DesignButton variant="filled" theme="primary" fullWidth>
            Create account
          </DesignButton>
        </div>
      </ComponentSection>

      {/* ── Usage ── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Usage</h2>
        <CodeBlock
          code={`import { DesignInputText } from '@/components/ds/DesignInput';

<DesignInputText
  label="Email"
  placeholder="you@example.com"
  prefix={<Mail className="w-4 h-4" />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With validation
<DesignInputText
  label="Email"
  validation="Please enter a valid email"
  error
/>

// Small size
<DesignInputText
  label="Search"
  placeholder="Search..."
  size="small"
  prefix={<Search className="w-4 h-4" />}
/>`}
        />
      </div>

      {/* ── Props ── */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default InputTextDocs;
