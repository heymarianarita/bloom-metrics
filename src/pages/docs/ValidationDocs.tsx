import { DesignValidation } from "@/components/ds/DesignValidation";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "text", type: "ReactNode", description: "Validation message (required)" },
  { name: "theme", type: '"primary" | "dark" | "muted" | "success" | "caution" | "destructive"', default: '"primary"', description: "Color theme" },
  { name: "hideIcon", type: "boolean", default: "false", description: "Hide the theme icon, showing text only" },
];

const themes = ["primary", "dark", "muted", "success", "caution", "destructive"] as const;

const messages: Record<typeof themes[number], string> = {
  primary: "Please enter a valid email address.",
  dark: "This field is required.",
  muted: "Optional — you can skip this step.",
  success: "Email verified successfully!",
  caution: "Your session will expire in 5 minutes.",
  destructive: "Card expired. Please update your payment method.",
};

const ValidationDocs = () => {
  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Validation"
        description="Inline validation message displayed below form inputs. Typically used via InputText's validation prop."
      />

      <ComponentSection title="Themes">
        <div className="space-y-2">
          {themes.map((t) => (
            <DesignValidation key={t} text={messages[t]} theme={t} />
          ))}
        </div>
      </ComponentSection>

      <ComponentSection title="Used with InputText" description="Pass a validation string and error flag to InputText.">
        <div className="w-full max-w-sm">
          <DesignInputText
            title="Email"
            defaultValue="invalid-email"
            validation="Please enter a valid email address."
            error
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Registration form with multiple validation states.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <DesignNavigation title="Create account" showBackButton />
          <DesignDivider />
          <div className="px-4 pt-4 space-y-4">
            <div>
              <DesignInputText title="Email" defaultValue="anna@" error />
              <DesignValidation text="Please enter a valid email address." theme="destructive" />
            </div>
            <div>
              <DesignInputText title="Username" defaultValue="anna_k" />
              <DesignValidation text="Username is available!" theme="success" />
            </div>
            <div>
              <DesignInputText title="Password" type="password" defaultValue="abc" error />
              <DesignValidation text="Password must be at least 8 characters." theme="destructive" />
              <DesignValidation text="Use a mix of letters, numbers, and symbols." theme="caution" />
            </div>
          </div>
          <div className="px-4 pt-4 pb-4">
            <DesignButton variant="filled" theme="primary" fullWidth disabled>Create account</DesignButton>
          </div>
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignValidation } from '@/components/ds/DesignValidation';

// Standalone
<DesignValidation text="This field is required." theme="dark" />

// With InputText (pass via validation prop)
<DesignInputText
  title="Email"
  value={email}
  onChange={setEmail}
  validation={
    !isValid && <DesignValidation text="Please enter a valid email." theme="dark" />
  }
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default ValidationDocs;