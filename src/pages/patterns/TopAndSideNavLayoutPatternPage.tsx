import { Link } from "react-router-dom";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

const subPatterns = [
  {
    name: "Top and side navigation with single-panel layout",
    path: "/patterns/pattern-5",
    previewPath: "/patterns/pattern-5/preview",
    description: "Single panel content area with combined top bar and sidebar navigation.",
  },
  {
    name: "Top and side navigation with multi-panel layout",
    path: "/patterns/pattern-5b",
    previewPath: "/patterns/pattern-5b/preview",
    description: "Multi-panel content area with combined top bar and sidebar navigation.",
  },
];

const contentLayouts = [
  {
    name: "Single panel layout",
    path: "/patterns/single-panel",
    description: "Guidelines for single-panel content areas with 1280px max-width, padding, and grid alignment rules.",
  },
  {
    name: "Multi-panel layout",
    path: "/patterns/multi-panel",
    description: "Guidelines for multi-panel content areas with hierarchy, independent scrolling, and responsive stacking rules.",
  },
];

const componentsList = [
  {
    name: "DesignTopAndSideNav",
    docsPath: "/docs/top-and-side-nav",
    description: "Composite layout combining a sticky 56px top bar with a collapsible sidebar. Top bar tabs filter sidebar sections.",
  },
  {
    name: "DesignTopBar",
    docsPath: "/docs/top-bar",
    description: "56px sticky top bar with logo, horizontal navigation tabs, user avatar, and dropdown menu.",
  },
  {
    name: "DesignSidebar",
    docsPath: "/docs/sidebar",
    description: "Vertical navigation sidebar with grouped items, collapsible sub-menus, badges, and sticky user profile.",
  },
  {
    name: "DesignPageHeader",
    docsPath: "/docs/page-header",
    description: "Page-level header with breadcrumbs, title, status indicator, and action buttons.",
  },
  {
    name: "DesignDataTable",
    docsPath: "/docs/data-table",
    description: "Full-featured data table with sorting, filtering, selection, tabs, and pagination.",
  },
  {
    name: "DesignCard",
    docsPath: "/docs/card",
    description: "Container component with default, lifted, and elevated variants for grouping content.",
  },
  {
    name: "DesignStatCard",
    docsPath: "/docs/stat-card",
    description: "Pre-composed metric panel displaying a label, value, trend badge, and optional icon.",
  },
  {
    name: "DesignGrid",
    docsPath: "/docs/grid",
    description: "Responsive 12-column grid system with 1280px max-width, 24px margins, and 12px gutters.",
  },
];

const TopAndSideNavLayoutPatternPage = () => {
  return (
    <div className="min-h-screen bg-docs-bg">
      <div className="bg-background border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-8 py-10">
          <Link to="/patterns" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline w-fit mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to patterns
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <DesignBadge theme="highlight" styling="light">Coming Soon</DesignBadge>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Top and side navigation layout</h1>
          <p className="text-muted-foreground mt-2 text-sm">A hybrid navigation pattern combining a sticky top bar for global navigation with a collapsible sidebar for section-level navigation.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Navigation guidelines */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Top and side navigation</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">When to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Use for tools with very deep or complex navigation where users need a constant overview of both top-level and sub-level sections.</li>
                
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">How to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Top navigation handles the primary category selection (typically 3–5 main sections) and should be visually more prominent.</li>
                <li>Side navigation displays sub-categories within the selected primary category and updates dynamically when the top tab changes.</li>
                <li>The sidebar is collapsible between 256px and 60px, with the sidebar header hidden when the top bar is active.</li>
                <li>The top bar (56px) is sticky at z-50 and uses <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">--primary-dark</code> background.</li>
                
                <li>Component must support both light and dark modes using design system tokens.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Content layout references */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Content layouts</h2>
          <div className="space-y-3">
            {contentLayouts.map((cl) => (
              <Link key={cl.path} to={cl.path} className="block group">
                <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
                  <div>
                    <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">{cl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cl.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
                </DesignCard>
              </Link>
            ))}
          </div>
        </div>

        {/* Sub-patterns */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Patterns</h2>
          <p className="text-sm text-muted-foreground mb-4">Specific layout combinations using top and side navigation.</p>
          <div className="space-y-3">
            {subPatterns.map((p) => (
              <div key={p.path} className="flex items-center gap-3">
                <Link to={p.path} className="block group flex-1">
                  <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
                    <div>
                      <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
                  </DesignCard>
                </Link>
                <Link to={p.previewPath}>
                  <DesignButton variant="filled" theme="primary" size="small">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Preview
                  </DesignButton>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Top Bar (56px):</span> Sticky at the top (z-50). Contains brand logo, horizontal navigation tabs, user avatar, and a more-actions dropdown. Uses --primary-dark background.</p>
            <p><span className="font-medium text-foreground">Side Navigation:</span> Below the top bar. Collapsible between 256px and 60px. Contains grouped nav items with collapsible sub-menus, badges, and user profile section sticky at the bottom. Sidebar header is hidden when top bar is active.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space to the right of the sidebar with 24px padding on all sides. The panel(s) stretch to the full available width. <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space to the right of the sidebar with 24px padding on all sides. The panel(s) stretch to the full available width. Content inside panels is center-aligned or left-aligned depending on whether additional panels or side sheets are present, with a 1280px max-width.</p></p>
            <p><span className="font-medium text-foreground">Interaction:</span> Top bar tabs handle global/top-level navigation. Sidebar handles section-level navigation within the selected tab context and updates dynamically.</p>
          </div>
        </div>

        {/* Documented Components */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Documented Components</h2>
          <p className="text-sm text-muted-foreground mb-4">Components used in this pattern — click to view full documentation.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {componentsList.map((comp) => (
              <Link key={comp.name} to={comp.docsPath} className="block group">
                <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted">
                  <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">{comp.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{comp.description}</p>
                </DesignCard>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopAndSideNavLayoutPatternPage;
