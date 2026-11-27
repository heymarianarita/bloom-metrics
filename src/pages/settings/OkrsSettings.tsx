import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { GenericSourceCard } from "@/pages/settings/DataSourcesSettings";
import { DATA_SOURCE_DEFS, useDataSourceConfigs, useSyncRuns } from "@/hooks/useDataSources";

const ATLASSIAN = DATA_SOURCE_DEFS.find((d) => d.key === "atlassian_goals")!;

/** Settings → OKRs: the Atlassian Goals connection the OKRs page reads from. */
const OkrsSettings = () => {
  const configs = useDataSourceConfigs();
  const runs = useSyncRuns(100);
  const saved = (configs.data ?? []).find((c) => c.source_key === ATLASSIAN.key)?.config as Record<string, unknown> | undefined;
  const lastRun = (runs.data ?? []).find((r) => r.source_key === ATLASSIAN.key);

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader title="OKRs" subtitle="Where the OKRs page gets its goals: Atlassian Goals, filtered to one team." />
        <DesignSpacer size="medium" />
        {configs.isLoading ? (
          <DesignLoader />
        ) : (
          <div className="max-w-[960px]">
            <GenericSourceCard def={ATLASSIAN} saved={saved} lastRun={lastRun} />
          </div>
        )}
      </AppShell>
    </RequireRole>
  );
};

export default OkrsSettings;
