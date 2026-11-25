import * as React from "react";
import GetDXStudyList from "@/components/datasets/GetDXStudyList";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDateInput } from "@/components/ds/DesignDateInput";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useGetDXStudies, useGetDXStudyResponses } from "@/hooks/useGetDXStudies";
import { useSaveDataSourceConfig } from "@/hooks/useDataSources";
import { useWriteGetdxPlan } from "@/hooks/useWriteGetdxPlan";
import {
  useUndoDatasetImport,
  type DatasetImport,
  type ManualDataset,
  type ManualDatasetColumn,
  type ManualDatasetRow,
} from "@/hooks/useManualDatasets";
import {
  RESPONSE_ID_KEY,
  defaultDuplicateChoice,
  distinctQuestions,
  linkAfterAdd,
  planAdd,
  readGetdxConfig,
  respondentColumns,
  roundsOf,
  startingTargets,
  type DistinctQuestion,
  type DuplicateChoice,
  type QuestionConflict,
  type QuestionTarget,
} from "@/lib/getdxSync";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const errorText = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  return /scope|forbidden|unauthori[sz]ed|permission|40[13]/i.test(message)
    ? `${message}. The GetDX token needs the “datacloud:query” scope.`
    : message;
};
const pickKeys = <T,>(from: Record<string, T>, keysOf: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(from).filter(([key]) => key in keysOf));
const shown = (value: unknown) => {
  const text = String(value ?? "").trim();
  return `“${text.length > 40 ? `${text.slice(0, 40)}…` : text}”`;
};

const encode = (t: QuestionTarget) => (t.to === "column" ? `col|${t.column}` : t.to);
const decode = (value: string): QuestionTarget =>
  value.startsWith("col|") ? { to: "column", column: value.slice(4) } : value === "new" ? { to: "new" } : { to: "skip" };

/**
 * "Add from GetDX" on any dataset: pick studies, choose which questions fill which columns, and
 * add the responses that aren't in the dataset yet; for ones already there whose answers differ,
 * keep, replace or add GetDX's beside them. It's one import, undone from Import history. The
 * dataset remembers its choices, so next time only new questions need one.
 */
const GetDXAddSheet = ({
  open,
  onOpenChange,
  dataset,
  columns,
  rows,
  saved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: ManualDataset;
  columns: ManualDatasetColumn[];
  rows: ManualDatasetRow[];
  /** The GetDX source's saved settings. */
  saved?: Record<string, unknown>;
}) => {
  const { toast } = useToast();
  const config = readGetdxConfig(saved);
  const link = config.datasets[dataset.id];
  const writePlan = useWriteGetdxPlan();
  const undoImport = useUndoDatasetImport();
  const saveConfig = useSaveDataSourceConfig();

  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [targets, setTargets] = React.useState<Record<string, QuestionTarget>>({});
  /** Questions the dataset hasn't seen: the only ones that need a choice. */
  const [unseen, setUnseen] = React.useState<Set<string>>(new Set());
  const [roundDates, setRoundDates] = React.useState<Record<string, string>>({});
  /** For responses already in the dataset, by question. */
  const [duplicates, setDuplicates] = React.useState<Record<string, DuplicateChoice>>({});
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Start from the studies of the dataset's last add.
  React.useEffect(() => {
    if (open) setPicked(new Set(link?.studies ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataset.id]);

  const studies = useGetDXStudies(open);
  const studyIds = React.useMemo(() => [...picked].sort(), [picked]);
  const source = useGetDXStudyResponses(studyIds, open);
  const data = studyIds.length ? source.data : undefined;
  const questions = React.useMemo(() => distinctQuestions(data?.questions ?? []), [data]);
  const rounds = React.useMemo(() => roundsOf(data?.studies ?? []), [data]);

  // A fresh start each time the sheet opens (before the starting choices below).
  React.useEffect(() => {
    if (!open) return;
    setTargets({});
    setRoundDates({});
    setDuplicates({});
    setEditing(false);
  }, [open]);

  // Starting choices for questions and rounds just read; ones already chosen while the sheet is open stay.
  React.useEffect(() => {
    if (!open || !data) return;
    const start = startingTargets(questions, columns, link);
    setTargets((prev) => ({
      ...start.targets,
      ...pickKeys(prev, start.targets),
    }));
    setUnseen(start.unseen);
    setRoundDates((prev) => ({
      ...Object.fromEntries(rounds.map((r) => [r.name, r.lastResponse])),
      ...prev,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data]);

  const plan = React.useMemo(
    () => (data ? planAdd({ data, targets, roundDates, columns, rows, duplicates }) : undefined),
    [data, targets, roundDates, columns, rows, duplicates],
  );
  const total = plan?.rows.length ?? 0;
  const updated = plan?.updates.length ?? 0;
  const labelOf = (key: string) => columns.find((c) => c.key === key)?.label ?? key;
  const promptOf = (questionKey: string) => questions.find((q) => q.key === questionKey)?.prompt ?? questionKey;

  const conflictSelect = (conflict: QuestionConflict) => {
    const isNew = !columns.some((c) => c.key === conflict.column);
    const label = isNew ? promptOf(conflict.questionKey) : labelOf(conflict.column);
    const details = isNew
      ? [`${plural(conflict.missing, "response")} already in the dataset answered this`]
      : [
          conflict.differ > 0 && `${plural(conflict.differ, "answer")} not the same`,
          conflict.example && `e.g. ${shown(conflict.example.before)} in the dataset, ${shown(conflict.example.after)} in GetDX`,
          conflict.missing > 0 && `${conflict.missing} empty in the dataset`,
        ].filter(Boolean);
    const choices =
      conflict.differ > 0
        ? [
            { value: "keep", label: "Keep what's there" },
            { value: "replace", label: "Replace with GetDX's answers" },
            { value: "column", label: "Add GetDX's answers as a new column" },
          ]
        : [
            { value: "keep", label: "Leave them empty" },
            { value: "replace", label: "Fill them in from GetDX" },
          ];
    return (
      <DesignInputSelect
        key={conflict.questionKey}
        label={label}
        helperText={details.join(" · ")}
        value={duplicates[conflict.questionKey] ?? defaultDuplicateChoice(conflict, plan?.newColumns ?? [])}
        options={choices}
        onChange={(value) =>
          setDuplicates((prev) => ({
            ...prev,
            [conflict.questionKey]: value as DuplicateChoice,
          }))
        }
      />
    );
  };

  const reserved = new Set(Object.values(respondentColumns(columns)).filter(Boolean));
  const options = [
    { value: "skip", label: "Don't add" },
    { value: "new", label: "New column" },
    ...columns.filter((c) => !reserved.has(c.key)).map((c) => ({ value: `col|${c.key}`, label: c.label })),
  ];
  const select = (q: DistinctQuestion) => (
    <DesignInputSelect
      key={q.key}
      label={q.prompt}
      value={targets[q.key] ? encode(targets[q.key]) : "skip"}
      options={options}
      onChange={(value) => setTargets((prev) => ({ ...prev, [q.key]: decode(value) }))}
    />
  );
  const known = questions.filter((q) => !unseen.has(q.key));
  const added = known.filter((q) => targets[q.key]?.to !== "skip");
  const leftOut = known.length - added.length;
  const fresh = questions.filter((q) => unseen.has(q.key));

  const togglePicked = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const add = async () => {
    if (!plan || !data) return;
    setSaving(true);
    const done: DatasetImport[] = [];
    const undoAll = async () => {
      for (const entry of done) await undoImport.mutateAsync(entry);
    };
    try {
      if (plan.rows.length || plan.updates.length) {
        const studyOf = new Map(data.responses.map((r) => [r.id, r.studyId]));
        const fromStudies = new Set(plan.rows.map((row) => studyOf.get(String(row[RESPONSE_ID_KEY]))));
        const named = rounds.filter((r) => r.studyIds.some((id) => fromStudies.has(id)));
        await writePlan({
          datasetId: dataset.id,
          plan,
          fileName: `GetDX: ${(named.length ? named : rounds).map((r) => r.name).join(", ")}`,
          columnCount: columns.length,
          rowCount: rows.length,
          onEntry: (entry) => done.push(entry),
        });
      }
      const datasets = {
        ...config.datasets,
        [dataset.id]: linkAfterAdd(studyIds, targets, plan, link),
      };
      const { studies: _studies, studyDataset: _main, questions: _questions, oneOffs: _oneOffs, ...rest } = saved ?? {};
      await saveConfig.mutateAsync({
        source_key: "getdx",
        label: "GetDX",
        config: { ...rest, datasets },
      });
      onOpenChange(false);
      if (!total && !updated) {
        toast({
          title: "Already up to date",
          description: "Every response is already in the dataset. Your choices are saved for next time.",
        });
        return;
      }
      toast({
        title: total
          ? `Added ${plural(total, "response")} from GetDX${updated ? `, updated ${updated}` : ""}`
          : `Updated ${plural(updated, "response")} from GetDX`,
        description: plan.newColumns.length ? `${plural(plan.newColumns.length, "new column")} in ${dataset.name}` : dataset.name,
        action: (
          <ToastAction
            altText="Undo"
            onClick={() =>
              void undoAll()
                .then(() =>
                  toast({
                    title: updated ? "Undone: the dataset is back as it was" : "Removed what was added",
                  }),
                )
                .catch((err) =>
                  toast({
                    title: "Could not undo",
                    description: String(err),
                    variant: "destructive",
                  }),
                )
            }
          >
            Undo
          </ToastAction>
        ),
      });
    } catch (err) {
      await undoAll().catch(() => undefined);
      toast({
        title: "Could not add from GetDX",
        description: `Nothing was added. ${String(err)}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const loading = studyIds.length > 0 && source.isLoading;
  const hasTargets = Boolean(plan && Object.keys(plan.columns).length);

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add from GetDX"
      width="min(640px, 92vw)"
      minWidth="min(360px, 92vw)"
      className="sm:max-w-none"
      footer={
        <div className="flex justify-end gap-2">
          <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
            Cancel
          </DesignButton>
          <DesignButton variant="filled" theme="primary" isLoading={saving} disabled={!hasTargets || loading} onClick={() => void add()}>
            {total && updated
              ? `Add ${total}, update ${updated}`
              : updated
                ? `Update ${plural(updated, "response")}`
                : total
                  ? `Add ${plural(total, "response")}`
                  : data
                    ? "Save choices"
                    : "Add responses"}
          </DesignButton>
        </div>
      }
    >
      <div className="p-4 space-y-6">
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">Studies</h3>
            {picked.size > 0 && <span className="text-sm text-muted-foreground">{picked.size} selected</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            Pick the studies to add responses from. Responses already in {dataset.name} are never added twice.
          </p>
          {studies.isLoading ? (
            <div className="flex justify-center py-6">
              <DesignLoader />
            </div>
          ) : studies.error ? (
            <DesignInfoBanner type="error" title="Could not load studies from GetDX" description={errorText(studies.error)} showCloseButton={false} />
          ) : (
            <GetDXStudyList studies={studies.data ?? []} picked={picked} onToggle={togglePicked} />
          )}
        </section>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <DesignLoader />
            <p className="text-sm text-muted-foreground">Reading {plural(studyIds.length, "study", "studies")} from GetDX…</p>
          </div>
        ) : source.error && studyIds.length ? (
          <DesignInfoBanner
            type="error"
            title="Could not read the studies from GetDX"
            description={errorText(source.error)}
            showCloseButton={false}
          />
        ) : !studyIds.length && !studies.isLoading && !studies.error ? (
          <p className="text-sm text-muted-foreground">Pick at least one study to see its questions.</p>
        ) : data && plan ? (
          <>
            {!editing && fresh.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">{known.length ? "New questions" : "Questions"}</h3>
                <p className="text-sm text-muted-foreground">
                  {known.length
                    ? `Not in ${dataset.name} yet. They start left out, as questions asked once usually belong in their own dataset.`
                    : "Each question becomes a column, with who answered (email, team, role, level) and when."}
                </p>
                {fresh.map(select)}
              </section>
            )}

            {(known.length > 0 || editing) && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">{editing ? "Questions" : "Questions it fills"}</h3>
                  <DesignButton variant="flat" theme="primary" size="small" onClick={() => setEditing((on) => !on)}>
                    {editing ? "Done" : "Change"}
                  </DesignButton>
                </div>
                {editing ? (
                  rounds.map((round) => (
                    <div key={round.name} role="group" aria-label={round.name} className="space-y-3">
                      {rounds.length > 1 && <p className="pt-2 text-sm font-medium text-muted-foreground">{round.name}</p>}
                      {questions.filter((q) => round.studyIds.includes(q.studyId)).map(select)}
                    </div>
                  ))
                ) : added.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <div className="rounded-md border border-border">
                    {added.map((q, i) => {
                      const target = targets[q.key];
                      const column = target?.to === "column" ? labelOf(target.column) : "New column";
                      return (
                        <DesignCell
                          key={q.key}
                          styling="tight"
                          showDivider={i < added.length - 1}
                          title={column}
                          bodyText={column === q.prompt ? undefined : q.prompt}
                        />
                      );
                    })}
                  </div>
                )}
                {!editing && leftOut > 0 && (
                  <p className="text-sm text-muted-foreground">{plural(leftOut, "other question")} left out, as last time.</p>
                )}
              </section>
            )}

            {plan.conflicts.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">Already in {dataset.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {plural(plan.skipped, "response")} from these studies {plan.skipped === 1 ? "is" : "are"} already there, so{" "}
                  {plan.skipped === 1 ? "it won't" : "they won't"} be added again. For the questions below, some of GetDX's answers aren't in the
                  dataset. Choose what to do with them.
                </p>
                {plan.conflicts.map(conflictSelect)}
              </section>
            )}

            {total > 0 && (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">Collection date</h3>
                <p className="text-sm text-muted-foreground">
                  One date per round, so each round counts as a single point in time. It starts as the day of the round's last response.
                </p>
                {rounds.map((round) => (
                  <DesignDateInput
                    key={round.name}
                    label={round.name}
                    helperText={`${plural(round.studyIds.length, "study", "studies")} · ${plural(data.responses.filter((r) => round.studyIds.includes(r.studyId)).length, "response")}`}
                    value={roundDates[round.name] ?? ""}
                    onChange={(value) =>
                      setRoundDates((prev) => ({
                        ...prev,
                        [round.name]: value,
                      }))
                    }
                  />
                ))}
              </section>
            )}

            {hasTargets && (
              <DesignInfoBanner
                type={total || updated || plan.conflicts.length ? "info" : "success"}
                title={
                  total && updated
                    ? `${plural(total, "response")} to add, ${updated} to update`
                    : updated
                      ? `${plural(updated, "response")} to update`
                      : total
                        ? `${plural(total, "response")} to add`
                        : plan.conflicts.length
                          ? "Nothing to add"
                          : "Already up to date"
                }
                description={[
                  plan.skipped > 0 && `${plural(plan.skipped, "response")} already in ${dataset.name}`,
                  plan.newColumns.length > 0 && plural(plan.newColumns.length, "new column"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                showCloseButton={false}
              />
            )}
          </>
        ) : null}
      </div>
    </DesignSideSheet>
  );
};

export default GetDXAddSheet;
