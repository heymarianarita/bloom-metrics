import * as React from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignLoader } from "@/components/ds/DesignLoader";
import FigmaLibrariesCard from "@/components/settings/FigmaLibrariesCard";
import GetDXTeamsCard from "@/components/settings/GetDXTeamsCard";
import { useRefreshGetDXTeams } from "@/hooks/useRefreshGetDXTeams";
import { SourceCard, SourceSection, type SourceRun } from "@/components/settings/source/SourceCard";
import CodeAdoptionSourceCard from "@/components/settings/CodeAdoptionSourceCard";
import Ga4PropertiesCard from "@/components/settings/Ga4PropertiesCard";

import {
  DATA_SOURCE_DEFS,
  useDataSourceConfigs,
  useSaveDataSourceConfig,
  useSyncRuns,
} from "@/hooks/useDataSources";
import { useToast } from "@/hooks/use-toast";

/** Atlassian, GetDX, Claude…: credentials plus any plain settings, which save when you leave a field. */
const GenericSourceCard = ({
  def,
  saved,
  lastRun,
}: {
  def: (typeof DATA_SOURCE_DEFS)[number];
  saved?: Record<string, unknown>;
  lastRun?: SourceRun;
}) => {
  const { toast } = useToast();
  const save = useSaveDataSourceConfig();
  const refreshTeams = useRefreshGetDXTeams();

  const saveField = async (name: string, value: string) => {
    if (value === String(saved?.[name] ?? "")) return;
    try {
      await save.mutateAsync({ source_key: def.key, label: def.label, config: { ...saved, [name]: value } });
      toast({ title: "Saved", description: `${def.label} updated.` });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const onSync =
    def.key === "getdx"
      ? async () => {
          try {
            const r = await refreshTeams.mutateAsync();
            toast({ title: "Synced", description: `${r.teams.length} groups loaded from GetDX.` });
          } catch (err) {
            toast({ title: "Sync failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
          }
        }
      : undefined;

  return (
    <SourceCard
      title={def.label}
      description={def.description}
      credentialsKey={def.key}
      lastRun={lastRun}
      onSync={onSync}
      syncing={refreshTeams.isPending}
    >
      {def.fields.length > 0 && (
        <SourceSection title="Settings">
          <div className="grid gap-3 md:grid-cols-2">
            {def.fields.map((field) => (
              <DesignInputText
                key={`${field.name}:${String(saved?.[field.name] ?? "")}`}
                label={field.label}
                placeholder={field.placeholder}
                helperText={field.helper}
                defaultValue={String(saved?.[field.name] ?? "")}
                onBlur={(e) => saveField(field.name, e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            ))}
          </div>
        </SourceSection>
      )}
      {def.key === "getdx" && <GetDXTeamsCard />}
    </SourceCard>
  );
};

const DataSourcesSettings = () => {
  const configs = useDataSourceConfigs();
  const runs = useSyncRuns(100);

  const savedByKey = new Map((configs.data ?? []).map((c) => [c.source_key, c.config]));
  const lastRunByKey = new Map<string, { status: string; ran_at: string; message: string }>();
  (runs.data ?? []).forEach((run) => {
    if (!lastRunByKey.has(run.source_key)) lastRunByKey.set(run.source_key, run);
  });

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="Dynamic sources"
          subtitle="Configure where each metric comes from. Secrets are managed separately and never shown here."
        />
        <DesignSpacer size="medium" />
        {configs.isLoading ? (
          <DesignLoader />
        ) : (
          <div className="flex flex-col gap-4 max-w-[960px]">
            {DATA_SOURCE_DEFS.map((def) =>
              def.key === "figma" ? (
                <FigmaLibrariesCard
                  key={def.key}
                  saved={savedByKey.get(def.key) as Record<string, unknown> | undefined}
                  lastRun={lastRunByKey.get(def.key)}
                />
              ) : def.key === "code_adoption" ? (
                <CodeAdoptionSourceCard
                  key={def.key}
                  saved={savedByKey.get(def.key) as Record<string, unknown> | undefined}
                  lastRun={lastRunByKey.get(def.key)}
                />
              ) : def.key === "ga4_documentation" ? (
                <Ga4PropertiesCard
                  key={def.key}
                  saved={savedByKey.get(def.key) as Record<string, unknown> | undefined}
                  lastRun={lastRunByKey.get(def.key)}
                />
              ) : (
                <GenericSourceCard
                  key={def.key}
                  def={def}
                  saved={savedByKey.get(def.key) as Record<string, unknown> | undefined}
                  lastRun={lastRunByKey.get(def.key)}
                />
              ),
            )}

          </div>
        )}
        <DesignSpacer size="medium" />
        <p className="text-[12px] text-muted-foreground flex items-center gap-1">
          <ArrowClockwise size={12} /> Sync status and history live under Data history.
        </p>
      </AppShell>
    </RequireRole>
  );
};

export default DataSourcesSettings;
