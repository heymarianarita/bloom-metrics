import { Link } from "react-router-dom";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { ArrowLeft, ExternalLink } from "lucide-react";
import multiPanelLayout from "@/assets/multi-panel-layout.svg";

const componentsList = [
  {
    name: "DesignCard",
    docsPath: "/docs/card",
    description: "Container card used as content panels with consistent padding and border radius.",
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
    name: "DesignGrid",
    docsPath: "/docs/grid",
    description: "Responsive 12-column grid system with 1280px max-width, 24px margins, and 12px gutters.",
  },
];

const MultiPanelLayoutPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Multi-panel layout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Live Preview */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Live Previews</h2>
          <p className="text-sm text-muted-foreground mb-4">Interactive previews for this pattern.</p>
          <DesignCard variant="default" className="p-5">
            <div className="flex flex-wrap gap-3">
              <Link to="/patterns/multi-panel/preview">
                <DesignButton variant="filled" theme="primary" size="medium">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </DesignButton>
              </Link>
            </div>
          </DesignCard>
        </div>

        {/* Multi-panel layout */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Multi-panel layout</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">When to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Use when the page contains two or more related but distinct areas (e.g., a list on the left and a detail panel on the right).</li>
                <li>Use for content-heavy tools that require constant visibility of all panels simultaneously.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">How to use</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>Align the panels to the specified grid to ensure proper scaling.</li>
                <li>Apply equal padding of 16px on all four sides of each panel.</li>
                <li>Center-align the panel content and constrain its width to a maximum of 1280px to improve readability on larger screens.</li>
              </ul>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 mt-5">
                <li>For layouts with multiple panels of differing hierarchy:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>The primary panel (left or right) should be visually dominant.</li>
                    <li>The secondary panel should reflect its supporting role and is typically narrower than the primary panel.</li>
                  </ul>
                </li>
              </ul>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 mt-5">
                <li>Panels may use shared or separate navigation:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Panels can share breadcrumbs, positioned above them on a grey background.</li>
                    <li>Alternatively, panels may have separate navigation; in this case, breadcrumbs should be placed inside each panel.</li>
                  </ul>
                </li>
              </ul>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 mt-5">
                <li>Panels can be arranged both vertically and horizontally.</li>
              </ul>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 mt-5">
                <li>On smaller viewports (below 770px):
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Horizontally arranged panels should stack vertically.</li>
                    <li>The primary panel should appear on top.</li>
                  </ul>
                </li>
              </ul>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 mt-5">
                <li>Each panel scrolls independently as a whole (header, content, and table scroll together).</li>
              </ul>
            </div>

            {/* Visual scheme */}
            <div className="mt-6">
              <img src={multiPanelLayout} alt="Multi-panel layout diagram showing hierarchy and equal panel arrangements" className="w-full mx-auto" />
            </div>
          </div>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Panels:</span> Each panel stretches to fill its allocated grid area. Panels use 16px internal padding on all sides and a 6px border radius. A 12px gap separates adjacent panels.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> <p><span className="font-medium text-foreground">Content Area:</span> Content inside each panel is center-aligned or left-aligned depending on whether additional panels or side sheets are present, with a 1280px max-width. This ensures readability on wide screens while allowing the panels to span their full grid allocation.</p></p>
            <p><span className="font-medium text-foreground">Panel hierarchy:</span> In asymmetric layouts, the primary panel occupies roughly 2/3 of the width and the secondary panel occupies 1/3. In symmetric layouts, panels share equal width.</p>
            <p><span className="font-medium text-foreground">Responsive stacking:</span> On viewports below 770px, horizontally arranged panels stack vertically with the primary panel on top.</p>
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

export default MultiPanelLayoutPatternPage;
