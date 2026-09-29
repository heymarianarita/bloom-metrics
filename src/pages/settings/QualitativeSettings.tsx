import * as React from "react";
import { ArrowsClockwise, Plus, Trash } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { useToast } from "@/hooks/use-toast";
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

const StatusBadge = ({ status }: { status: QualitativeSource["run_status"] }) =>
  status === "running" ? (
    <DesignBadge theme="primary" styling="light">Analysing</DesignBadge>
  ) : status === "done" ? (
    <DesignBadge theme="success" styling="light">Up to date</DesignBadge>
  ) : status === "error" ? (
    <DesignBadge theme="error" styling="light">Analysis failed</DesignBadge>
  ) : (
    <DesignBadge theme="muted" styling="light">Not analysed yet</DesignBadge>
  );

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
  if (!question || question.themes.length === 0) {
    return (
      <DesignEmptyState
        title={source.run_status === "running" ? "Analysing the answers" : "No themes yet"}
        body={
          source.run_status === "running"
            ? `${source.run_message || "Starting"}… This takes a few minutes; you can leave the page.`
            : source.run_status === "error"
              ? source.run_message
              : "Themes and summaries appear here after the analysis runs."
        }
      />
    );
  }
  const columns: DataTableColumn<ResultRow>[] = [
    { key: "period", header: "Period", render: (r) => r.period, width: "1fr" },
    { key: "answers", header: "Answers", render: (r) => String(r.answers), width: "1fr" },
    { key: "themes", header: "Main themes", render: (r) => r.themes, width: "4fr" },
  ];
  return (
    <>
      {question.trendSummary && (
        <>
          <DesignNote text={`Over time: ${question.trendSummary}`} />
          <DesignSpacer size="small" />
        </>
      )}
      <DesignDataTable columns={columns} data={rows} rowKey={(r) => r.period} />
    </>
  );
};

const QualitativeTab = () => {
  const { toast } = useToast();
  const sources = useQualitativeSources();
  const datasets = useManualDatasets();
  const groups = useMetricGroups();
  const save = useSaveQualitativeSource();
  const remove = useDeleteQualitativeSource();
  const run = useRunQualitative();

  const [sourceId, setSourceId] = React.useState("");
  const [sheet, setSheet] = React.useState(false);
  const [draft, setDraft] = React.useState(emptyDraft);
  /** Set when the sheet edits an existing item; null when creating. */
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const profile = useColumnProfile(draft.dataset_id);

  const list = React.useMemo(() => sources.data ?? [], [sources.data]);
  React.useEffect(() => {
    if (!list.some((s) => s.id === sourceId) && list.length) setSourceId(list[0].id);
  }, [list, sourceId]);
  const active = list.find((s) => s.id === sourceId);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setSheet(true);
  };
  const openEdit = (s: QualitativeSource) => {
    setEditingId(s.id);
    setDraft({
      name: s.name,
      description: s.description,
      group_name: s.group_name,
      dataset_id: s.dataset_id,
      text_column: s.text_column,
      period_column: s.period_column,
      tone: s.tone,
      breakdowns: Array.isArray(s.breakdowns) ? s.breakdowns : [],
    });
    setSheet(true);
  };

  const analyse = async (id: string) => {
    try {
      await run.mutateAsync(id);
    } catch (e) {
      toast({ title: "Could not start the analysis", description: errorText(e), variant: "destructive" });
    }
  };

  const onSave = async () => {
    if (!draft.name.trim() || !draft.group_name || !draft.dataset_id || !draft.text_column || !draft.period_column) {
      toast({ title: "Missing details", description: "Add a name, group, dataset, answers column and period column.", variant: "destructive" });
      return;
    }
    try {
      const id = await save.mutateAsync({ ...(editingId ? { id: editingId } : {}), ...draft, name: draft.name.trim() });
      setSheet(false);
      setSourceId(id);
      toast({ title: "Saved", description: "Analysing the answers. This takes a few minutes." });
      await analyse(id);
    } catch (e) {
      toast({ title: "Could not save", description: errorText(e), variant: "destructive" });
    }
  };

  const onDelete = async (s: QualitativeSource) => {
    if (!window.confirm(`Delete "${s.name}"? Its themes and summaries are removed too.`)) return;
    try {
      await remove.mutateAsync(s.id);
      setSourceId("");
      toast({ title: "Deleted" });
    } catch (e) {
      toast({ title: "Could not delete", description: errorText(e), variant: "destructive" });
    }
  };

  if (sources.isLoading) return <DesignLoader />;

  const textColumns = profile.filter((c) => c.text).sort((a, b) => Number(b.freeText) - Number(a.freeText));
  const breakdownColumns = profile.filter((c) => c.category && c.key !== draft.text_column && c.key !== draft.period_column);
  const hasBreakdown = (column: string) => draft.breakdowns.some((b) => b.column === column);
  const datasetName = datasets.data?.find((d) => d.id === active?.dataset_id)?.name ?? "the dataset";

  return (
    <>
      <DesignCard className="p-4">
        {list.length === 0 ? (
          <DesignEmptyState
            title="No qualitative metrics yet"
            body="Pick a free-text column of a dataset, such as “What needs improvement”, to see its themes per role and business unit on a metric group."
            action={
              <DesignButton variant="filled" theme="primary" onClick={openNew}>
                Add first qualitative metric
              </DesignButton>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[280px]">
                <DesignInputSelect
                  label="Qualitative metric"
                  size="medium"
                  value={sourceId}
                  onChange={setSourceId}
                  options={list.map((s) => ({ value: s.id, label: `${s.group_name} · ${s.name}` }))}
                />
              </div>
              <DesignButton variant="outlined" theme="primary" size="medium" disabled={!active} onClick={() => active && openEdit(active)}>
                Configure
              </DesignButton>
              <DesignButton
                variant="outlined"
                theme="primary"
                size="medium"
                icon={<ArrowsClockwise size={16} />}
                disabled={!active || active.run_status === "running"}
                isLoading={run.isPending}
                onClick={() => active && analyse(active.id)}
              >
                Analyse again
              </DesignButton>
              <DesignButton
                variant="outlined"
                theme="error"
                size="medium"
                icon={<Trash size={16} />}
                disabled={!active}
                isLoading={remove.isPending}
                onClick={() => active && onDelete(active)}
              >
                Delete
              </DesignButton>
              <DesignButton variant="filled" theme="primary" size="medium" icon={<Plus size={16} />} onClick={openNew}>
                New qualitative metric
              </DesignButton>
            </div>

            {active && (
              <>
                <DesignSpacer size="small" />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={active.run_status} />
                  <DesignNote
                    text={`Summarising “${active.text_column}” per “${active.period_column}” from ${datasetName}${
                      active.breakdowns.length ? `, by ${active.breakdowns.map((b) => b.label.toLowerCase()).join(" and ")}` : ""
                    }${active.run_message && active.run_status === "done" ? ` · ${active.run_message}` : ""}`}
                  />
                </div>
                <DesignSpacer size="small" />
                <Results source={active} />
              </>
            )}
          </>
        )}
      </DesignCard>

      <DesignSideSheet
        open={sheet}
        onOpenChange={setSheet}
        title={editingId && draft.name ? `Configure — ${draft.name}` : "New qualitative metric"}
        footer={
          <div className="flex justify-end gap-2">
            <DesignButton variant="outlined" theme="primary" onClick={() => setSheet(false)}>
              Cancel
            </DesignButton>
            <DesignButton variant="filled" theme="primary" isLoading={save.isPending} onClick={onSave}>
              Save and analyse
            </DesignButton>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <DesignInputText
            label="Name"
            placeholder="What needs improvement"
            helperText="Shown as the tab name on the metric group page."
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <DesignInputSelect
            label="Group"
            placeholder="Pick a group"
            value={draft.group_name}
            onChange={(group_name) => setDraft({ ...draft, group_name })}
            options={(groups.data ?? []).filter((g) => !g.parent_id).map((g) => ({ value: g.name, label: g.name }))}
          />
          <DesignInputText
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <DesignInputSelect
            label="Dataset"
            placeholder="Pick a dataset"
            value={draft.dataset_id}
            onChange={(dataset_id) => setDraft({ ...draft, dataset_id, text_column: "", period_column: "", breakdowns: [] })}
            options={(datasets.data ?? []).filter((d) => !d.archived).map((d) => ({ value: d.id, label: d.name }))}
          />
          <DesignInputSelect
            label="Answers column"
            placeholder={draft.dataset_id ? "Pick the free-text column" : "Pick a dataset first"}
            disabled={!draft.dataset_id}
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
            placeholder={draft.dataset_id ? "Pick a column" : "Pick a dataset first"}
            disabled={!draft.dataset_id}
            value={draft.period_column}
            onChange={(period_column) => setDraft({ ...draft, period_column })}
            options={profile.map((c) => ({ value: c.key, label: c.label }))}
          />
          <DesignInputSelect
            label="Kind of answers"
            helperText="Decides whether a growing theme is good or bad news."
            value={draft.tone}
            onChange={(tone) => setDraft({ ...draft, tone: tone as QuestionTone })}
            options={TONES}
          />

          <div className="space-y-2">
            <p className="text-[14px] font-medium text-foreground">Break down by</p>
            <DesignNote text="Summaries are written for each value, such as each role. Team columns are grouped into business units with the GetDX team mapping." />
            {!draft.dataset_id ? (
              <p className="text-[14px] text-muted-foreground">Pick a dataset first.</p>
            ) : breakdownColumns.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">No columns to break down by.</p>
            ) : (
              <div className="space-y-3 pt-1">
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
                      <span className="text-[14px] text-foreground">{team ? `Business unit (from ${c.label})` : c.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DesignNote text="The AI finds the themes itself and keeps them up to date as new answers come in. Only the answers and breakdown values are sent to it, never emails or other columns; names, teams and emails are removed from the quotes people see." />
        </div>
      </DesignSideSheet>
    </>
  );
};

const QualitativeSettings = () => (
  <RequireRole role="editor">
    <AppShell>
      <DesignPageHeader
        title="Qualitative"
        subtitle="Summarise free-text answers into themes, shown per role and business unit on a metric group."
      />
      <DesignSpacer size="medium" />
      <QualitativeTab />
    </AppShell>
  </RequireRole>
);

export default QualitativeSettings;
