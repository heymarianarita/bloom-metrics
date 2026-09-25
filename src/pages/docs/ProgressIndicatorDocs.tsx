import { useState } from "react";
import { DesignProgressIndicator, type ProgressState } from "@/components/ds/DesignProgressIndicator";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { MoreHorizontal, CircleCheckBig } from "lucide-react";

const props = [
  { name: "steps", type: "ProgressStep[]", description: "Array of step objects with title, state, optional caption and suffix" },
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Layout direction" },
  { name: "size", type: '"default" | "small"', default: '"default"', description: "Icon and typography size" },
];

const stepProps = [
  { name: "title", type: "string", description: "Step label text" },
  { name: "caption", type: "string", description: "Secondary text below title" },
  { name: "state", type: '"current" | "completed" | "disabled" | "error"', description: "Visual state of the step" },
  { name: "suffix", type: "ReactNode", description: "Content rendered on the right (vertical only)" },
];

const signupStepLabels = ["Account", "Profile", "Terms", "Done"];

const SignUpFlowExample = () => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);

  const getState = (i: number): ProgressState => {
    if (i < step) return "completed";
    if (i === step) return "current";
    return "disabled";
  };

  const canNext = () => {
    if (step === 0) return email.length > 0 && password.length > 0;
    if (step === 1) return name.length > 0;
    if (step === 2) return agreed;
    return false;
  };

  const handleNext = () => {
    if (step < signupStepLabels.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleReset = () => {
    setStep(0);
    setEmail("");
    setPassword("");
    setName("");
    setUsername("");
    setAgreed(false);
  };

  return (
    <div className="w-full max-w-[480px] space-y-6">
      <DesignProgressIndicator
        steps={signupStepLabels.map((title, i) => ({ title, state: getState(i) }))}
      />

      <div className="rounded-xl border border-docs-border bg-background p-6 min-h-[180px]">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[var(--text-primary)]">Create your account</h3>
            <DesignInputText title="Email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <DesignInputText title="Password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[var(--text-primary)]">Tell us about you</h3>
            <DesignInputText title="Full name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
            <DesignInputText title="Username (optional)" placeholder="@janedoe" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[var(--text-primary)]">Terms & Conditions</h3>
            <p className="text-sm text-note leading-[18px]">
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <DesignCheckbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
              <span className="text-sm text-[var(--text-primary)]">I agree to the Terms & Conditions</span>
            </label>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3 text-center py-4">
            <CircleCheckBig className="w-10 h-10 text-primary mx-auto" />
            <h3 className="text-base font-medium text-[var(--text-primary)]">You're all set!</h3>
            <p className="text-sm text-note">Your account has been created successfully.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && step < signupStepLabels.length - 1 && (
          <DesignButton size="small" variant="outlined" theme="primary" onClick={handleBack}>
            Back
          </DesignButton>
        )}
        {step < signupStepLabels.length - 1 && (
          <DesignButton size="small" variant="filled" theme="primary" onClick={handleNext} disabled={!canNext()}>
            {step === 2 ? "Create Account" : "Continue"}
          </DesignButton>
        )}
        {step === signupStepLabels.length - 1 && (
          <DesignButton size="small" variant="flat" theme="muted" onClick={handleReset}>
            Start Over
          </DesignButton>
        )}
      </div>
    </div>
  );
};

const ProgressIndicatorDocs = () => {
  const [active, setActive] = useState(1);
  const stepLabels = ["Step 1", "Step 2", "Step 3"];

  const getState = (i: number): ProgressState => {
    if (i < active) return "completed";
    if (i === active) return "current";
    return "disabled";
  };

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="ProgressIndicator"
        description="Step-by-step progress visualization showing current, completed, and upcoming steps with optional labels, captions, and icons."
      />

      <ComponentSection title="Real-world usage" description="Multi-step sign-up flow with form validation and progress tracking.">
        <SignUpFlowExample />
      </ComponentSection>

      <ComponentSection title="Horizontal (Interactive)">
        <div className="w-full space-y-4">
          <DesignProgressIndicator
            steps={stepLabels.map((title, i) => ({ title, state: getState(i) }))}
          />
          <div className="flex gap-2 pt-2">
            <DesignButton size="small" variant="outlined" theme="primary" onClick={() => setActive(Math.max(0, active - 1))}>
              Previous
            </DesignButton>
            <DesignButton size="small" variant="filled" theme="primary" onClick={() => setActive(Math.min(stepLabels.length - 1, active + 1))}>
              Next
            </DesignButton>
            <DesignButton size="small" variant="flat" theme="muted" onClick={() => setActive(0)}>
              Reset
            </DesignButton>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Vertical with suffix">
        <div className="w-full">
          <DesignProgressIndicator
            orientation="vertical"
            steps={[
              {
                title: "Enter Password",
                state: "completed",
                suffix: <MoreHorizontal className="w-5 h-5 text-note" />,
              },
              {
                title: "Confirm Password",
                state: "completed",
                suffix: <MoreHorizontal className="w-5 h-5 text-note" />,
              },
              {
                title: "We've sent you a confirmation email",
                caption: "Check your email",
                state: "current",
                suffix: <MoreHorizontal className="w-5 h-5 text-note" />,
              },
            ]}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Horizontal — Small size">
        <div className="w-full">
          <DesignProgressIndicator
            size="small"
            steps={[
              { title: "Step 1", state: "completed" },
              { title: "Step 2", state: "current" },
              { title: "Step 3", state: "disabled" },
            ]}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Error state">
        <div className="w-full">
          <DesignProgressIndicator
            steps={[
              { title: "Address", state: "completed" },
              { title: "Payment", state: "error" },
              { title: "Review", state: "disabled" },
            ]}
          />
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignProgressIndicator } from '@/components/ds/DesignProgressIndicator';

<DesignProgressIndicator
  steps={[
    { title: "Step 1", state: "completed" },
    { title: "Step 2", state: "current" },
    { title: "Step 3", state: "disabled" },
  ]}
/>

// Vertical with captions
<DesignProgressIndicator
  orientation="vertical"
  steps={[
    { title: "Enter Password", state: "completed" },
    { title: "Confirm Password", state: "current", caption: "8+ characters" },
    { title: "Done", state: "disabled" },
  ]}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">ProgressStep</h2>
        <PropsTable props={stepProps} />
      </div>
    </div>
  );
};

export default ProgressIndicatorDocs;
