import { Link } from "react-router-dom";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignCard } from "@/components/ds/DesignCard";
import { ExternalLink, ArrowLeft } from "lucide-react";

interface PreviewLink {
  label: string;
  path: string;
}

interface PatternPlaceholderProps {
  name: string;
  previewPath?: string;
  previews?: PreviewLink[];
}

const PatternPlaceholder = ({ name, previewPath, previews }: PatternPlaceholderProps) => {
  const previewLinks: PreviewLink[] = previews ?? (previewPath ? [{ label: "Preview", path: previewPath }] : []);

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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{name}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <h2 className="text-lg font-semibold text-foreground mb-2">Live Previews</h2>
        <p className="text-sm text-muted-foreground mb-4">Interactive previews for this pattern.</p>
        <DesignCard variant="default" className="p-5">
          <div className="flex flex-wrap gap-3">
            {previewLinks.map((p) => (
              <Link key={p.path} to={p.path}>
                <DesignButton variant="filled" theme="primary" size="medium">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {p.label}
                </DesignButton>
              </Link>
            ))}
          </div>
        </DesignCard>
      </div>
    </div>
  );
};

export default PatternPlaceholder;
