import { useParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import MetricGroupPanel from "@/components/metrics/MetricGroupPanel";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { useMetricGroups } from "@/hooks/useMetricGroups";

/**
 * The standard page for a Metrics tab set up in Settings → Metrics (any tab without a page of
 * its own): its numbers, trend, breakdowns and qualitative insights. A sub-tab shows only the
 * metrics placed in it; the tab itself shows the rest.
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
          <DesignEmptyState title="Tab not found" body="It may have been renamed or removed in Settings → Metrics." />
        ) : (
          <>
            <DesignPageHeader
              title={subgroup ? `${group.name} › ${subgroup.name}` : group.name}
              subtitle={shown?.description || undefined}
            />
            <DesignSpacer size="medium" />
            <DesignCard variant="default" className="min-w-0 p-5">
              <MetricGroupPanel
                key={shown?.id}
                group={group.name}
                match={(metric) =>
                  subgroup ? metric.subgroup_id === subgroup.id : !subgroups.some((g) => g.id === metric.subgroup_id)
                }
                emptyTitle={`Nothing in ${shown?.name} yet`}
                showQualitative={!subgroup}
              />
            </DesignCard>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default GroupPage;
