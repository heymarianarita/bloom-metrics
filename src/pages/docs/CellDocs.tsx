import { useState } from "react";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignValidation } from "@/components/ds/DesignValidation";
import { DesignRadioGroup } from "@/components/ds/DesignRadio";
import { User, Settings, CreditCard, Bell, Shield, HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "title", type: "ReactNode", description: "Primary text content" },
  { name: "subtitle", type: "ReactNode", description: "Right-aligned secondary text" },
  { name: "bodyText", type: "string", description: "Body text below title" },
  { name: "prefix", type: "ReactNode", description: "Left slot — icons, avatars, thumbnails" },
  { name: "icon", type: "LucideIcon", description: "Left icon component (alternative to prefix)" },
  { name: "suffix", type: "ReactNode", description: "Right slot — badges, actions, metadata" },
  { name: "suffixIcon", type: "LucideIcon", description: "Right icon" },
  { name: "styling", type: '"default" | "tight" | "narrow" | "wide"', default: '"default"', description: "Controls internal padding" },
  { name: "theme", type: '"default" | "primary" | "muted" | "success" | "transparent"', default: '"default"', description: "Background color theme" },
  { name: "validation", type: "ReactNode", description: "Validation message shown below content" },
  { name: "showChevron", type: "boolean", default: "false", description: "Shows a right chevron" },
  { name: "showDivider", type: "boolean", default: "false", description: "Adds a bottom border divider" },
  { name: "clickable", type: "boolean", default: "false", description: "Changes cursor to pointer" },
  { name: "highlighted", type: "boolean", default: "false", description: "Highlights the cell background" },
  { name: "disabled", type: "boolean", default: "false", description: "Dims and disables interactions" },
  { name: "url", type: "string", description: "Renders as anchor tag" },
  { name: "onClick", type: "() => void", description: "Click handler" },
  { name: "controlType", type: '"checkbox" | "radio" | "toggle"', description: "Embedded form control type" },
  { name: "checked", type: "boolean", description: "Control checked state" },
  { name: "onCheckedChange", type: "(checked: boolean) => void", description: "Control change handler" },
];

const CellDocs = () => {
  const [check1, setCheck1] = useState(true);
  const [toggle1, setToggle1] = useState(false);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Cell"
        description="Row-based list item with flexible prefix, title, subtitle, body, and suffix slots. The fundamental building block for lists and settings."
      />

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Layout tip:</strong> Cell should almost always sit in a container with <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">p-0</code> (zero padding) so it spans the full width edge-to-edge.
      </div>

      <ComponentSection title="Basic variants">
        <div className="w-full">
          <DesignCell title="Basic cell" showDivider />
          <DesignCell title="With subtitle" subtitle="Supporting text" showDivider />
          <DesignCell title="Navigating cell" showChevron showDivider clickable onClick={() => {}} />
          <DesignCell title="With badge suffix" suffix={<DesignBadge theme="highlight" styling="filled">New</DesignBadge>} />
        </div>
      </ComponentSection>

      <ComponentSection title="Stylings" description="Different padding densities.">
        <div className="w-full">
          <DesignCell title="Default styling" styling="default" showDivider />
          <DesignCell title="Tight styling" styling="tight" showDivider />
          <DesignCell title="Narrow styling" styling="narrow" showDivider />
          <DesignCell title="Wide styling" styling="wide" />
        </div>
      </ComponentSection>

      <ComponentSection title="Themes" description="Background color themes for contextual emphasis.">
        <div className="w-full">
          <DesignCell title="Default" theme="default" showDivider />
          <DesignCell title="Primary" theme="primary" showDivider />
          <DesignCell title="Muted" theme="muted" showDivider />
          <DesignCell title="Success" theme="success" showDivider />
          <DesignCell title="Transparent" theme="transparent" />
        </div>
      </ComponentSection>

      <ComponentSection title="With prefix" description="Use prefix for avatars, thumbnails, or custom icons.">
        <div className="w-full">
          <DesignCell
            prefix={
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                V
              </div>
            }
            title="Vinted user"
            bodyText="Member since 2021"
            showChevron
            showDivider
            clickable
            onClick={() => {}}
          />
          <DesignCell
            prefix={
              <div className="w-10 h-10 rounded-lg bg-greyscale-5" />
            }
            title="Product thumbnail"
            bodyText="€25 · Size S"
            suffix={<DesignBadge theme="muted" styling="filled">Sold</DesignBadge>}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Navigation cells" description="Cells with icons and chevrons for navigation lists.">
        <div className="w-full">
          <DesignCell title="My Profile" icon={User} showChevron showDivider onClick={() => {}} />
          <DesignCell title="Settings" icon={Settings} showChevron showDivider onClick={() => {}} />
          <DesignCell title="Payment Methods" icon={CreditCard} showChevron showDivider onClick={() => {}} />
          <DesignCell title="Help Centre" icon={HelpCircle} showChevron onClick={() => {}} />
        </div>
      </ComponentSection>

      <ComponentSection title="With suffix" description="Use Badge or other content in the suffix slot.">
        <div className="w-full">
          <DesignCell title="Order #999" suffix={<DesignBadge theme="success" styling="filled">Shipped</DesignBadge>} showDivider />
          <DesignCell title="Listing" suffix={<DesignBadge theme="muted" styling="light">Clothing</DesignBadge>} showDivider />
          <DesignCell title="Promotion" suffix={<DesignBadge theme="highlight" styling="filled">Hot</DesignBadge>} />
        </div>
      </ComponentSection>

      <ComponentSection title="Clickable and highlighted">
        <div className="w-full">
          <DesignCell title="Clickable row" clickable onClick={() => alert("Clicked!")} showDivider />
          <DesignCell title="Highlighted row" highlighted />
        </div>
      </ComponentSection>

      <ComponentSection title="With controls" description="Embed toggle, checkbox, or radio controls.">
        <div className="w-full">
          <DesignCell title="Push Notifications" icon={Bell} controlType="toggle" checked={toggle1} onCheckedChange={setToggle1} showDivider />
          <DesignCell title="Accept terms" icon={Shield} controlType="checkbox" checked={check1} onCheckedChange={setCheck1} showDivider />
          <DesignRadioGroup defaultValue="opt-a">
            <DesignCell title="Option A" controlType="radio" radioValue="opt-a" showDivider />
            <DesignCell title="Option B" controlType="radio" radioValue="opt-b" />
          </DesignRadioGroup>
        </div>
      </ComponentSection>

      <ComponentSection title="Validation slot" description="Show validation messages below cell content.">
        <div className="w-full">
          <DesignCell
            title="Payment method"
            validation={<DesignValidation text="Card expired" theme="destructive" hideIcon />}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="As link">
        <div className="w-full">
          <DesignCell title="Help centre" url="/help" showChevron />
        </div>
      </ComponentSection>

      <ComponentSection title="Disabled">
        <div className="w-full">
          <DesignCell title="Unavailable option" disabled />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Account settings screen with navigation cells, toggles, and grouped sections.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">Account</p>
          </div>
          <DesignCell
            prefix={<div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">AL</div>}
            title="Anna Larsson"
            bodyText="anna.larsson@email.com"
            showChevron showDivider clickable onClick={() => {}}
          />
          <DesignCell title="My Orders" icon={CreditCard} showChevron showDivider suffix={<DesignBadge theme="primary" styling="filled">3</DesignBadge>} onClick={() => {}} />
          <DesignCell title="Saved Items" icon={HelpCircle} showChevron onClick={() => {}} />

          <div className="px-4 pt-5 pb-2">
            <p className="text-xs font-medium text-content-secondary uppercase tracking-wide">Preferences</p>
          </div>
          <DesignCell title="Push Notifications" icon={Bell} controlType="toggle" checked={toggle1} onCheckedChange={setToggle1} showDivider />
          <DesignCell title="Privacy Mode" icon={Shield} controlType="toggle" checked={check1} onCheckedChange={setCheck1} />
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignCell } from '@/components/ds/DesignCell';
import { DesignBadge } from '@/components/ds/DesignBadge';
import { Settings } from 'lucide-react';

// Basic cell with divider
<DesignCell title="Settings" showDivider />

// Navigation cell with icon
<DesignCell title="Settings" icon={Settings} showChevron showDivider onClick={() => {}} />

// With prefix (avatar)
<DesignCell
  prefix={<img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />}
  title={user.name}
  bodyText="Member since 2021"
  showChevron
/>

// With badge suffix
<DesignCell
  title="Order #12345"
  suffix={<DesignBadge theme="success">Shipped</DesignBadge>}
/>

// Clickable row
<DesignCell title="Clickable" clickable onClick={() => handleClick()} />

// With toggle control
<DesignCell
  title="Notifications"
  controlType="toggle"
  checked={enabled}
  onCheckedChange={setEnabled}
/>

// As link
<DesignCell title="Help centre" url="/help" showChevron />`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default CellDocs;
