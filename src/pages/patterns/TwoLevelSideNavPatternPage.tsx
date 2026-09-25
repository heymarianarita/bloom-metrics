import { Link } from "react-router-dom";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";

const componentsList = [
  {
    name: "DesignTwoLevelSidebar",
    docsPath: "/docs/two-level-sidebar",
    description: "Dual-panel navigation with a 60px icon rail and a 220px collapsible sub-navigation panel.",
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
    name: "DesignGrid",
    docsPath: "/docs/grid",
    description: "Responsive 12-column grid system with 1280px max-width, 24px margins, and 12px gutters.",
  },
];

const TwoLevelSideNavPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Two-level side navigation with single-panel layout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* When to use */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">When to use</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Use for tools with deep or complex navigation hierarchies requiring simultaneous visibility of both top-level and sub-level sections.</li>
            <li>Pair with a single-panel content area for focused workflows where a single content stream is sufficient.</li>
            <li>Best when the navigation is two levels deep — a primary icon rail plus a sub-category panel.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Live Previews</h2>
          <p className="text-sm text-muted-foreground mb-4">Interactive previews for this pattern.</p>
          <DesignCard variant="default" className="p-5">
            <div className="flex flex-wrap gap-3">
              <Link to="/patterns/pattern-4/preview">
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
          <Link to="/patterns/two-level-side-nav" className="block group">
            <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
              <div>
                <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">Two-level side navigation layout</p>
                <p className="text-xs text-muted-foreground mt-1">Guidelines for dual-panel sidebar navigation with icon rail and collapsible sub-navigation.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
            </DesignCard>
          </Link>
        </div>

        {/* Content layout reference */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Content layout</h2>
          <Link to="/patterns/single-panel" className="block group">
            <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
              <div>
                <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">Single panel layout</p>
                <p className="text-xs text-muted-foreground mt-1">Guidelines for single-panel content areas with 1280px max-width, padding, and grid alignment rules.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
            </DesignCard>
          </Link>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Left Rail (60px):</span> Fixed-width icon rail in <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">--primary-extra-dark</code> background. Displays primary category icons with solid white notification dots for active badges. Sits flush with the top of the screen (0px margin).</p>
            <p><span className="font-medium text-foreground">Sub-navigation Panel (220px):</span> Collapsible right panel in <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">bg-spacing-bg</code> background. Features a 12px top padding for its sub-item list. Collapses to w-0 on smaller viewports.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space next to the sidebar with 24px padding on all sides. The panel stretches to the full width. <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space next to the sidebar with 24px padding on all sides. The panel stretches to the full width. Content inside the panel is center-aligned or left-aligned depending on whether additional panels or side sheets are present, with a 1280px max-width, while certain elements like tables may stretch to full width.</p></p>
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

export default TwoLevelSideNavPatternPage;
