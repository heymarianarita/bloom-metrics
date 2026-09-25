import { Link } from "react-router-dom";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";


const componentsList = [
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

const WhiteSideNavPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Side navigation with white background layout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* When to use */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">When to use</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Use when the sidebar and content area should share a seamless white background with no visual divider.</li>
            <li>Best for tools with a clean, minimal aesthetic where visual separation is achieved through spacing and typography rather than background contrast.</li>
            <li>Suitable for 4–8 top-level sections with content placed directly on the grey page background instead of inside a card panel.</li>
          </ul>
        </div>

        {/* Live Previews */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Live Previews</h2>
          <p className="text-sm text-muted-foreground mb-4">Interactive previews for this pattern.</p>
          <DesignCard variant="default" className="p-5">
            <div className="flex flex-wrap gap-3">
              <Link to="/patterns/pattern-6/preview">
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
          <Link to="/patterns/side-nav" className="block group">
            <DesignCard variant="default" className="p-4 transition-shadow hover:shadow-card-lifted flex items-center justify-between">
              <div>
                <p className="text-sm font-[580] text-foreground group-hover:text-primary transition-colors">Side navigation layout</p>
                <p className="text-xs text-muted-foreground mt-1">Guidelines for vertical sidebar navigation with collapsible menus, badges, and visual separation.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
            </DesignCard>
          </Link>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Sidebar:</span> Sticky h-screen vertical navigation with white background, no top margin, grouped items, collapsible sub-menus, badges, and a pinned user profile at the bottom. No divider line by default; uses the same white background as the content area.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space next to the sidebar with 24px padding on all sides. The panel stretches to the full width. <p><span className="font-medium text-foreground">Content Area:</span> Fills remaining space next to the sidebar with 24px padding on all sides. The panel stretches to the full width. Content inside the panel is center-aligned or left-aligned depending on whether additional panels or side sheets are present, with a 1280px max-width, while certain elements like tables may stretch to full width.</p></p>
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

export default WhiteSideNavPatternPage;
