import { Link } from "react-router-dom";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";

const componentsList = [
  {
    name: "DesignTopAndSideNav",
    docsPath: "/docs/top-and-side-nav",
    description: "Composite layout combining a sticky 56px top bar with a collapsible sidebar. Top bar tabs filter sidebar sections.",
  },
  {
    name: "DesignPageHeader",
    docsPath: "/docs/page-header",
    description: "Page-level header with breadcrumbs, title, status indicator, and action buttons.",
  },
  {
    name: "DesignStatCard",
    docsPath: "/docs/stat-card",
    description: "Pre-composed metric panel displaying a label, value, trend badge, and optional icon.",
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
    name: "DesignBadge",
    docsPath: "/docs/badge",
    description: "Compact label for status indicators, counts, and categorical tags.",
  },
  {
    name: "DesignButton",
    docsPath: "/docs/button",
    description: "Primary action component with filled, outlined, and subtle variants.",
  },
  {
    name: "DesignSidebar",
    docsPath: "/docs/sidebar",
    description: "Vertical navigation sidebar with grouped items, collapsible sub-menus, badges, and sticky user profile.",
  },
  {
    name: "DesignTopBar",
    docsPath: "/docs/top-bar",
    description: "56px sticky top bar with logo, horizontal navigation tabs, user avatar, and dropdown menu.",
  },
  {
    name: "DesignTooltip",
    docsPath: "/docs/tooltip",
    description: "Contextual hint displayed on hover for icon buttons and truncated text.",
  },
  {
    name: "DesignGrid",
    docsPath: "/docs/grid",
    description: "Responsive 12-column grid system with 1280px max-width, 24px margins, and 12px gutters.",
  },
];

const TopAndSideNavMultiPanelPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Top and side navigation with multi-panel layout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* When to use */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">When to use</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Use for tools with very deep or complex navigation where both global (top bar) and section-level (sidebar) navigation must be visible simultaneously.</li>
            <li>Pair with a multi-panel content area when the page contains two or more related but distinct areas that need simultaneous visibility.</li>
            <li>Best for the most complex tools combining hybrid navigation with content-heavy, multi-panel views.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Live Previews</h2>
          <p className="text-sm text-muted-foreground mb-4">Interactive previews for this pattern.</p>
          <DesignCard variant="default" className="p-5">
            <div className="flex flex-wrap gap-3">
              <Link to="/patterns/pattern-5b/preview">
                <DesignButton variant="filled" theme="primary" size="medium">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </DesignButton>
              </Link>
            </div>
          </DesignCard>
        </div>

        {/* Navigation layout */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Navigation layout</h2>
          <Link to="/patterns/top-and-side-nav" className="block group">
            <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
              <div>
                <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">Top and side navigation layout</p>
                <p className="text-xs text-muted-foreground mt-1">Guidelines for hybrid navigation combining a sticky top bar with a collapsible sidebar.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
            </DesignCard>
          </Link>
        </div>

        {/* Content layout reference */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Content layout</h2>
          <Link to="/patterns/multi-panel" className="block group">
            <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
              <div>
                <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">Multi-panel layout</p>
                <p className="text-xs text-muted-foreground mt-1">Guidelines for multi-panel content areas with hierarchy, independent scrolling, and responsive stacking rules.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
            </DesignCard>
          </Link>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Top Bar (56px):</span> Sticky at the top (z-50). Contains brand logo, horizontal navigation tabs, user avatar, and a more-actions dropdown. Uses --primary-dark background.</p>
            <p><span className="font-medium text-foreground">Side Navigation:</span> Below the top bar. Collapsible between 256px and 60px. Contains grouped nav items with collapsible sub-menus, badges, and user profile section sticky at the bottom.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space to the right of the sidebar. Panels are placed within this area and scroll independently.</p>
          </div>
        </div>

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

export default TopAndSideNavMultiPanelPatternPage;
