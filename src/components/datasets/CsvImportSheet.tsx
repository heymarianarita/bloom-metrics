import * as React from "react";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { tableStyles } from "@/components/ds/tableStyles";
import { parseCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { DatasetColumnKind, ManualDatasetColumn } from "@/hooks/useManualDatasets";
import type { DateOrder } from "../../../server/shared/dates.ts";
import ColumnMatchBoard, { KIND_LABELS } from "./ColumnMatchBoard";
import AnswerCleanupStep from "./AnswerCleanupStep";
import {
  answerCleanups,
  autoMatch,
  blockers,
  planImport,
  type ImportChoices,
  type ImportPlan,
  type MetricUse,
} from "./importPlan";

interface CsvImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetName: string;
  columns: ManualDatasetColumn[];
  /** Columns the dataset's metrics group and filter by, so leaving them empty can be flagged. */
  metricUse: MetricUse;
  importing?: boolean;
  /** Raw CSV/TSV text of the file the user picked. */
  source: string;
  fileName?: string;
  onImport: (plan: ImportPlan) => void;
}

const looksNumeric = (values: string[]) =>
  values.length > 0 && values.every((value) => value === "" || /^-?[\d.,\s%]+$/.test(value));

const STEPS = [
  { id: "match", title: "Match columns" },
  { id: "clean", title: "Clean up answers" },
  { id: "review", title: "Review" },
] as const;
type Step = (typeof STEPS)[number]["id"];

const PREVIEW_ROWS = 5;

const shown = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : String(value));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const CsvImportSheet = ({
  open,
  onOpenChange,
  datasetName,
  columns,
  metricUse,
  importing,
  source,
  fileName,
  onImport,
}: CsvImportSheetProps) => {
  const [step, setStep] = React.useState<Step>("match");
  const [hasHeader, setHasHeader] = React.useState(true);
  const [mapping, setMapping] = React.useState<string[]>([]);
  const [newKinds, setNewKinds] = React.useState<(DatasetColumnKind | null)[]>([]);
  const [dateOrders, setDateOrders] = React.useState<(DateOrder | null)[]>([]);
  const [fixed, setFixed] = React.useState<Record<string, string>>({});
  const [overrides, setOverrides] = React.useState<NonNullable<ImportChoices["overrides"]>>({});

  const parsed = React.useMemo(() => (source.trim() ? parseCsv(source) : []), [source]);
  const header = React.useMemo(
    () => (hasHeader ? (parsed[0] ?? []) : (parsed[0] ?? []).map((_, i) => `Column ${i + 1}`)),
    [parsed, hasHeader],
  );
  const body = React.useMemo(() => (hasHeader ? parsed.slice(1) : parsed), [parsed, hasHeader]);

  React.useEffect(() => {
    if (!open) return;
    setMapping(header.map((name) => autoMatch(name, columns)));
    setNewKinds([]);
    setDateOrders([]);
    setOverrides({});
  }, [header, columns, open]);

  React.useEffect(() => {
    if (!open) {
      setStep("match");
      setMapping([]);
      setNewKinds([]);
      setDateOrders([]);
      setFixed({});
      setOverrides({});
      setHasHeader(true);
    }
  }, [open]);

  const plan = React.useMemo(
    () => planImport(columns, header, body, { mapping, newKinds, dateOrders, fixed, overrides }, metricUse),
    [columns, header, body, mapping, newKinds, dateOrders, fixed, overrides, metricUse],
  );
  const cleanups = React.useMemo(() => answerCleanups(plan, body, overrides), [plan, body, overrides]);
  const reasons = blockers(plan, body.length);
  const cleanupProblems = cleanups.some(({ column, answers }) =>
    answers.some(
      (a) =>
        (a.overridden && (a.override ?? "").trim() !== "" && a.saved === null) ||
        (column.kind === "rating" && a.saved !== null && (a.saved < 1 || a.saved > 5)),
    ),
  );
  const unanswered = cleanups.flatMap(({ column, answers }) =>
    answers.filter((a) => a.unreadable).map((a) => ({ index: column.fileIndex!, raw: a.raw })),
  );

  const setAt = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, value: T) =>
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const setOverride = (index: number, raw: string, value: string | undefined) =>
    setOverrides((prev) => {
      const forColumn = { ...(prev[index] ?? {}) };
      if (value === undefined) delete forColumn[raw];
      else forColumn[raw] = value;
      return { ...prev, [index]: forColumn };
    });

  const matchStep = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] text-foreground">
            <span className="font-[500]">{fileName || "Selected file"}</span>
            <span className="text-muted-foreground"> · {plural(body.length, "response")}</span>
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-[14px] text-foreground">
          <DesignCheckbox checked={hasHeader} onCheckedChange={(checked) => setHasHeader(Boolean(checked))} />
          First row has column names
        </label>
      </div>
      {body.length > 0 && (
        <ColumnMatchBoard
          datasetName={datasetName}
          columns={columns}
          header={header}
          body={body}
          plan={plan}
          metricUse={metricUse}
          mapping={mapping}
          onPlace={(index, target) => setAt(setMapping, index, target)}
          newKinds={newKinds}
          onNewKind={(index, kind) => setAt(setNewKinds, index, kind)}
          dateOrders={dateOrders}
          onDateOrder={(index, order) => setAt(setDateOrders, index, order)}
          fixed={fixed}
          onFixed={(key, value) => setFixed((prev) => ({ ...prev, [key]: value }))}
        />
      )}
    </div>
  );

  const previewRows = plan.rows.slice(0, PREVIEW_ROWS);
  const warnings = [
    ...plan.missingPeriod.map((label) => ({
      title: `No ${label.toLowerCase()}`,
      description: `These rows won't show on any chart. Go back and give every row the same ${label.toLowerCase()}.`,
    })),
    ...plan.unreadable.map((u) => ({
      title: `${plural(u.count, "answer")} in “${u.label}” ${u.count === 1 ? "has" : "have"} no number`,
      description: `${u.examples.map((e) => `“${e}”`).join(", ")} will be left empty, so ${u.count === 1 ? "it doesn't" : "they don't"} count towards the average. Go back to Clean up answers to give ${u.count === 1 ? "it" : "them"} a score.`,
    })),
    ...plan.missingFilters.map((label) => ({
      title: `“${label}” stays empty`,
      description: `These rows won't match a filter on ${label.toLowerCase()}.`,
    })),
  ];

  const reviewStep = (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-[14px] font-[580] text-foreground">What will happen</h3>
        <ul className="list-disc space-y-1 pl-5 text-[14px] text-foreground">
          <li>
            Adds {plural(body.length, "new row")} to {datasetName}. Rows already there aren't changed.
          </li>
          {plan.newColumns.length > 0 && (
            <li>
              Creates {plural(plan.newColumns.length, "column")}:{" "}
              {plan.newColumns.map((c) => `“${c.label}” (${KIND_LABELS[c.kind].toLowerCase()})`).join(", ")}.
            </li>
          )}
          {plan.columns
            .filter((c) => c.fileIndex === null)
            .map((c) => (
              <li key={c.key}>
                Sets “{c.label}” to {shown(previewRows[0]?.[c.key])} on every row.
              </li>
            ))}
          {plan.ignoredHeaders.length > 0 && (
            <li>
              Leaves out {plural(plan.ignoredHeaders.length, "column")} of the file:{" "}
              <span className="text-muted-foreground">{plan.ignoredHeaders.map((h) => `“${h}”`).join(", ")}</span>.
            </li>
          )}
        </ul>
      </section>

      {warnings.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[14px] font-[580] text-foreground">
            {warnings.length === 1 ? "Check this before adding" : `Check these ${warnings.length} things before adding`}
          </h3>
          {warnings.map((w) => (
            <DesignInfoBanner key={w.title} type="warning" showCloseButton={false} title={w.title} description={w.description} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-[14px] font-[580] text-foreground">
          How the first {Math.min(PREVIEW_ROWS, plan.rows.length)} rows will be saved
        </h3>
        <div className={`${tableStyles.container} overflow-x-auto`}>
          <table className={tableStyles.table}>
            <thead>
              <tr className={tableStyles.headRow}>
                {plan.columns.map((c) => (
                  <th key={c.key} className={tableStyles.th}>
                    <span className="flex items-center gap-1.5">
                      {c.label}
                      {c.isNew && (
                        <DesignBadge theme="primary" styling="light">
                          New
                        </DesignBadge>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className={tableStyles.row}>
                  {plan.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`${tableStyles.td} max-w-[220px] truncate ${shown(row[c.key]) === "—" ? tableStyles.tdMuted : ""}`}
                      title={shown(row[c.key])}
                    >
                      {shown(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[12px] text-muted-foreground">
        Made a mistake? Undo this import from the dataset's menu → Import history. It removes exactly these rows.
      </p>
    </div>
  );

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const footerNote =
    step === "match" ? reasons[0] : step === "clean" && cleanupProblems ? "Fix the answers marked in red." : undefined;

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Import from a file"
      width="min(960px, 86vw)"
      minWidth="560px"
      className="sm:max-w-none"
      footer={
        <div className="flex items-center justify-end gap-3">
          {footerNote && <p className="mr-auto text-[12px] text-destructive">{footerNote}</p>}
          {step === "clean" && unanswered.length > 0 && !footerNote && (
            <button
              type="button"
              className="mr-auto text-[14px] text-primary hover:underline"
              onClick={() => unanswered.forEach(({ index, raw }) => setOverride(index, raw, ""))}
            >
              Leave {unanswered.length === 1 ? "the answer" : `all ${unanswered.length} answers`} without a number empty
            </button>
          )}
          <DesignButton
            variant="outlined"
            theme="primary"
            disabled={importing}
            onClick={() => (stepIndex === 0 ? onOpenChange(false) : setStep(STEPS[stepIndex - 1].id))}
          >
            {stepIndex === 0 ? "Cancel" : "Back"}
          </DesignButton>
          {step === "review" ? (
            <DesignButton variant="filled" theme="primary" isLoading={importing} onClick={() => onImport(plan)}>
              Add {plural(body.length, "row")}
            </DesignButton>
          ) : (
            <DesignButton
              variant="filled"
              theme="primary"
              disabled={(step === "match" && reasons.length > 0) || (step === "clean" && cleanupProblems)}
              onClick={() => setStep(STEPS[stepIndex + 1].id)}
            >
              Next: {STEPS[stepIndex + 1].title}
            </DesignButton>
          )}
        </div>
      }
    >
      <div className="p-4">
        <ol className="mb-4 flex items-center gap-2 text-[12px]">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-border" aria-hidden="true" />}
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  i === stepIndex ? "font-[580] text-foreground" : i < stepIndex ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={i === stepIndex ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                    i === stepIndex ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {i + 1}
                </span>
                {s.title}
              </span>
            </li>
          ))}
        </ol>
        {step === "match" && matchStep}
        {step === "clean" && <AnswerCleanupStep header={header} cleanups={cleanups} onOverride={setOverride} />}
        {step === "review" && reviewStep}
      </div>
    </DesignSideSheet>
  );
};

export { looksNumeric };
export default CsvImportSheet;
