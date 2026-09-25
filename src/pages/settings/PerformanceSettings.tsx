import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import PerformanceEntriesPanel from "@/components/performance/PerformanceEntriesPanel";

const PerformanceSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <DesignPageHeader
        title="Team performance"
        subtitle="Quarterly team performance table. Paste from the doc or edit rows directly."
      />
      <DesignSpacer size="medium" />
      <PerformanceEntriesPanel />
    </AppShell>
  </RequireRole>
);

export default PerformanceSettings;
