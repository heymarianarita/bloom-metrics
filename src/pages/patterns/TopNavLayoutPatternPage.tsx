import { Link } from "react-router-dom";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

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
    name: "DesignTopBar",
    docsPath: "/docs/top-bar",
    description: "56px sticky top bar with logo, horizontal navigation tabs, user avatar, and dropdown menu.",
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

const TopNavLayoutPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Top navigation layout</h1>
          <p className="text-muted-foreground mt-2 text-sm">A horizontal top bar navigation pattern optimized for tools with up to 5 top-level sections and light content density.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Navigation guidelines */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Top navigation</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">When to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Use for tools that are not content-heavy and benefit from maximizing horizontal space when navigation depth is one level.</li>
                <li>Use when the tool has no more than 5 top-level sections.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">How to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>The top bar (56px) is sticky at the top of the viewport and uses a <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">--primary-dark</code> background.</li>
                
                <li>Contains brand logo, horizontal navigation tabs, user avatar, and a more-actions dropdown.</li>
                
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

        {/* Live Preview */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Patterns</h2>
          <p className="text-sm text-muted-foreground mb-4">Live preview for this navigation layout.</p>
          <div className="flex items-center gap-3">
            <Link to="/patterns/pattern-1" className="block group flex-1">
              <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
                <div>
                  <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">Top navigation with single-panel layout</p>
                  <p className="text-xs text-muted-foreground mt-1">Single panel content area with top bar navigation.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
              </DesignCard>
            </Link>
            <Link to="/patterns/pattern-1/preview">
              <DesignButton variant="filled" theme="primary" size="small">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Preview
              </DesignButton>
            </Link>
          </div>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Top Bar (56px):</span> Sticky at the top. Contains brand logo, horizontal navigation tabs, user avatar, and a more-actions dropdown. Uses --primary-dark background.</p>
            <p><span className="font-medium text-foreground">Header:</span> Sits below the top bar. Contains breadcrumbs, page title, status indicators, and action buttons.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space below the header. Scrolls independently. Horizontally centered with a max-width cap of 1280px.</p>
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

export default TopNavLayoutPatternPage;
