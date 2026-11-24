import * as React from "react";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignInputText } from "@/components/ds/DesignInput";
import { tableStyles } from "@/components/ds/tableStyles";
import { readNumber } from "@/lib/cellValues";
import { cn } from "@/lib/utils";
import type { AnswerCleanup, PlannedColumn } from "./importPlan";

interface AnswerCleanupStepProps {
  header: string[];
  cleanups: { column: PlannedColumn; answers: AnswerCleanup[] }[];
  /** Sets what an answer of file column `index` is saved as; undefined goes back to reading it. */
  onOverride: (index: number, raw: string, value: string | undefined) => void;
}

/**
 * Every distinct answer of the score and number columns, with the number it's saved as.
 * Labels ("5 - Very satisfied") are dropped automatically; answers without a number get a box.
 */
const AnswerCleanupStep = ({ header, cleanups, onOverride }: AnswerCleanupStepProps) => {
  if (!cleanups.length) {
    return (
      <p className="text-[14px] text-muted-foreground">
        Nothing to clean up: no score or number columns are filled from the file. Extra spaces around answers are trimmed
        either way.
      </p>
    );
  }

  const labelled = cleanups.flatMap((c) => c.answers.filter((a) => a.label && !a.overridden));
  const polished = labelled.reduce((n, a) => n + a.count, 0);
  const open = cleanups.reduce((n, c) => n + c.answers.filter((a) => a.unreadable).length, 0);

  return (
    <div className="space-y-5">
      <p className="text-[14px] text-foreground">
        {polished > 0 && (
          <>
            {polished === 1 ? "1 answer was" : `${polished} answers were`} written with a label, like “{labelled[0].raw}”.
            Only the score is saved, so averages work.{" "}
          </>
        )}
        {open > 0 ? (
          <span className="text-destructive">
            {open} {open === 1 ? "answer has" : "answers have"} no number. Give {open === 1 ? "it" : "each"} a score, or
            leave it empty so it doesn't count.
          </span>
        ) : (
          "Every answer has a number. Change any you disagree with."
        )}
      </p>

      {cleanups.map(({ column, answers }) => (
        <section key={column.key} className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-[14px] font-[580] text-foreground">{column.label}</h3>
            <p className="min-w-0 truncate text-[12px] text-muted-foreground">
              from “{header[column.fileIndex!] || `Column ${column.fileIndex! + 1}`}”
            </p>
          </div>
          <div className={cn(tableStyles.container, "overflow-x-auto")}>
            <table className={tableStyles.table}>
              <thead>
                <tr className={tableStyles.headRow}>
                  <th className={tableStyles.th}>Answer in the file</th>
                  <th className={cn(tableStyles.th, tableStyles.thNumeric, "w-[70px]")}>Rows</th>
                  <th className={cn(tableStyles.th, "w-[150px]")}>Saved as</th>
                </tr>
              </thead>
              <tbody>
                {answers.map((answer) => {
                  const outOfScale =
                    column.kind === "rating" && answer.saved !== null && (answer.saved < 1 || answer.saved > 5);
                  const notANumber = answer.overridden && (answer.override ?? "").trim() !== "" && answer.saved === null;
                  return (
                    <tr key={answer.raw} className={tableStyles.row}>
                      <td className={tableStyles.td}>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {answer.raw}
                          {answer.unreadable && (
                            <DesignBadge theme="error" styling="light">
                              No number
                            </DesignBadge>
                          )}
                        </span>
                      </td>
                      <td className={cn(tableStyles.td, tableStyles.tdNumeric)}>{answer.count}</td>
                      <td className={cn(tableStyles.td, "py-1")}>
                        <DesignInputText
                          inputMode="decimal"
                          aria-label={`Saved value for “${answer.raw}”`}
                          placeholder="Leave empty"
                          error={answer.unreadable || outOfScale || notANumber}
                          value={answer.overridden ? (answer.override ?? "") : answer.saved === null ? "" : String(answer.saved)}
                          onChange={(e) => {
                            const value = e.target.value;
                            const automatic = readNumber(answer.raw);
                            // Typing the number the answer already gives just removes the override.
                            onOverride(
                              column.fileIndex!,
                              answer.raw,
                              automatic !== null && readNumber(value) === automatic ? undefined : value,
                            );
                          }}
                        />
                        {outOfScale && <p className="mt-1 text-[12px] text-destructive">Ratings go from 1 to 5.</p>}
                        {notANumber && <p className="mt-1 text-[12px] text-destructive">Type a number, or clear it.</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
};

export default AnswerCleanupStep;
