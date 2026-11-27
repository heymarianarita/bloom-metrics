import { useState } from "react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import SideNavSidebar from "@/pages/patterns/previews/SideNavSidebar";

const sidebarProps = [
  { name: "activeNav", type: "string", description: "ID of the currently active navigation item" },
  { name: "setActiveNav", type: "(id: string) => void", description: "Callback to change the active nav item" },
  { name: "collapsed", type: "boolean", description: "Whether the sidebar is in collapsed (icon-only) mode" },
  { name: "onToggleCollapse", type: "() => void", description: "Callback to toggle collapsed state" },
  { name: "showRightBorder", type: "boolean", default: "false", description: "When true, renders a right border (border-r border-border) on the sidebar. Useful when the main content sits on the same background color." },
  { name: "showDivider", type: "boolean", default: "false", description: "When true, renders a vertical divider line (border-r border-border) on the outer wrapper. Useful in hybrid layouts (e.g. Top and Side Nav) to visually separate the sidebar from the content area." },
];

const navItemProps = [
  { name: "icon", type: "React.ElementType", description: "Lucide icon component for the nav item" },
  { name: "label", type: "string", description: "Display text for the nav item" },
  { name: "id", type: "string", description: "Unique identifier used for active state matching" },
  { name: "badge", type: "string", description: "Optional badge text (e.g. count) displayed on the right" },
  { name: "children", type: "Array<{ label, id }>", description: "Sub-items rendered as a collapsible group" },
];

const anatomyItems = [
  { name: "Workspace header", description: "Logo (visible in both expanded and collapsed states), workspace name, subtitle, and collapse toggle button." },
  { name: "Navigation sections", description: "Groups of nav items separated by dividers. Section labels are hidden." },
  { name: "Nav item (leaf)", description: "Icon + label + optional badge. Highlights on active state." },
  { name: "Nav item (parent)", description: "Collapsible parent with chevron. Children rendered with a left border line." },
  { name: "User section", description: "Avatar, name, email, and a dropdown menu with Settings, Help, and Log out. Sticky at the bottom of the viewport (sidebar is h-screen sticky top-0)." },
];

const stateRows = [
  { state: "Default", description: "Text is `muted-foreground`. No background." },
  { state: "Hover", description: "Background `rgba(0,119,130, 0.06)` (6% primary tint)." },
  { state: "Active / Pressed", description: "Background `rgba(0,119,130, 0.04)` (4% primary tint)." },
  { state: "Selected", description: "Text `--primary-extra-dark`. Background `rgba(0,119,130, 0.08)` (8% primary tint)." },
  { state: "Selected (child)", description: "Same as selected but with `font-medium` weight." },
  { state: "Focus-visible", description: "2px primary ring with 1px offset." },
  { state: "Disabled", description: "Not applicable — items are always interactive." },
];

const SidebarDocs = () => {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav2, setActiveNav2] = useState("listings-pending");
  const [collapsed2, setCollapsed2] = useState(true);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Sidebar"
        description="Collapsible side navigation with workspace branding, grouped nav items, collapsible sub-menus, badges, tooltips, and a user profile dropdown."
      />

      {/* Anatomy */}
      <ComponentSection title="Anatomy">
        <div className="space-y-2">
          {anatomyItems.map((item) => (
            <div key={item.name} className="flex gap-3">
              <span className="text-sm font-medium text-foreground min-w-[160px]">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.description}</span>
            </div>
          ))}
        </div>
      </ComponentSection>

      {/* Live Preview — Expanded */}
      <ComponentSection title="Expanded (256px)" description="Full sidebar with labels, badges, collapsible groups, and user section.">
        <div className="border border-[var(--border)] rounded-[6px] overflow-hidden h-[520px] flex">
          <SideNavSidebar
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
          <div className="flex-1 bg-background flex items-center justify-center text-muted-foreground text-sm">
            Content area — active: <span className="font-medium text-foreground ml-1">{activeNav}</span>
          </div>
        </div>
      </ComponentSection>

      {/* Live Preview — Collapsed */}
      <ComponentSection title="Collapsed (60px)" description="Icon-only mode with tooltips on hover. Click the expand button to toggle.">
        <div className="border border-[var(--border)] rounded-[6px] overflow-hidden h-[520px] flex">
          <SideNavSidebar
            activeNav={activeNav2}
            setActiveNav={setActiveNav2}
            collapsed={collapsed2}
            onToggleCollapse={() => setCollapsed2((v) => !v)}
          />
          <div className="flex-1 bg-background flex items-center justify-center text-muted-foreground text-sm">
            Content area — active: <span className="font-medium text-foreground ml-1">{activeNav2}</span>
          </div>
        </div>
      </ComponentSection>

      {/* Interactive States */}
      <ComponentSection title="Interactive States">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 text-muted-foreground font-normal w-[160px]">State</th>
                <th className="text-left py-2 text-muted-foreground font-normal">Style</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((row) => (
                <tr key={row.state} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="py-2 pr-4 font-medium text-foreground">{row.state}</td>
                  <td className="py-2 text-muted-foreground">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentSection>

      {/* Dimensions */}
      <ComponentSection title="Dimensions">
        <div className="space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Expanded width</span>
            <span className="text-muted-foreground">256px</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Collapsed width</span>
            <span className="text-muted-foreground">60px</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Nav item height</span>
            <span className="text-muted-foreground">40px (icon + label + padding)</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Icon size</span>
            <span className="text-muted-foreground">16×16px</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Border radius</span>
            <span className="text-muted-foreground">6px (all interactive elements)</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Transition</span>
            <span className="text-muted-foreground">width 200ms ease (collapse/expand)</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-foreground min-w-[160px]">Header-to-nav gap</span>
            <span className="text-muted-foreground">24px (pt-6) from header to first nav section</span>
          </div>
        </div>
      </ComponentSection>

      {/* Behavior */}
      <ComponentSection title="Behavior">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Collapse toggle:</span> Clicking the PanelLeftClose/PanelLeftOpen icon toggles between 256px and 60px. The sidebar is <code className="text-xs bg-docs-code px-1 py-0.5 rounded">sticky top-0 h-screen pt-2</code> (8px top margin), keeping the user section pinned to the bottom of the viewport at all times.</p>
          <p><span className="font-medium text-foreground">Collapsed logo:</span> The workspace logo remains visible at the top of the sidebar when collapsed, providing persistent brand identity.</p>
          <p><span className="font-medium text-foreground">Collapsed tooltips:</span> In collapsed mode, each icon shows a DesignTooltip on the right side with the item label (and badge count if present).</p>
          <p><span className="font-medium text-foreground">Collapsible groups:</span> Parent items with children render a Collapsible. The chevron rotates 90° when closed. Children are indented with a left border line.</p>
          <p><span className="font-medium text-foreground">Badge dot (collapsed):</span> Items with badges show a small primary-colored dot (top-right) when the sidebar is collapsed.</p>
          <p><span className="font-medium text-foreground">User dropdown:</span> The user section triggers a DropdownMenu with Settings, Help & Support, and a destructive Log out action. In collapsed mode it opens to the right; expanded opens to the top.</p>
          <p><span className="font-medium text-foreground">Section dividers:</span> Horizontal border lines separate navigation groups. Section labels are hidden.</p>
        </div>
      </ComponentSection>

      {/* Nav data structure */}
      <ComponentSection title="Navigation Data Structure">
        <CodeBlock code={`const navSections = [
  {
    label: "Overview",       // Section label (hidden in UI)
    items: [
      {
        icon: LayoutDashboard, // Lucide icon component
        label: "Dashboard",    // Display text
        id: "dashboard",       // Unique ID for active matching
      },
      {
        icon: ShoppingBag,
        label: "Listings",
        id: "listings",
        badge: "1.2k",          // Optional badge text
        children: [             // Sub-items (collapsible)
          { label: "All listings", id: "listings" },
          { label: "Pending review", id: "listings-pending" },
          { label: "Flagged", id: "listings-flagged" },
        ],
      },
    ],
  },
];`} />
      </ComponentSection>

      {/* Usage */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-3">Usage</h2>
        <CodeBlock code={`import SideNavSidebar from '@/pages/patterns/previews/SideNavSidebar';

const [activeNav, setActiveNav] = useState("dashboard");
const [collapsed, setCollapsed] = useState(false);

<div className="flex h-screen">
  <SideNavSidebar
    activeNav={activeNav}
    setActiveNav={setActiveNav}
    collapsed={collapsed}
    onToggleCollapse={() => setCollapsed(v => !v)}
  />
  <main className="flex-1 overflow-auto">
    {/* Page content */}
  </main>
</div>`} />
      </div>

      {/* Props */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">Sidebar Props</h2>
        <PropsTable props={sidebarProps} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">NavItem Shape</h2>
        <PropsTable props={navItemProps} />
      </div>
    </div>
  );
};

export default SidebarDocs;
