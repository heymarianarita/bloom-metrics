import { Link } from "react-router-dom";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { ArrowRight, ExternalLink } from "lucide-react";

interface PatternItem {
  name: string;
  path: string;
  previewPath?: string;
}

interface PatternGroup {
  title: string;
  patterns: PatternItem[];
}

const patternGroups: PatternGroup[] = [
  {
    title: "Side navigation",
    patterns: [
      {
        name: "With single-panel layout",
        path: "/patterns/pattern-2",
        previewPath: "/patterns/pattern-2/preview",
      },
      {
        name: "With multi-panel layout",
        path: "/patterns/pattern-7",
        previewPath: "/patterns/pattern-7/preview",
      },
    ],
  },
  {
    title: "Two-level side navigation",
    patterns: [
      {
        name: "With single-panel layout",
        path: "/patterns/pattern-4",
        previewPath: "/patterns/pattern-4/preview",
      },
      {
        name: "With multi-panel layout",
        path: "/patterns/pattern-4b",
        previewPath: "/patterns/pattern-4b/preview",
      },
    ],
  },
  {
    title: "Top navigation",
    patterns: [
      {
        name: "With single-panel layout",
        path: "/patterns/pattern-1",
        previewPath: "/patterns/pattern-1/preview",
      },
    ],
  },
  {
    title: "Top and side navigation",
    patterns: [
      {
        name: "With single-panel layout",
        path: "/patterns/pattern-5",
        previewPath: "/patterns/pattern-5/preview",
      },
      {
        name: "With multi-panel layout",
        path: "/patterns/pattern-5b",
        previewPath: "/patterns/pattern-5b/preview",
      },
    ],
  },
  {
    title: "Content patterns",
    patterns: [
      {
        name: "Single panel layout",
        path: "/patterns/single-panel",
        previewPath: "/patterns/single-panel/preview",
      },
      {
        name: "Multi-panel layout",
        path: "/patterns/multi-panel",
        previewPath: "/patterns/multi-panel/preview",
      },
    ],
  },
  {
    title: "Navigation patterns",
    patterns: [
      {
        name: "Side navigation layout",
        path: "/patterns/side-nav",
        previewPath: "/patterns/side-nav/preview",
      },
      {
        name: "Two-level side navigation layout",
        path: "/patterns/two-level-side-nav",
        previewPath: "/patterns/two-level-side-nav/preview",
      },
      {
        name: "Top navigation layout",
        path: "/patterns/top-nav",
        previewPath: "/patterns/top-nav/preview",
      },
      {
        name: "Top and side navigation layout",
        path: "/patterns/top-and-side-nav",
        previewPath: "/patterns/top-and-side-nav/preview",
      },
    ],
  },
];

const totalPatterns = patternGroups.reduce((sum, g) => sum + g.patterns.length, 0);

const PatternsGallery = () => {
  return (
    <div className="min-h-screen bg-docs-bg">
      {/* Hero */}
      <div className="relative overflow-hidden bg-background border-b border-docs-border">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(var(--primary) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-8 py-16">
          <div className="flex items-center gap-3 mb-5">
            <DesignBadge theme="highlight" styling="filled">Patterns</DesignBadge>
            <DesignBadge theme="primary" styling="light">{totalPatterns} Screens</DesignBadge>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3 leading-[1.1]">
            Screen Patterns
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-6">
            Full-screen compositions showing how to combine Mini Bloom components
            into production-ready layouts. Built for LLMs to reference when generating real interfaces.
          </p>
          <Link to="/" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline w-fit">
            ← Back to home
          </Link>
        </div>
      </div>

      {/* Patterns by Group */}
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-10">
        {patternGroups.map((group, groupIdx) => (
          <div key={group.title}>
            {group.title === "Content patterns" && (
              <>
                <DesignDivider className="mb-10" />
                <h2 className="text-[22px] font-[580] text-foreground mb-6">Internal tools patterns</h2>
              </>
            )}
            <h3 className="text-base font-semibold text-foreground mb-4">{group.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {group.patterns.map((pattern, idx) => (
                <DesignCard key={idx} variant="default" className="flex flex-col overflow-hidden">
                  <div className="px-5 pt-5 pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <DesignBadge theme="highlight" styling="light">Coming Soon</DesignBadge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1.5">{pattern.name}</h3>
                  </div>
                   <div className="px-5 pb-5 flex items-center gap-3">
                     {pattern.previewPath && (
                       <Link to={pattern.previewPath}>
                         <DesignButton variant="filled" theme="primary" size="small">
                           <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                           Live Preview
                         </DesignButton>
                       </Link>
                     )}
                    <Link to={pattern.path}>
                      <DesignButton variant="outlined" theme="primary" size="small">
                        View Details
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </DesignButton>
                    </Link>
                  </div>
                </DesignCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatternsGallery;
