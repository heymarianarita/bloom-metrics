import { Link } from "react-router-dom";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

const subPatterns = [
  {
    name: "Two-level side navigation with single-panel layout",
    path: "/patterns/pattern-4",
    previewPath: "/patterns/pattern-4/preview",
    description: "Single panel content area with two-level sidebar navigation.",
  },
  {
    name: "Two-level side navigation with multi-panel layout",
    path: "/patterns/pattern-4b",
    previewPath: "/patterns/pattern-4b/preview",
    description: "Multi-panel content area with two-level sidebar navigation.",
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
    name: "DesignTwoLevelSidebar",
    docsPath: "/docs/two-level-sidebar",
    description: "Dual-panel navigation with a 60px icon rail and a 220px collapsible sub-navigation panel.",
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

const TwoLevelSideNavLayoutPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Two-level side navigation layout</h1>
          <p className="text-muted-foreground mt-2 text-sm">A dual-panel sidebar navigation pattern for tools with deep hierarchies requiring simultaneous visibility of both top-level and sub-level sections.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Navigation guidelines */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Two-level side navigation</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">When to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Use for tools with very deep or complex navigation where users need a constant overview of both top-level and sub-level sections simultaneously.</li>
                <li>Use when the navigation hierarchy is two levels deep — a primary category rail plus a sub-category panel.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">How to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>The left rail (60px) displays primary category icons with solid white notification dots for active badges.</li>
                <li>The right sub-navigation panel (220px) displays sub-categories within the selected primary category.</li>
                <li>The sub-navigation panel should be collapsible (to w-0), with collapsed state as default on smaller viewports (≤1024px).</li>
                
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
          <p className="text-sm text-muted-foreground mb-4">Specific layout combinations using two-level side navigation.</p>
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
            <p><span className="font-medium text-foreground">Left Rail (60px):</span> Fixed-width icon rail in <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">--primary-extra-dark</code> background. Displays primary category icons with solid white notification dots for active badges. Sits flush with the top of the screen (0px margin).</p>
            <p><span className="font-medium text-foreground">Sub-navigation Panel (220px):</span> Collapsible right panel in <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">bg-spacing-bg</code> background. Features a 12px top padding for its sub-item list. Collapses to w-0 on smaller viewports.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space next to the sidebar with 24px padding on all sides. The panel(s) stretch to the full available width. <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space next to the sidebar with 24px padding on all sides. The panel(s) stretch to the full available width. Content inside panels is center-aligned or left-aligned depending on whether additional panels or side sheets are present, with a 1280px max-width.</p></p>
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

export default TwoLevelSideNavLayoutPatternPage;
