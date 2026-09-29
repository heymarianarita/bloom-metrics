import * as React from "react";
import { GearSix, GithubLogo, Trash } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import MetricGroupPicker from "@/components/settings/MetricGroupPicker";
import {
  SourceAddField,
  SourceCard,
  SourceList,
  SourceListItem,
  type SourceRun,
} from "@/components/settings/source/SourceCard";
import { useSaveDataSourceConfig } from "@/hooks/useDataSources";
import { useCodeAdoption, useSyncCodeAdoption, type CodeReportSource } from "@/hooks/useCodeAdoption";
import { groupOptions, useMetricGroups } from "@/hooks/useMetricGroups";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/formatDate";

const DEFAULT_BRANCH = "master";

/**
 * The product repo a report is about, from its file name, as the server names it:
 * "path/to/checkout-web-report.json" → "checkout-web".
 */
const repoOf = (path: string) => (path.split("/").pop() ?? path).replace(/(-report)?\.json$/, "");

/** A GitHub file link: github.com/<owner>/<repo>/blob/<branch>/<path>. */
const parseReport = (input: string): Omit<CodeReportSource, "metricGroupId"> | null => {
  const value = input.trim();
  const link = /^https?:\/\/github\.com\/([^/]+\/[^/]+)\/(?:blob|raw)\/([^/]+)\/(.+?)(?:[?#].*)?$/.exec(value);
  if (link) return { repository: link[1], branch: link[2], path: decodeURIComponent(link[3]) };
  return null;
};

/**
 * GitHub code adoption: one row per ds-analyzer report file (one per product repo), each
 * pointed at the metric group or subgroup whose page shows it. Same layout as the Figma
 * libraries card: a list, an "Add" field, and changes saved as they're made.
 */
const CodeAdoptionSourceCard = ({
  saved,
  lastRun,
}: {
  saved?: Record<string, unknown>;
  lastRun?: SourceRun;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const save = useSaveDataSourceConfig();
  const sync = useSyncCodeAdoption();
  const [reports, setReports] = React.useState<CodeReportSource[]>([]);
  const [openRow, setOpenRow] = React.useState<string | null>(null);
  const groups = useMetricGroups();
  const labels = new Map(groupOptions(groups.data ?? []).map((o) => [o.value, o.label]));
  const codeAdoption = useCodeAdoption();
  const stored = new Map((codeAdoption.data?.repos ?? []).map((r) => [r.repo, r]));

  React.useEffect(() => {
    const raw = Array.isArray(saved?.reports) ? (saved.reports as Partial<CodeReportSource>[]) : [];
    setReports(
      raw
        .filter((r) => r.path)
        .map((r) => ({
          repository: r.repository ?? "",
          branch: r.branch || DEFAULT_BRANCH,
          path: r.path ?? "",
          metricGroupId: r.metricGroupId ?? null,
        })),
    );
  }, [saved]);

  const persist = async (next: CodeReportSource[]) => {
    setReports(next);
    try {
      await save.mutateAsync({ source_key: "code_adoption", label: "Code adoption (GitHub)", config: { ...saved, reports: next } });
      queryClient.invalidateQueries({ queryKey: ["code-adoption"] });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const keyOf = (r: CodeReportSource) => `${r.repository}:${r.path}`;
  const updateRow = (key: string, patch: Partial<CodeReportSource>) =>
    reports.map((r) => (keyOf(r) === key ? { ...r, ...patch } : r));

  const addReport = async (value: string) => {
    const parsed = parseReport(value);
    if (!parsed) {
      toast({
        title: "Not a report file",
        description: "Paste the GitHub link to a .json report file (github.com/…/blob/…).",
        variant: "destructive",
      });
      return false;
    }
    const report = { ...parsed, metricGroupId: null };
    if (reports.some((r) => keyOf(r) === keyOf(report))) {
      toast({ title: "Already added", description: "That report is on the list." });
      return false;
    }
    await persist([...reports, report]);
    // Open its settings straight away: it still needs a group to show in.
    setOpenRow(keyOf(report));
    toast({ title: "Report added", description: "Pick where it's shown. It's fetched on the next sync." });
    return true;
  };

  const onSync = async () => {
    try {
      const r = await sync.mutateAsync();
      toast({
        title: "Synced",
        description: r.added ? `${r.added} new report${r.added === 1 ? "" : "s"} stored.` : "Already up to date.",
      });
    } catch (err) {
      toast({ title: "Sync failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <SourceCard
      title="Code adoption (GitHub)"
      description="Bloom usage in product repos, from the weekly ds-analyzer reports. Checked every morning."
      credentialsKey="code_adoption"
      lastRun={codeAdoption.data?.lastRun ?? lastRun}
      onSync={onSync}
      syncing={sync.isPending}
    >
      <SourceList
        empty={{
          icon: <GithubLogo size={40} />,
          title: "No reports yet",
          body: "Paste the GitHub link to a ds-analyzer report below to start tracking a repo.",
        }}
      >
        {reports.map((report) => {
          const key = keyOf(report);
          const synced = stored.get(repoOf(report.path));
          const last = synced?.snapshots[synced.snapshots.length - 1];
          const shownIn = report.metricGroupId ? labels.get(report.metricGroupId) : undefined;
          return (
            <SourceListItem
              key={key}
              title={repoOf(report.path)}
              subtitle={`${shownIn ?? "Not shown anywhere yet"} · ${
                last
                  ? `${synced!.snapshots.length} weekly report${synced!.snapshots.length === 1 ? "" : "s"}, latest ${formatDate(last.generated_at)}`
                  : "not synced yet"
              }`}
              actions={
                <>
                  <DesignButton
                    variant="flat"
                    theme="muted"
                    size="small"
                    icon={<GearSix size={16} />}
                    onClick={() => setOpenRow((current) => (current === key ? null : key))}
                  >
                    Settings
                  </DesignButton>
                  <DesignButton
                    variant="flat"
                    theme="error"
                    size="small"
                    icon={<Trash size={16} />}
                    onClick={() => persist(reports.filter((r) => keyOf(r) !== key))}
                  >
                    Remove
                  </DesignButton>
                </>
              }
            >
              {openRow === key && (
                <div className="grid gap-3 md:grid-cols-2">
                  <MetricGroupPicker
                    value={report.metricGroupId}
                    onChange={(metricGroupId) => persist(updateRow(key, { metricGroupId }))}
                  />
                  <DesignInputText
                    label="Branch"
                    placeholder={DEFAULT_BRANCH}
                    defaultValue={report.branch}
                    onBlur={(e) => {
                      const branch = e.target.value.trim() || DEFAULT_BRANCH;
                      if (branch !== report.branch) persist(updateRow(key, { branch }));
                    }}
                  />
                  <p className="md:col-span-2 text-[12px] text-muted-foreground">
                    File: {report.repository} / {report.path}
                  </p>
                </div>
              )}
            </SourceListItem>
          );
        })}
      </SourceList>

      <SourceAddField
        label="Add a report"
        placeholder="https://github.com/<owner>/<repo>/blob/<branch>/path/to/report.json"
        helperText="The GitHub link to the report file. The token needs read access to its repository."
        busy={save.isPending}
        onAdd={addReport}
      />
    </SourceCard>
  );
};

export default CodeAdoptionSourceCard;
