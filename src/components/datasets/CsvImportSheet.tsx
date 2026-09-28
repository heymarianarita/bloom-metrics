import * as React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { parseCsv } from "@/lib/csv";
import type { DatasetColumnKind, ManualDatasetColumn } from "@/hooks/useManualDatasets";
import { looksLikeDates, normalizeDateColumn, type DateOrder } from "../../../server/shared/dates.ts";

const IGNORE = "__ignore__";
const NEW_COLUMN = "__new__";

export interface CsvImportResult {
  /** New columns that must be created before the rows are written. */
  newColumns: { label: string; kind: DatasetColumnKind }[];
  /** Row payloads keyed by dataset column key (new columns use their slug). */
  rows: Record<string, unknown>[];
}

interface CsvImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ManualDatasetColumn[];
  importing?: boolean;
  /** Raw CSV/TSV text of the file the user picked. */
  source: string;
  fileName?: string;
  onImport: (result: { mapping: string[]; header: string[]; body: string[][]; dateOrders: (DateOrder | null)[] }) => void;
}

const looksNumeric = (values: string[]) =>
  values.length > 0 && values.every((value) => value === "" || /^-?[\d.,\s%]+$/.test(value));

/** Guesses a dataset column for a CSV header by comparing normalised names. */
const autoMatch = (header: string, columns: ManualDatasetColumn[]) => {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(header);
  const hit = columns.find((column) => norm(column.label) === target || norm(column.key) === target);
  return hit?.key ?? IGNORE;
};

const CsvImportSheet = ({
  open,
  onOpenChange,
  columns,
  importing,
  source,
  fileName,
  onImport,
}: CsvImportSheetProps) => {
  const [hasHeader, setHasHeader] = React.useState(true);
  const [mapping, setMapping] = React.useState<string[]>([]);
  /** Chosen month-first / day-first per file column, when the file itself can't tell. */
  const [dateOrders, setDateOrders] = React.useState<(DateOrder | null)[]>([]);

  const parsed = React.useMemo(() => (source.trim() ? parseCsv(source) : []), [source]);
  const header = React.useMemo(
    () => (hasHeader ? (parsed[0] ?? []) : (parsed[0] ?? []).map((_, i) => `Column ${i + 1}`)),
    [parsed, hasHeader],
  );
  const body = React.useMemo(() => (hasHeader ? parsed.slice(1) : parsed), [parsed, hasHeader]);

  React.useEffect(() => {
    if (!header.length) {
      setMapping([]);
      return;
    }
    setMapping(header.map((name) => autoMatch(name, columns)));
  }, [header, columns]);

  React.useEffect(() => {
    if (!open) {
      setMapping([]);
      setDateOrders([]);
      setHasHeader(true);
    }
  }, [open]);


  const mappedCount = mapping.filter((value) => value !== IGNORE).length;

  /** For file columns going into a Date column: how their dates will be saved. */
  const dateChecks = React.useMemo(
    () =>
      header.map((_, index) => {
        const target = mapping[index] ?? IGNORE;
        const values = body.map((row) => (row[index] ?? "").trim());
        const isDate =
          target === NEW_COLUMN ? looksLikeDates(values.slice(0, 20)) : columns.find((c) => c.key === target)?.kind === "date";
        return isDate ? normalizeDateColumn(values, dateOrders[index] ?? null) : null;
      }),
    [header, mapping, body, columns, dateOrders],
  );
  const needsDateOrder = dateChecks.some((c, i) => c?.ambiguous && !dateOrders[i]);

  const optionsFor = (index: number) => [
    { value: IGNORE, label: "Ignore this column" },
    ...columns.map((column) => ({ value: column.key, label: column.label })),
    { value: NEW_COLUMN, label: `Create new column “${header[index] ?? ""}”` },
  ];

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Import from CSV"
      width="min(720px, 60vw)"
      minWidth="480px"

      footer={
        <div className="flex justify-end gap-2">
          <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
            Cancel
          </DesignButton>
          <DesignButton
            variant="filled"
            theme="primary"
            isLoading={importing}
            disabled={body.length === 0 || mappedCount === 0 || needsDateOrder}
            onClick={() => onImport({ mapping, header, body, dateOrders })}
          >
            Import {body.length ? `${body.length} rows` : ""}
          </DesignButton>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] font-[500] text-foreground truncate">
            {fileName || "Selected file"}
          </p>
          <label className="flex shrink-0 items-center gap-2 text-[14px] text-foreground">
            <DesignCheckbox
              checked={hasHeader}
              onCheckedChange={(checked) => setHasHeader(Boolean(checked))}
            />
            First row contains column names
          </label>
        </div>



        {body.length > 0 && (
          <>
            <DesignNote text={`${body.length} rows found. Match each column in the file to a column in the dataset.`} />
            <div className="space-y-2">
              {header.map((name, index) => {
                const ignored = (mapping[index] ?? IGNORE) === IGNORE;
                const dates = dateChecks[index];
                return (
                  <div key={`${name}-${index}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p
                      className={`w-[40%] shrink-0 truncate text-[14px] font-[500] ${
                        ignored ? "text-muted-foreground" : "text-foreground"
                      }`}
                      title={name || `Column ${index + 1}`}
                    >
                      {name || `Column ${index + 1}`}
                    </p>
                    <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <DesignInputSelect
                        size="medium"
                        value={mapping[index] ?? IGNORE}
                        onChange={(value) =>
                          setMapping((prev) => prev.map((item, i) => (i === index ? value : item)))
                        }
                        options={optionsFor(index)}
                      />
                    </div>
                  </div>
                  {dates && (
                    <div className="pl-[calc(40%+24px)] space-y-1.5">
                      {dates.ambiguous && (
                        <DesignInputSelect
                          size="small"
                          placeholder="Pick how these dates are written"
                          value={dateOrders[index] ?? ""}
                          onChange={(value) =>
                            setDateOrders((prev) => {
                              const next = [...prev];
                              next[index] = value as DateOrder;
                              return next;
                            })
                          }
                          options={[
                            { value: "mdy", label: "Month first (03/26/2025)" },
                            { value: "dmy", label: "Day first (26/03/2025)" },
                          ]}
                        />
                      )}
                      <p className={`text-[12px] ${dates.ambiguous && !dateOrders[index] ? "text-destructive" : "text-muted-foreground"}`}>
                        {dates.ambiguous && !dateOrders[index]
                          ? "These dates could be read either way. Pick how they're written."
                          : dates.converted > 0
                            ? `${dates.converted} date${dates.converted === 1 ? "" : "s"} saved as YYYY-MM-DD${dates.order ? ` (read ${dates.order === "mdy" ? "month" : "day"} first)` : ""}.`
                            : "Dates are already written as YYYY-MM-DD."}
                        {dates.unreadable > 0 && !(dates.ambiguous && !dateOrders[index])
                          ? ` ${dates.unreadable} value${dates.unreadable === 1 ? " isn't a date and is" : "s aren't dates and are"} kept as written.`
                          : ""}
                      </p>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>

          </>
        )}

      </div>
    </DesignSideSheet>
  );
};

export { IGNORE as CSV_IGNORE, NEW_COLUMN as CSV_NEW_COLUMN, looksNumeric };
export default CsvImportSheet;
