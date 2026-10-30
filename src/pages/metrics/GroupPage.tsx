import { useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ViewBlocks from "@/components/metrics/ViewBlocks";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { useMetricGroups } from "@/hooks/useMetricGroups";
import { EditViewButton } from "@/components/metrics/EditViewButton";

/**
 * The standard page for a Metrics tab without a page of its own: whatever its view shows,
 * as arranged in Metrics → Views.
 */
const GroupPage = () => {
  const { groupSlug = "", subSlug } = useParams();
  const groups = useMetricGroups();
  const all = groups.data ?? [];
  const group = all.find((g) => !g.parent_id && g.slug === groupSlug);
  const subgroups = group ? all.filter((g) => g.parent_id === group.id) : [];
  const subgroup = subSlug ? subgroups.find((g) => g.slug === subSlug) : undefined;
  const shown = subgroup ?? group;

  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        {groups.isLoading ? (
          <DesignLoader />
        ) : !group || (subSlug && !subgroup) ? (
          <DesignEmptyState title="Tab not found" body="It may have been renamed or removed in Metrics → All metrics." />
        ) : (
          <>
            <DesignPageHeader
              title={subgroup ? `${group.name} › ${subgroup.name}` : group.name}
              subtitle={shown?.description || undefined}
              primaryAction={<EditViewButton tabSlug={shown?.slug} />}
            />
            <DesignSpacer size="medium" />
            <DesignCard variant="default" className="min-w-0">
              {shown && <ViewBlocks key={shown.id} view={shown} groups={all} />}
            </DesignCard>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default GroupPage;
