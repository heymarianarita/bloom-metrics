import { useState } from "react";
import { DesignToggle } from "@/components/ds/DesignToggle";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "checked", type: "boolean", description: "Controlled checked state" },
  { name: "onCheckedChange", type: "(checked: boolean) => void", description: "Change handler" },
  { name: "defaultChecked", type: "boolean", default: "false", description: "Initial state (uncontrolled)" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the toggle" },
];

const ToggleDocs = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Toggle"
        description="On/off switch input with optional label. Ideal for settings and preferences."
      />

      <ComponentSection title="Basic" description="Uncontrolled toggle.">
        <div className="flex items-center gap-3">
          <DesignToggle />
          <span className="text-sm text-foreground">Enable feature</span>
        </div>
      </ComponentSection>

      <ComponentSection title="Controlled">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <DesignToggle checked={notifications} onCheckedChange={setNotifications} />
            <span className="text-sm text-foreground">Push notifications</span>
          </div>
          <div className="flex items-center gap-3">
            <DesignToggle checked={darkMode} onCheckedChange={setDarkMode} />
            <span className="text-sm text-foreground">Dark mode</span>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="States">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <DesignToggle />
            <span className="text-sm text-foreground">Off (default)</span>
          </div>
          <div className="flex items-center gap-3">
            <DesignToggle defaultChecked />
            <span className="text-sm text-foreground">On</span>
          </div>
          <div className="flex items-center gap-3">
            <DesignToggle disabled />
            <span className="text-sm text-docs-muted">Disabled off</span>
          </div>
          <div className="flex items-center gap-3">
            <DesignToggle defaultChecked disabled />
            <span className="text-sm text-docs-muted">Disabled on</span>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Notification preferences screen with toggle settings.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <DesignNavigation title="Notifications" showBackButton />
          <DesignDivider />
          <DesignCell
            title="Push notifications"
            subtitle="Alerts for messages and orders"
            suffix={<DesignToggle checked={notifications} onCheckedChange={setNotifications} />}
            showDivider
          />
          <DesignCell
            title="Email updates"
            subtitle="Weekly digest and promotions"
            suffix={<DesignToggle checked={darkMode} onCheckedChange={setDarkMode} />}
            showDivider
          />
          <DesignCell
            title="SMS alerts"
            subtitle="Security and login notifications"
            suffix={<DesignToggle defaultChecked />}
            showDivider
          />
          <DesignCell
            title="Marketing"
            subtitle="Personalised offers and deals"
            suffix={<DesignToggle disabled />}
          />
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignToggle } from '@/components/ds/DesignToggle';
import { useState } from 'react';

// Uncontrolled
<DesignToggle />

// Controlled
const [enabled, setEnabled] = useState(false);
<DesignToggle
  checked={enabled}
  onCheckedChange={setEnabled}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default ToggleDocs;
