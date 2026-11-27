import { useState } from "react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import TwoLevelSidebar from "@/pages/patterns/previews/TwoLevelSidebar";

const sidebarProps = [
  { name: "activeCategory", type: "string", description: "ID of the currently selected primary category" },
  { name: "setActiveCategory", type: "(id: string) => void", description: "Callback to change the active primary category" },
  { name: "activeSubItem", type: "string", description: "ID of the currently selected sub-item" },
  { name: "setActiveSubItem", type: "(id: string) => void", description: "Callback to change the active sub-item" },
  { name: "collapsed", type: "boolean", description: "Whether the right sub-category panel is collapsed" },
  { name: "onToggleCollapse", type: "() => void", description: "Callback to toggle the collapsed state of the right panel" },
  
];

const categoryShape = [
  { name: "icon", type: "React.ElementType", description: "Lucide icon component for the primary category" },
  { name: "label", type: "string", description: "Display text for the category" },
  { name: "id", type: "string", description: "Unique identifier for active state matching" },
  { name: "badge", type: "string", description: "Optional badge text displayed as a dot in the left bar" },
  { name: "children", type: "SubItem[]", description: "Sub-items displayed in the right panel when this category is active" },
];

const subItemShape = [
  { name: "label", type: "string", description: "Display text for the sub-item" },
  { name: "id", type: "string", description: "Unique identifier for active state matching" },
  { name: "badge", type: "string", description: "Optional badge count shown to the right" },
];

const anatomyItems = [
  { name: "Left bar (60px)", description: "Dark (--primary-extra-dark) icon-only primary category selector with 24px white logo at top and user avatar at bottom. Always visible." },
  { name: "Right panel (220px)", description: "Collapsible grey (spacing-bg) sub-category list. Shows category title and sub-items with optional badges. Uses background contrast for visual separation from content." },
  { name: "Collapse toggle", description: "PanelLeftClose button in the right panel header. When collapsed, a PanelLeftOpen button appears beside the left bar." },
  { name: "User dropdown", description: "Avatar button at the bottom of the left bar with Settings, Help, and Log out actions." },
];

const stateRows = [
  { state: "Default (left bar)", description: "Icon `rgba(255,255,255,0.6)`, no background." },
  { state: "Hover (left bar)", description: "Background `rgba(255,255,255,0.08)`." },
  { state: "Active (left bar)", description: "Background `rgba(255,255,255,0.04)`." },
  { state: "Selected (left bar)", description: "Icon `white`, background `rgba(255,255,255,0.15)`. Badge dot white." },
  { state: "Default (right panel)", description: "Text `muted-foreground`, no background." },
  { state: "Hover (right panel)", description: "Background `rgba(0,119,130,0.06)`." },
  { state: "Selected (right panel)", description: "Text `--primary-extra-dark`, `font-medium`, background `rgba(0,119,130,0.08)`." },
  { state: "Focus-visible", description: "2px ring. Left bar: white/50% ring with dark offset. Right panel: primary ring." },
];

const TwoLevelSidebarDocs = () => {
  const [activeCategory, setActiveCategory] = useState("overview");
  const [activeSubItem, setActiveSubItem] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const [activeCategory2, setActiveCategory2] = useState("listings");
  const [activeSubItem2, setActiveSubItem2] = useState("listings-pending");
  const [collapsed2, setCollapsed2] = useState(true);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Two-Level Sidebar"
        description="A dual-panel sidebar with a fixed icon rail for primary categories and a collapsible right panel for sub-categories. Collapsed by default on smaller viewports."
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

      {/* Expanded preview */}
      <ComponentSection title="Expanded" description="Left bar with primary icons + right panel showing sub-items for the selected category.">
        <div className="border border-[var(--border)] rounded-[6px] overflow-hidden h-[520px] flex">
          <TwoLevelSidebar
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            activeSubItem={activeSubItem}
            setActiveSubItem={setActiveSubItem}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
          <div className="flex-1 bg-background flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <p>Category: <span className="font-medium text-foreground">{activeCategory}</span></p>
              <p>Sub-item: <span className="font-medium text-foreground">{activeSubItem}</span></p>
            </div>
          </div>
        </div>
      </ComponentSection>

      {/* Collapsed preview */}
      <ComponentSection title="Collapsed" description="Right panel hidden. Only the icon rail remains. Click the expand button to reveal sub-items.">
        <div className="border border-[var(--border)] rounded-[6px] overflow-hidden h-[520px] flex">
          <TwoLevelSidebar
            activeCategory={activeCategory2}
            setActiveCategory={setActiveCategory2}
            activeSubItem={activeSubItem2}
            setActiveSubItem={setActiveSubItem2}
            collapsed={collapsed2}
            onToggleCollapse={() => setCollapsed2((v) => !v)}
          />
          <div className="flex-1 bg-background flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <p>Category: <span className="font-medium text-foreground">{activeCategory2}</span></p>
              <p>Sub-item: <span className="font-medium text-foreground">{activeSubItem2}</span></p>
            </div>
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
          {[
            ["Left bar width", "60px (fixed)"],
            ["Left bar background", "--primary-extra-dark (#003D42)"],
            ["Right panel width", "220px (expanded), 0px (collapsed)"],
            ["Right panel background", "spacing-bg (#EDF2F2)"],
            ["Total expanded width", "280px"],
            ["Total collapsed width", "60px + expand button"],
            ["Logo size", "24×24px (white variant)"],
            ["Nav item height", "40px"],
            ["Icon size", "16×16px"],
            ["Border radius", "6px"],
            ["Transition", "width 200ms ease"],
            ["Sub-items list top padding", "12px (pt-3)"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="font-medium text-foreground min-w-[180px]">{label}</span>
              <span className="text-muted-foreground">{value}</span>
            </div>
          ))}
        </div>
      </ComponentSection>

      {/* Behavior */}
      <ComponentSection title="Behavior">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Responsive collapse:</span> On viewports ≤1024px, the right panel collapses by default, leaving only the 60px icon rail.</p>
          <p><span className="font-medium text-foreground">Category switching:</span> Clicking a primary category icon selects it and auto-selects the first sub-item if no sub-item in that category is already active.</p>
          <p><span className="font-medium text-foreground">Collapse toggle:</span> The PanelLeftClose icon in the right panel header collapses it. A PanelLeftOpen button appears to restore it.</p>
          <p><span className="font-medium text-foreground">Tooltips:</span> Each primary icon shows a DesignTooltip on the right with the category label.</p>
          <p><span className="font-medium text-foreground">Badge dots:</span> Categories with badge counts show a small white dot on the icon in the dark left rail.</p>
          <p><span className="font-medium text-foreground">Visual separation:</span> The sidebar relies on background contrast (spacing-bg vs background) for visual separation from the content area — no vertical border is used.</p>
          <p><span className="font-medium text-foreground">User dropdown:</span> Avatar at the bottom of the left bar opens a DropdownMenu with Settings, Help, and Log out.</p>
        </div>
      </ComponentSection>

      {/* Data structure */}
      <ComponentSection title="Category Data Structure">
        <CodeBlock code={`const categories: PrimaryCategory[] = [
  {
    icon: LayoutDashboard,  // Lucide icon
    label: "Overview",      // Tooltip & right panel title
    id: "overview",         // Unique ID
    badge: "12",            // Optional — shows dot on icon
    children: [
      { label: "Dashboard", id: "dashboard" },
      { label: "Analytics", id: "analytics" },
      { label: "Reports", id: "reports" },
    ],
  },
];`} />
      </ComponentSection>

      {/* Usage */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-3">Usage</h2>
        <CodeBlock code={`import TwoLevelSidebar from '@/pages/patterns/previews/TwoLevelSidebar';

const [activeCategory, setActiveCategory] = useState("overview");
const [activeSubItem, setActiveSubItem] = useState("dashboard");
const [collapsed, setCollapsed] = useState(false);

<div className="flex h-screen">
  <TwoLevelSidebar
    activeCategory={activeCategory}
    setActiveCategory={setActiveCategory}
    activeSubItem={activeSubItem}
    setActiveSubItem={setActiveSubItem}
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
        <h2 className="text-lg font-semibold text-foreground mb-4">PrimaryCategory Shape</h2>
        <PropsTable props={categoryShape} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-foreground mb-4">SubItem Shape</h2>
        <PropsTable props={subItemShape} />
      </div>
    </div>
  );
};

export default TwoLevelSidebarDocs;
