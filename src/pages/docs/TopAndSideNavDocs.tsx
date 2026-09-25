import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const propsList = [
  { name: "navTabs", type: "string[]", description: "Navigation tabs displayed in the top bar. Defaults to sidebar section labels." },
  { name: "activeTab", type: "string", description: "Currently active top tab (controlled)." },
  { name: "onTabChange", type: "(tab: string) => void", description: "Callback when a top tab is selected." },
  { name: "activeNav", type: "string", description: "Currently active sidebar navigation item (controlled)." },
  { name: "onNavChange", type: "(id: string) => void", description: "Callback when a sidebar navigation item is selected." },
  { name: "logoSrc", type: "string", default: "vintedIconRounded", description: "Logo image source displayed in the top bar." },
  { name: "logoAlt", type: "string", default: '"Logo"', description: "Alt text for the logo image." },
  { name: "title", type: "string", default: '"Vinted Admin"', description: "Title displayed next to the logo in the top bar." },
  { name: "userName", type: "string", default: '"John Doe"', description: "User display name shown in the avatar button." },
  { name: "userInitials", type: "string", default: '"JD"', description: "User initials rendered inside the avatar fallback." },
  { name: "children", type: "ReactNode", description: "Content rendered in the main area beside the sidebar." },
];

const basicExample = `import { DesignTopAndSideNav } from "@/components/ds/DesignTopAndSideNav";

<DesignTopAndSideNav>
  <div className="p-6">Main content here</div>
</DesignTopAndSideNav>`;

const controlledExample = `import { useState } from "react";
import { DesignTopAndSideNav } from "@/components/ds/DesignTopAndSideNav";

const App = () => {
  const [activeTab, setActiveTab] = useState("Marketplace");
  const [activeNav, setActiveNav] = useState("dashboard");

  return (
    <DesignTopAndSideNav
      navTabs={["Overview", "Marketplace", "Vinted Pay"]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      title="Vinted Admin"
      userName="Jane Smith"
      userInitials="JS"
    >
      <div className="p-6">
        <h1>Active tab: {activeTab}</h1>
        <p>Active nav: {activeNav}</p>
      </div>
    </DesignTopAndSideNav>
  );
};`;

const TopAndSideNavDocs = () => (
  <div className="space-y-10">
    <PageHeader
      title="TopAndSideNav"
      description="A composite navigation layout that combines a sticky 56px top bar with a vertical sidebar. Top bar tabs act as high-level category filters that dynamically update the sidebar sections. Ideal for admin tools and internal dashboards with hierarchical navigation."
    />

    {/* Anatomy */}
    <ComponentSection title="Anatomy" description="The component is composed of three zones:">
      <div className="space-y-3 text-sm text-muted-foreground max-w-2xl">
        <div className="flex gap-3">
          <span className="font-[580] text-foreground w-24 shrink-0">Top bar</span>
          <span>56px sticky header with logo, horizontal navigation tabs, user avatar, and a dropdown menu. Uses <code className="text-xs bg-spacing-bg px-1 py-0.5 rounded">--primary-dark</code> background.</span>
        </div>
        <div className="flex gap-3">
          <span className="font-[580] text-foreground w-24 shrink-0">Sidebar</span>
          <span>Vertical navigation filtered by the active top tab. Hides its own header (logo & collapse toggle) to avoid duplication with the top bar.</span>
        </div>
        <div className="flex gap-3">
          <span className="font-[580] text-foreground w-24 shrink-0">Main area</span>
          <span>Flexible content region rendered via <code className="text-xs bg-spacing-bg px-1 py-0.5 rounded">children</code>. Fills remaining viewport width.</span>
        </div>
      </div>
    </ComponentSection>

    {/* Behaviour */}
    <ComponentSection title="Behaviour" description="Key interaction patterns.">
      <div className="space-y-2 text-sm text-muted-foreground max-w-2xl">
        <p>• Selecting a top tab filters the sidebar to show only the matching section's navigation items.</p>
        <p>• The first sidebar item in the new section is automatically selected on tab change.</p>
        <p>• Top tab interaction states use white-opacity overlays: hover 6%, active 8%, selected 12%.</p>
        <p>• The sidebar collapses independently via its built-in toggle.</p>
        <p>• A vertical divider (<code className="text-xs bg-spacing-bg px-1 py-0.5 rounded">showDivider</code>) separates the sidebar from the main content area. Content is offset 16px from the divider.</p>
        <p>• The user avatar and dropdown menu are always visible in the top-right corner.</p>
      </div>
    </ComponentSection>

    {/* Basic usage */}
    <ComponentSection title="Basic usage" description="Drop in the component with default props — tabs are derived from the sidebar section labels.">
      <CodeBlock code={basicExample} />
    </ComponentSection>

    {/* Controlled */}
    <ComponentSection title="Controlled usage" description="Pass activeTab, activeNav, and their change handlers for full control.">
      <CodeBlock code={controlledExample} />
    </ComponentSection>

    {/* Props */}
    <ComponentSection title="Props">
      <PropsTable props={propsList} />
    </ComponentSection>
  </div>
);

export default TopAndSideNavDocs;
