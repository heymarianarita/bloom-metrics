import * as React from "react";
import { ArrowsClockwise, Trash } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DescriptionField } from "@/components/settings/metrics/DescriptionField";
import { FormSection } from "@/components/settings/metrics/FormSection";
import { writeMetricDescription } from "@/lib/metricDescription";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/formatDate";
import { useMetricGroups } from "@/hooks/useMetricGroups";
import { useDatasetColumns, useDatasetRows, useManualDatasets } from "@/hooks/useManualDatasets";
import { isTeamLabel } from "@/hooks/useTeamBusinessUnits";
import {
  useDeleteQualitativeSource,
  useQualitativeGroup,
  useQualitativeSources,
  useRunQualitative,
  useSaveQualitativeSource,
  type QualitativeBreakdown,
  type QualitativeSource,
  type QuestionTone,
} from "@/hooks/useQualitative";

const TONES: { value: QuestionTone; label: string }[] = [
  { value: "positive", label: "Praise: what works well" },
  { value: "improvement", label: "Requests: what needs improving" },
  { value: "neutral", label: "Mixed or neutral" },
];

const emptyDraft = {
  name: "",
  description: "",
  group_name: "",
  dataset_id: "",
  text_column: "",
  period_column: "",
  tone: "neutral" as QuestionTone,
  breakdowns: [] as QualitativeBreakdown[],
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Free-text columns (long, mostly unique answers) first, so the right column is easy to pick. */
const useColumnProfile = (datasetId: string) => {
  const columns = useDatasetColumns(datasetId || undefined);
  const rows = useDatasetRows(datasetId || undefined);
  return React.useMemo(() => {
    const data = (rows.data ?? []).map((r) => (r.data ?? {}) as Record<string, unknown>);
    return (columns.data ?? []).map((c) => {
      const values = data.map((d) => String(d[c.key] ?? "").trim()).filter(Boolean);
      const distinct = new Set(values).size;
      const avgLength = values.length ? values.reduce((s, v) => s + v.length, 0) / values.length : 0;
      const email = c.kind === "email" || (values.length > 0 && values.every((v) => v.includes("@")));
      return {
        key: c.key,
        label: c.label,
        filled: values.length,
        text: c.kind === "text" && !email,
        freeText: c.kind === "text" && !email && avgLength >= 25 && distinct > values.length * 0.5,
        category: c.kind === "text" && !email && distinct > 0 && (distinct <= 30 || isTeamLabel(c.label)),
      };
    });
  }, [columns.data, rows.data]);
};

const guessTone = (text: string): QuestionTone =>
  /improv|better|change|missing|problem|issue/i.test(text) ? "improvement" : /well|like|good|love/i.test(text) ? "positive" : "neutral";

export const StatusBadge = ({ status }: { status: QualitativeSource["run_status"] }) =>
  status === "running" ? (
    <DesignBadge theme="primary" styling="light">Analysing</DesignBadge>
  ) : status === "done" ? (
    <DesignBadge theme="success" styling="light">Up to date</DesignBadge>
  ) : status === "error" ? (
    <DesignBadge theme="error" styling="light">Analysis failed</DesignBadge>
  ) : (
    <DesignBadge theme="muted" styling="light">Not analysed yet</DesignBadge>
  );

/** Where the analysis stands, in one line, with the action to run it again. */
const AnalysisStatus = ({
  source,
  onAnalyse,
  busy,
}: {
  source: QualitativeSource;
  onAnalyse: () => void;
  busy: boolean;
}) => {
  const message =
    source.run_status === "running"
      ? `${source.run_message || "Starting"}… This takes a few minutes; you can close this.`
      : source.run_status === "error"
        ? source.run_message || "The last analysis didn't finish."
        : source.run_status === "done"
          ? source.run_message || "Themes are up to date."
          : "Themes and summaries appear after the analysis runs.";
  return (
    <div className="rounded-md border border-border p-3 flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <StatusBadge status={source.run_status} />
        <p className={`text-xs ${source.run_status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
        <p className="text-xs text-muted-foreground">
          {source.run_at && source.run_status !== "running" ? `Last run ${formatDateTime(source.run_at)}. ` : ""}
          Runs again on its own shortly after its dataset changes.
        </p>
      </div>
      <DesignButton
        variant="flat"
        theme="primary"
        size="small"
        className="shrink-0 whitespace-nowrap"
        icon={<ArrowsClockwise size={16} />}
        disabled={source.run_status === "running"}
        isLoading={busy}
        onClick={onAnalyse}
      >
        Analyse again
      </DesignButton>
    </div>
  );
};

type ResultRow = { period: string; answers: number; themes: string };

/** What the metric group page will show, per period, for the selected qualitative metric. */
const Results = ({ source }: { source: QualitativeSource }) => {
  const view = useQualitativeGroup(source.group_name);
  const data = view.data?.sources.find((s) => s.id === source.id);
  const question = data?.questions[0];
  const rows: ResultRow[] = React.useMemo(() => {
    if (!data || !question) return [];
    const name = new Map(question.themes.map((t) => [t.id, t.name]));
    return [...data.periods].reverse().map((period) => {
      const all = question.periods[period]?.segments.find((s) => s.key === "all");
      return {
        period,
        answers: all?.answered ?? 0,
        themes:
          (all?.themes ?? [])
            .filter((t) => t.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map((t) => `${name.get(t.id)} (${t.count})`)
            .join(", ") || "—",
      };
    });
  }, [data, question]);

  if (view.isLoading) return <DesignLoader />;
  if (!question || question.themes.length === 0) return null;
  const columns: DataTableColumn<ResultRow>[] = [
    { key: "period", header: "Period", render: (r) => r.period, width: "1fr" },
    { key: "answers", header: "Answers", render: (r) => String(r.answers), width: "1fr" },
    { key: "themes", header: "Main themes", render: (r) => r.themes, width: "4fr" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Themes per period</p>
      {question.trendSummary && <DesignNote className="p-0" text={`Over time: ${question.trendSummary}`} />}
      <DesignDataTable columns={columns} data={rows} rowKey={(r) => r.period} hideToolbar />
    </div>
  );
};

/**
 * Create or edit a Qualitative insight block: themes found in a dataset's free-text answers,
 * shown on the tab it's placed in.
 */
const QualitativeBlockSheet = ({
  open,
  onOpenChange,
  source,
  tabName,
  sortOrder,
  datasetId,
  inline = false,
  kindPicker,
  onSaved,
  onDeleted,
}: {
  /** Dataset a new insight starts from (Unused data → Use). */
  datasetId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The insight to edit; null creates a new one. */
  source: QualitativeSource | null;
  /** Tab a new insight is placed in. */
  tabName?: string;
  sortOrder?: number;
  /** Drawn in the page instead of a side sheet. */
  inline?: boolean;
  /** Inline only: the choice between kinds of metric, under the heading of a new one. */
  kindPicker?: React.ReactNode;
  /** After saving, with the insight's id (to select a new one). */
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}) => {
  const { toast } = useToast();
  const datasets = useManualDatasets();
  const groups = useMetricGroups();
  const save = useSaveQualitativeSource();
  const remove = useDeleteQualitativeSource();
  const run = useRunQualitative();
  const [draft, setDraft] = React.useState(emptyDraft);
  const editingId = source?.id ?? null;
  const profile = useColumnProfile(draft.dataset_id);

  React.useEffect(() => {
    if (!open) return;
    setDraft(
      source
        ? {
            name: source.name,
            description: source.description,
            group_name: source.group_name,
            dataset_id: source.dataset_id,
            text_column: source.text_column,
            period_column: source.period_column,
            tone: source.tone,
            breakdowns: Array.isArray(source.breakdowns) ? source.breakdowns : [],
          }
        : { ...emptyDraft, group_name: tabName ?? "", dataset_id: datasetId ?? "" },
    );
    // Reset only when the sheet opens on a different insight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source?.id, tabName]);

  // Picking a dataset from elsewhere (Unused data → Use) fills it in without clearing the rest.
  React.useEffect(() => {
    if (open && !source && datasetId)
      setDraft((prev) => ({ ...prev, dataset_id: datasetId, text_column: "", period_column: "", breakdowns: [] }));
  }, [open, source, datasetId]);

  const analyse = async (id: string) => {
    try {
      await run.mutateAsync(id);
    } catch (e) {
      toast({ title: "Could not start the analysis", description: errorText(e), variant: "destructive" });
    }
  };

  const missingForDescription = !draft.name.trim()
    ? "add a name"
    : !draft.dataset_id || !draft.text_column
      ? "pick a dataset and its answers column"
      : null;
  const describe = () => {
    const column = (key: string) => profile.find((c) => c.key === key)?.label;
    return writeMetricDescription("qualitative", {
      Name: draft.name,
      Group: draft.group_name,
      Dataset: (datasets.data ?? []).find((d) => d.id === draft.dataset_id)?.name,
      "Answers column (the survey question)": column(draft.text_column),
      "Kind of answers": TONES.find((t) => t.value === draft.tone)?.label,
      "Broken down by": draft.breakdowns.map((b) => b.label).join(", "),
    });
  };

  const onSave = async () => {
    if (!draft.name.trim() || !draft.group_name || !draft.dataset_id || !draft.text_column || !draft.period_column) {
      toast({ title: "Missing details", description: "Add a name, tab, dataset, answers column and period column.", variant: "destructive" });
      return;
    }
    try {
      const id = await save.mutateAsync({
        ...(editingId ? { id: editingId } : { sort_order: sortOrder ?? 0 }),
        ...draft,
        name: draft.name.trim(),
      });
      onOpenChange(false);
      onSaved?.(id);
      toast({ title: "Saved", description: "Analysing the answers. This takes a few minutes." });
      await analyse(id);
    } catch (e) {
      toast({ title: "Could not save", description: errorText(e), variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!source || !window.confirm(`Delete "${source.name}"? Its themes and summaries are removed too.`)) return;
    try {
      await remove.mutateAsync(source.id);
      onOpenChange(false);
      onDeleted?.();
      toast({ title: "Deleted" });
    } catch (e) {
      toast({ title: "Could not delete", description: errorText(e), variant: "destructive" });
    }
  };

  const textColumns = profile.filter((c) => c.text).sort((a, b) => Number(b.freeText) - Number(a.freeText));
  const breakdownColumns = profile.filter((c) => c.category && c.key !== draft.text_column && c.key !== draft.period_column);
  const hasBreakdown = (column: string) => draft.breakdowns.some((b) => b.column === column);

  const footer = (
    <div className="flex w-full justify-between gap-2">
      <div>
        {source && (
          <DesignButton variant="flat" theme="error" icon={<Trash size={16} />} isLoading={remove.isPending} onClick={onDelete}>
            Delete
          </DesignButton>
        )}
      </div>
      <div className="flex gap-2">
        <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
          Cancel
        </DesignButton>
        <DesignButton variant="filled" theme="primary" isLoading={save.isPending} onClick={onSave}>
          Save and analyse
        </DesignButton>
      </div>
    </div>
  );
  const body = (
    <div className={inline ? "flex flex-col gap-4" : "p-4 flex flex-col gap-4"}>
      {source && <AnalysisStatus source={source} busy={run.isPending} onAnalyse={() => analyse(source.id)} />}

      <FormSection title="Data" description="The survey answers to read.">
        <DesignInputSelect
          label="Dataset"
          placeholder="Pick a dataset"
          value={draft.dataset_id}
          onChange={(dataset_id) => setDraft({ ...draft, dataset_id, text_column: "", period_column: "", breakdowns: [] })}
          options={(datasets.data ?? []).filter((d) => !d.archived).map((d) => ({ value: d.id, label: d.name }))}
        />
        {draft.dataset_id && (
          <>
            <DesignInputSelect
              label="Answers column"
              placeholder="Pick the free-text column"
              value={draft.text_column}
              onChange={(text_column) => {
                const col = profile.find((c) => c.key === text_column);
                setDraft({
                  ...draft,
                  text_column,
                  name: draft.name || col?.label || "",
                  tone: guessTone(`${text_column} ${col?.label ?? ""}`),
                  breakdowns: draft.breakdowns.filter((b) => b.column !== text_column),
                });
              }}
              options={textColumns.map((c) => ({ value: c.key, label: c.freeText ? `${c.label} (${c.filled} answers)` : c.label }))}
            />
            <DesignInputSelect
              label="Period column"
              helperText="The date or quarter each answer belongs to."
              placeholder="Pick a column"
              value={draft.period_column}
              onChange={(period_column) => setDraft({ ...draft, period_column })}
              options={profile.map((c) => ({ value: c.key, label: c.label }))}
            />
          </>
        )}
      </FormSection>

      <FormSection title="About this metric" description="How it's named and shown on the page.">
        <DesignInputText
          label="Name"
          placeholder="What needs improvement"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <DesignInputSelect
          label="Group"
          placeholder="Pick a group"
          helperText="Where it's shown is set in Metrics → Views."
          value={draft.group_name}
          onChange={(group_name) => setDraft({ ...draft, group_name })}
          options={(groups.data ?? []).filter((g) => !g.parent_id).map((g) => ({ value: g.name, label: g.name }))}
        />
        <DesignInputSelect
          label="Kind of answers"
          helperText="Decides whether a growing theme is good or bad news."
          value={draft.tone}
          onChange={(tone) => setDraft({ ...draft, tone: tone as QuestionTone })}
          options={TONES}
        />
        <DescriptionField
          value={draft.description}
          onChange={(description) => setDraft((d) => ({ ...d, description }))}
          missing={missingForDescription}
          write={describe}
        />
      </FormSection>

      <FormSection
        title="Break down by"
        description="A summary is written for each value, such as each role. Team columns are grouped into business units."
      >
        {!draft.dataset_id ? (
          <p className="text-sm text-muted-foreground">Pick a dataset first.</p>
        ) : breakdownColumns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No columns to break down by.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {breakdownColumns.map((c) => {
              const team = isTeamLabel(c.label);
              const breakdown: QualitativeBreakdown = team
                ? { kind: "business_unit", column: c.key, label: "Business unit" }
                : { kind: "column", column: c.key, label: c.label };
              return (
                <label key={c.key} className="flex items-center gap-3 cursor-pointer">
                  <DesignCheckbox
                    checked={hasBreakdown(c.key)}
                    onCheckedChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        breakdowns: next ? [...prev.breakdowns, breakdown] : prev.breakdowns.filter((b) => b.column !== c.key),
                      }))
                    }
                  />
                  <span className="text-sm text-foreground">{team ? `Business unit (from ${c.label})` : c.label}</span>
                </label>
              );
            })}
          </div>
        )}
        <DesignNote className="p-0" text="The AI finds the themes itself and keeps them up to date as new answers come in. Only the answers and breakdown values are sent to it, never emails or other columns; names, teams and emails are removed from the quotes people see." />
      </FormSection>

      {source && <Results source={source} />}
    </div>
  );

  // In a page's main panel (Metrics → All metrics) instead of a side sheet.
  if (inline) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">{editingId ? `Configure — ${source?.name}` : "New metric"}</h2>
        {kindPicker}
        {body}
        <div className="border-t border-border pt-4">{footer}</div>
      </div>
    );
  }

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      minWidth="420px"
      title={editingId ? `Configure — ${source?.name}` : "New qualitative metric"}
      footer={footer}
    >
      {body}
    </DesignSideSheet>
  );
};

export default QualitativeBlockSheet;
