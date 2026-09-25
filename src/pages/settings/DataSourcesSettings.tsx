import * as React from "react";
import { ArrowClockwise, FloppyDisk, Key } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignLoader } from "@/components/ds/DesignLoader";
import FigmaLibrariesCard from "@/components/settings/FigmaLibrariesCard";
import CredentialsCard from "@/components/settings/CredentialsCard";
import GetDXTeamsCard from "@/components/settings/GetDXTeamsCard";
import Ga4PropertiesCard from "@/components/settings/Ga4PropertiesCard";

import {
  DATA_SOURCE_DEFS,
  useDataSourceConfigs,
  useSaveDataSourceConfig,
  useSyncRuns,
} from "@/hooks/useDataSources";
import { useToast } from "@/hooks/use-toast";

const SourceCard = ({
  def,
  saved,
  lastRun,
}: {
  def: (typeof DATA_SOURCE_DEFS)[number];
  saved?: Record<string, unknown>;
  lastRun?: { status: string; ran_at: string; message: string };
}) => {
  const { toast } = useToast();
  const save = useSaveDataSourceConfig();
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setValues(
      Object.fromEntries(def.fields.map((f) => [f.name, String((saved?.[f.name] as string) ?? "")]))
    );
  }, [saved, def.fields]);

  const onSave = async () => {
    try {
      await save.mutateAsync({ source_key: def.key, label: def.label, config: values });
      toast({ title: "Saved", description: `${def.label} configuration updated.` });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <DesignCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-medium text-foreground">{def.label}</h2>
          </div>
          <p className="text-[14px] text-muted-foreground mt-1">{def.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {def.credential && (
            <DesignBadge theme="muted" styling="light">
              <Key size={12} /> {def.credential}
            </DesignBadge>
          )}
          {lastRun && (
            <DesignBadge theme={lastRun.status === "success" ? "success" : "error"} styling="light">
              {lastRun.status === "success" ? "Last sync OK" : "Last sync failed"}
            </DesignBadge>
          )}
        </div>
      </div>

      <CredentialsCard sourceKey={def.key} />
      {def.key === "getdx" && <GetDXTeamsCard />}

      {def.fields.length > 0 && (
        <>
          <DesignSpacer size="small" />
          <DesignDivider />
          <DesignSpacer size="small" />
          <div className="grid gap-4 md:grid-cols-2">
            {def.fields.map((field) => (
              <DesignInputText
                key={field.name}
                label={field.label}
                placeholder={field.placeholder}
                helperText={field.helper}
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              />
            ))}
          </div>
          <DesignSpacer size="small" />
          <div className="flex items-center gap-2">
            <DesignButton
              variant="filled"
              theme="primary"
              size="medium"
              icon={<FloppyDisk size={16} />}
              isLoading={save.isPending}
              onClick={onSave}
            >
              Save
            </DesignButton>
            {lastRun && (
              <span className="text-[12px] text-muted-foreground">
                Last run {new Date(lastRun.ran_at).toLocaleString()}
                {lastRun.message ? ` — ${lastRun.message}` : ""}
              </span>
            )}
          </div>
        </>
      )}
    </DesignCard>
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
              ) : def.key === "ga4_documentation" ? (
                <Ga4PropertiesCard
                  key={def.key}
                  saved={savedByKey.get(def.key) as Record<string, unknown> | undefined}
                  lastRun={lastRunByKey.get(def.key)}
                />
              ) : (
                <SourceCard
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
