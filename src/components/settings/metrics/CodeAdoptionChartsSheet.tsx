import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignNote } from "@/components/ds/DesignNote";
import { useToast } from "@/hooks/use-toast";
import { useDataSourceConfigs, useSaveDataSourceConfig } from "@/hooks/useDataSources";
import {
  codeAdoptionChartsOf,
  reportRepo,
  GREENHOUSE_CHART_OPTIONS,
  TEAMS_CHART_OPTIONS,
  TREND_CHART_OPTIONS,
  type CodeAdoptionCharts,
} from "../../../../server/shared/codeAdoptionCharts.ts";

/**
 * How one GitHub report's code adoption panel is drawn: a chart type for each of its sections.
 * Saved on the report entry in the code adoption source's config.
 */
const CodeAdoptionChartsSheet = ({
  open,
  onOpenChange,
  reportPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Identifies the report (its file path) within config.reports. */
  reportPath: string | null;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const configs = useDataSourceConfigs();
  const save = useSaveDataSourceConfig();
  const saved = ((configs.data ?? []).find((c) => c.source_key === "code_adoption")?.config ?? {}) as Record<string, unknown>;
  const reports = Array.isArray(saved.reports) ? (saved.reports as Record<string, unknown>[]) : [];
  const report = reports.find((r) => r.path === reportPath);
  const [draft, setDraft] = React.useState<CodeAdoptionCharts>(codeAdoptionChartsOf(null));

  React.useEffect(() => {
    if (open) setDraft(codeAdoptionChartsOf(report?.charts));
    // Reset only when the sheet opens on a report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportPath]);

  const onSave = async () => {
    try {
      await save.mutateAsync({
        source_key: "code_adoption",
        label: "Code adoption (GitHub)",
        config: { ...saved, reports: reports.map((r) => (r.path === reportPath ? { ...r, charts: draft } : r)) },
      });
      queryClient.invalidateQueries({ queryKey: ["code-adoption"] });
      onOpenChange(false);
      toast({ title: "Charts saved" });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      minWidth="420px"
      title={`Charts — Code adoption · ${reportPath ? reportRepo(reportPath) : ""}`}
      footer={
        <div className="flex w-full justify-end gap-2">
          <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
            Cancel
          </DesignButton>
          <DesignButton variant="filled" theme="primary" isLoading={save.isPending} onClick={onSave}>
            Save charts
          </DesignButton>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <DesignNote text="Pick how each section of this report's panel is drawn on its tab. The four shares always add up to 100%." />
        <DesignInputSelect
          label="Evolution over time"
          helperText="Bloom, Greenhouse, native and untagged UI per weekly scan."
          value={draft.trend}
          onChange={(trend) => setDraft({ ...draft, trend: trend as CodeAdoptionCharts["trend"] })}
          options={TREND_CHART_OPTIONS}
        />
        <DesignInputSelect
          label="Adoption by team"
          helperText="Each team's split of UI elements in the latest scan."
          value={draft.teams}
          onChange={(teams) => setDraft({ ...draft, teams: teams as CodeAdoptionCharts["teams"] })}
          options={TEAMS_CHART_OPTIONS}
        />
        <DesignInputSelect
          label="Greenhouse components"
          helperText="Usages of each registered Greenhouse component."
          value={draft.greenhouse}
          onChange={(greenhouse) => setDraft({ ...draft, greenhouse: greenhouse as CodeAdoptionCharts["greenhouse"] })}
          options={GREENHOUSE_CHART_OPTIONS}
        />
      </div>
    </DesignSideSheet>
  );
};

export default CodeAdoptionChartsSheet;
