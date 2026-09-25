import { Link } from "react-router-dom";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { ArrowLeft, ExternalLink } from "lucide-react";
import singlePanelLayout from "@/assets/single-panel-layout.svg";

const componentsList = [
  {
    name: "DesignCard",
    docsPath: "/docs/card",
    description: "Container card used as the single content panel with consistent padding and border radius.",
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

const SinglePanelPatternPage = () => {
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Single panel layout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Live Preview */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Live Previews</h2>
          <p className="text-sm text-muted-foreground mb-4">Interactive previews for this pattern.</p>
          <DesignCard variant="default" className="p-5">
            <div className="flex flex-wrap gap-3">
              <Link to="/patterns/single-panel/preview">
                <DesignButton variant="filled" theme="primary" size="medium">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </DesignButton>
              </Link>
            </div>
          </DesignCard>
        </div>

        {/* Single panel layout */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Single panel layout</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">When to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Use when the page presents a single continuous set of related content, such as forms, detail views, focused tasks</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">How to use</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Align the panel to the specified grid to ensure proper scaling.</li>
                <li>Apply equal padding of 16px on all four sides of the panel.</li>
                <li>Center-align the panel content and constrain its width to a maximum of 1280px to improve readability on larger screens.</li>
                <li>Certain elements, such as tables, may extend to the full screen width if explicitly defined.</li>
              </ul>
            </div>

            {/* Visual scheme */}
            <div className="mt-6">
              <img src={singlePanelLayout} alt="Single panel layout diagram showing header, full-width content section, and two centered columns constrained to 1280px" className="w-full max-w-[600px] mx-auto" />
            </div>
          </div>
        </div>

        {/* Layout Structure */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Layout Structure</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Panel:</span> The single panel stretches to fill the available content width defined by the grid. It uses 16px internal padding on all sides and a 6px border radius.</p>
            <p><span className="font-medium text-foreground">Content Area:</span> <p><span className="font-medium text-foreground">Content Area:</span> Content inside the panel is center-aligned or left-aligned depending on whether additional panels or side sheets are present, with a 1280px max-width. This ensures readability on wide screens while allowing the panel itself to span the full available width.</p></p>
            <p><span className="font-medium text-foreground">Full-width exceptions:</span> Certain elements like data tables and dividers may extend to the full panel width, breaking out of the 1280px content cap when needed for scannability.</p>
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

export default SinglePanelPatternPage;
