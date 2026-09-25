import AppShell from "@/components/layout/AppShell";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignSpacer } from "@/components/ds/DesignSpacer";

interface PagePlaceholderProps {
  title?: string;
}

const PagePlaceholder = ({ title = "Title" }: PagePlaceholderProps) => {
  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        <DesignPageHeader title={title} />
        <DesignSpacer size="medium" />
        <DesignCard>
          <DesignEmptyState
            title="No content yet"
            body="This page is ready to be built."
          />
        </DesignCard>
      </div>
    </AppShell>
  );
};

export default PagePlaceholder;
