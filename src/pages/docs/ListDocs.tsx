import { DesignList } from "@/components/ds/DesignList";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignLabel } from "@/components/ds/DesignLabel";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignImage } from "@/components/ds/DesignImage";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { User, Bell, Shield, HelpCircle, CreditCard, LogOut, Globe, Moon, Package, Truck, Star } from "lucide-react";
import { useState } from "react";

const props = [
  { name: "children", type: "ReactNode", description: "List items" },
  { name: "direction", type: '"vertical" | "horizontal"', default: '"vertical"', description: "Layout direction" },
  { name: "dividerBetween", type: "boolean", default: "false", description: "Show dividers between items" },
  { name: "showStartDivider", type: "boolean", default: "false", description: "Show divider before first item" },
  { name: "showEndDivider", type: "boolean", default: "false", description: "Show divider after last item" },
  { name: "scroll", type: "boolean", default: "false", description: "Makes list scrollable" },
];

const ListDocs = () => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="List"
        description="Vertical or horizontal container for repeating items, with optional dividers and scroll."
      />

      <ComponentSection title="Settings screen" description="List + Cell with icons, chevrons, and toggles — typical settings pattern.">
        <div className="w-full max-w-sm border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
          <DesignList dividerBetween>
            <DesignCell title="Profile" icon={User} showChevron clickable />
            <DesignCell title="Notifications" icon={Bell} showChevron clickable />
            <DesignCell title="Privacy" icon={Shield} showChevron clickable />
            <DesignCell title="Payment methods" icon={CreditCard} showChevron clickable />
            <DesignCell title="Help centre" icon={HelpCircle} showChevron clickable />
          </DesignList>
        </div>
      </ComponentSection>

      <ComponentSection title="With toggles" description="Cell control types inside a List for preference screens.">
        <div className="w-full max-w-sm border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
          <DesignList dividerBetween>
            <DesignCell
              title="Push notifications"
              icon={Bell}
              controlType="toggle"
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
            />
            <DesignCell
              title="Dark mode"
              icon={Moon}
              controlType="toggle"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
            <DesignCell title="Language" icon={Globe} subtitle="English" showChevron clickable />
          </DesignList>
        </div>
      </ComponentSection>

      <ComponentSection title="With subtitles and dividers" description="Supporting text for each Cell item.">
        <div className="w-full max-w-sm">
          <DesignList dividerBetween>
            <DesignCell title="Profile settings" bodyText="Update your personal info" showChevron clickable />
            <DesignCell title="Notifications" bodyText="Manage your alerts" showChevron clickable />
            <DesignCell title="Privacy" bodyText="Control your data" showChevron clickable />
            <DesignCell title="Help centre" bodyText="Get support" showChevron clickable />
          </DesignList>
        </div>
      </ComponentSection>

      <ComponentSection title="Danger action" description="Use a destructive-styled Cell at the end of a settings list.">
        <div className="w-full max-w-sm border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
          <DesignList dividerBetween>
            <DesignCell title="Account settings" icon={User} showChevron clickable />
            <DesignCell title="Privacy" icon={Shield} showChevron clickable />
            <DesignCell
              title="Log out"
              icon={LogOut}
              clickable
              iconClassName="text-[var(--destructive)]"
              className="text-[var(--destructive)]"
            />
          </DesignList>
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Order history screen with grouped sections and status badges.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
          <DesignLabel text="Active" styling="default" />
          <DesignList dividerBetween>
            <DesignCell
              title="Wool Blend Sweater"
              bodyText="Shipped · Arriving Mar 20"
              prefix={<DesignImage src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=100&q=80" ratio="square" scaling="cover" alt="Sweater" className="w-12 rounded-lg" />}
              suffix={<DesignBadge theme="primary" styling="filled">In transit</DesignBadge>}
              showChevron clickable
            />
            <DesignCell
              title="Leather Crossbody Bag"
              bodyText="Awaiting seller shipment"
              prefix={<DesignImage src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100&q=80" ratio="square" scaling="cover" alt="Bag" className="w-12 rounded-lg" />}
              suffix={<DesignBadge theme="highlight" styling="light">Pending</DesignBadge>}
              showChevron clickable
            />
          </DesignList>
          <DesignLabel text="Completed" styling="default" />
          <DesignList dividerBetween>
            <DesignCell
              title="Air Jordan 1 Retro"
              bodyText="Delivered · Mar 8"
              prefix={<DesignImage src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100&q=80" ratio="square" scaling="cover" alt="Jordans" className="w-12 rounded-lg" />}
              suffix={<DesignBadge theme="success" styling="filled">Delivered</DesignBadge>}
              showChevron clickable
            />
            <DesignCell
              title="Silk Summer Dress"
              bodyText="Delivered · Feb 25"
              prefix={<DesignImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" ratio="square" scaling="cover" alt="Dress" className="w-12 rounded-lg" />}
              suffix={<DesignBadge theme="success" styling="filled">Delivered</DesignBadge>}
              showChevron clickable
            />
          </DesignList>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignList } from '@/components/ds/DesignList';
import { DesignCell } from '@/components/ds/DesignCell';
import { User, Bell, Shield } from 'lucide-react';

// Settings screen
<DesignList dividerBetween>
  <DesignCell title="Profile" icon={User} showChevron clickable />
  <DesignCell title="Notifications" icon={Bell} showChevron clickable />
  <DesignCell title="Privacy" icon={Shield} showChevron clickable />
</DesignList>

// With toggles
<DesignList dividerBetween>
  <DesignCell
    title="Push notifications"
    icon={Bell}
    controlType="toggle"
    checked={pushEnabled}
    onCheckedChange={setPushEnabled}
  />
</DesignList>

// With body text
<DesignList dividerBetween>
  <DesignCell title="Profile" bodyText="Update your info" showChevron clickable />
  <DesignCell title="Privacy" bodyText="Control your data" showChevron clickable />
</DesignList>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default ListDocs;
