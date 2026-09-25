import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
import { ClipboardText } from "@phosphor-icons/react";
import { DesignDialog } from "@/components/ds/DesignDialog";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText, DesignInputTextArea } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignNote } from "@/components/ds/DesignNote";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_ORDER,
  PERFORMANCE_FIELDS,
  gridToEntries,
  looksLikeDocBlob,
  looksLikeHeader,
  parseDocText,
  parsePastedTable,
  type PerformanceField,
} from "@/lib/performancePaste";
import { useSavePerformanceQuarter } from "@/hooks/usePerformanceEntries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultQuarter?: string;
}

const currentQuarter = () => {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
};

const fieldOptions = [
  { value: "__skip", label: "Ignore column" },
  ...PERFORMANCE_FIELDS.map((f) => ({ value: f.key, label: f.label })),
];

const PastePerformanceDialog = ({ open, onOpenChange, defaultQuarter }: Props) => {
  const { toast } = useToast();
  const save = useSavePerformanceQuarter();

  const [quarter, setQuarter] = React.useState(defaultQuarter ?? currentQuarter());
  const [text, setText] = React.useState("");
  const [replace, setReplace] = React.useState(true);
  const [order, setOrder] = React.useState<(PerformanceField | "")[]>(DEFAULT_ORDER);
  const [format, setFormat] = React.useState<"auto" | "doc" | "table">("auto");

  const docMode = format === "doc" || (format === "auto" && looksLikeDocBlob(text));

  React.useEffect(() => {
    if (open) setQuarter(defaultQuarter ?? currentQuarter());
  }, [open, defaultQuarter]);

  const grid = React.useMemo(() => parsePastedTable(text), [text]);
  const hasHeader = grid.length > 0 && looksLikeHeader(grid[0]);
  const dataGrid = hasHeader ? grid.slice(1) : grid;
  const columnCount = grid.reduce((max, row) => Math.max(max, row.length), 0);

  React.useEffect(() => {
    setOrder((prev) => {
      const next = [...prev];
      while (next.length < columnCount) next.push(DEFAULT_ORDER[next.length] ?? "");
      return next.slice(0, Math.max(columnCount, 0));
    });
  }, [columnCount]);

  const docRows = React.useMemo(() => (docMode ? parseDocText(text) : []), [docMode, text]);
  const preview = React.useMemo(
    () => (docMode ? docRows : gridToEntries(dataGrid, order)),
    [docMode, docRows, dataGrid, order],
  );

  const handleSave = async () => {
    if (!quarter.trim()) {
      toast({ title: "Add a quarter name", description: "For example 2026-Q3.", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        quarter: quarter.trim(),
        replace,
        rows: preview.map((row, index) => ({ ...row, quarter: quarter.trim(), sort_order: index })),
      });
      toast({ title: "Performance data saved", description: `${preview.length} rows in ${quarter.trim()}.` });
      setText("");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <DesignDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Paste performance data from a doc"
      icon={<ClipboardText size={20} />}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <DesignNote text="Select the table in your Google Doc, copy it, and paste it below. Docs often drops the tabs — the parser then reads the R-A-G markers, team sections and bullet lists to rebuild the rows." />

        <DesignInputSelect
          label="Paste format"
          options={[
            { value: "auto", label: "Auto-detect" },
            { value: "doc", label: "Google Doc text (no tabs)" },
            { value: "table", label: "Tab-separated table" },
          ]}
          value={format}
          onChange={(value) => setFormat(value as "auto" | "doc" | "table")}
        />

        <DesignInputText
          label="Quarter"
          placeholder="2026-Q3"
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        />

        <DesignInputTextArea
          label="Pasted table"
          placeholder="Paste the table from your Google Doc here"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {text.trim() !== "" && (docMode || columnCount > 0) && (
          <>
            {!docMode && (
            <>
            <div className="text-[14px] font-[500] text-foreground">Column mapping</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: columnCount }).map((_, index) => (
                <DesignInputSelect
                  key={index}
                  label={`Column ${index + 1}${hasHeader && grid[0][index] ? ` — ${grid[0][index]}` : ""}`}
                  options={fieldOptions}
                  value={order[index] || "__skip"}
                  onChange={(value) =>
                    setOrder((prev) => {
                      const next = [...prev];
                      next[index] = value === "__skip" ? "" : (value as PerformanceField);
                      return next;
                    })
                  }
                />
              ))}
            </div>
            </>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <DesignCheckbox
                checked={replace}
                onCheckedChange={(checked) => setReplace(Boolean(checked))}
              />
              <span className="text-[14px] text-foreground">
                Replace existing rows for {quarter || "this quarter"}
              </span>
            </label>

            <DesignInfoBanner
              type="info"
              title={`${preview.length} rows detected`}
              description={
                docMode
                  ? "Google Doc text detected — rows were rebuilt from the R-A-G markers, with team and headcount carried down each section."
                  : hasHeader
                  ? "The first pasted line was detected as a header and will be skipped."
                  : "No header row detected — every line is treated as data."
              }
              showCloseButton={false}
            />

            <div className="border border-border rounded-[6px] overflow-x-auto">
              <table className={ts.table}>
                <thead>
                  <tr className={ts.headRow}>
                    {PERFORMANCE_FIELDS.map((f) => (
                      <th key={f.key} className={ts.th}>
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 6).map((row, i) => (
                    <tr key={i} className={ts.row}>
                      {PERFORMANCE_FIELDS.map((f) => (
                        <td key={f.key} className={`${ts.td} max-w-[180px]`}>
                          <span className="line-clamp-3 whitespace-pre-wrap">{row[f.key] || "—"}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 6 && (
              <div className="text-[12px] text-muted-foreground">
                Showing the first 6 of {preview.length} rows.
              </div>
            )}
          </>
        )}

        <DesignSpacer size="small" />
        <div className="flex justify-end gap-2">
          <DesignButton variant="outlined" theme="primary" onClick={() => onOpenChange(false)}>
            Cancel
          </DesignButton>
          <DesignButton
            variant="filled"
            theme="primary"
            isLoading={save.isPending}
            disabled={preview.length === 0}
            onClick={handleSave}
          >
            Save {preview.length > 0 ? `${preview.length} rows` : ""}
          </DesignButton>
        </div>
      </div>
    </DesignDialog>
  );
};

export default PastePerformanceDialog;
