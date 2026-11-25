import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash, CaretDown } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { recentQuarters } from "@/lib/quarters";
import type {
  DatasetColumnKind,
  ManualDatasetColumn,
  ManualDatasetRow,
} from "@/hooks/useManualDatasets";

interface DatasetGridProps {
  columns: ManualDatasetColumn[];
  rows: ManualDatasetRow[];
  readOnly?: boolean;
  onCellChange: (row: ManualDatasetRow, column: ManualDatasetColumn, value: string) => void;
  onRenameColumn: (column: ManualDatasetColumn, label: string) => void;
  onChangeColumnKind: (column: ManualDatasetColumn, kind: DatasetColumnKind) => void;
  onDeleteColumn: (column: ManualDatasetColumn) => void;
  onAddColumn: () => void;
  onAddRow: () => void;
  onDeleteRow: (row: ManualDatasetRow) => void;
  /** Paste of a spreadsheet block starting at the given cell. */
  onPasteBlock: (rowIndex: number, columnIndex: number, block: string[][]) => void;
}

const cellId = (r: number, c: number) => `dsg-${r}-${c}`;

/** Spreadsheet density: tighter than the default Bloom cell padding. */
const dense = {
  th: cn(ts.th, ts.thSticky, "px-2 py-1"),
  td: cn(ts.td, "px-2 py-1"),
  /** Cell holding a small icon button, so the button doesn't make the row taller. */
  tdAction: cn(ts.td, "px-1 py-0"),
  input: cn(ts.cellInput, "px-2 py-1"),
  iconButton: "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground",
};

const kindLabels: { kind: DatasetColumnKind; label: string }[] = [
  { kind: "email", label: "Email" },
  { kind: "date", label: "Date" },
  { kind: "number", label: "Number" },
  { kind: "rating", label: "Rating (1–5)" },
  { kind: "text", label: "Text" },
  { kind: "period", label: "Quarter" },
];

const ColumnHeader = ({
  column,
  readOnly,
  onRename,
  onChangeKind,
  onDelete,
}: {
  column: ManualDatasetColumn;
  readOnly?: boolean;
  onRename: (label: string) => void;
  onChangeKind: (kind: DatasetColumnKind) => void;
  onDelete: () => void;
}) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(column.label);
  React.useEffect(() => setDraft(column.label), [column.label]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== column.label) onRename(next);
    else setDraft(column.label);
  };

  return (
    <th className={cn(dense.th, "min-w-[160px]")}>
      <div className="flex items-center gap-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(column.label);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && setEditing(true)}
            className="flex-1 truncate text-left text-sm hover:text-foreground"
            title={`${column.label} · ${column.kind}`}
          >
            {column.label}
          </button>
        )}
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Options for ${column.label}`}
                className={cn(dense.iconButton, "-my-1 h-5 w-5 hover:bg-[var(--surface-hover)]")}
              >
                <CaretDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>
              <DropdownMenuSeparator />
              {kindLabels.map(({ kind, label }) => (
                <DropdownMenuItem key={kind} onClick={() => onChangeKind(kind)}>
                  {column.kind === kind ? "✓ " : ""}
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                Delete column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </th>
  );
};

const GridCell = ({
  row,
  column,
  rowIndex,
  columnIndex,
  columnCount,
  rowCount,
  readOnly,
  onCellChange,
  onPasteBlock,
}: {
  row: ManualDatasetRow;
  column: ManualDatasetColumn;
  rowIndex: number;
  columnIndex: number;
  columnCount: number;
  rowCount: number;
  readOnly?: boolean;
  onCellChange: (value: string) => void;
  onPasteBlock: (rowIndex: number, columnIndex: number, block: string[][]) => void;
}) => {
  const initial = String(row.data?.[column.key] ?? "");
  const [draft, setDraft] = React.useState(initial);
  React.useEffect(() => setDraft(initial), [initial]);

  const focusCell = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= rowCount || c >= columnCount) return;
    const el = document.getElementById(cellId(r, c)) as HTMLInputElement | null;
    el?.focus();
    el?.select?.();
  };

  const commit = () => {
    if (draft !== initial) onCellChange(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      commit();
      focusCell(rowIndex + 1, columnIndex);
    } else if (e.key === "Escape") {
      setDraft(initial);
    } else if (e.key === "Tab") {
      commit();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      commit();
      focusCell(rowIndex + 1, columnIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      commit();
      focusCell(rowIndex - 1, columnIndex);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text || (!text.includes("\t") && !text.trim().includes("\n"))) return;
    e.preventDefault();
    const block = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => line.split("\t"));
    onPasteBlock(rowIndex, columnIndex, block);
  };

  const base = dense.input;
  const cellLabel = `${column.label}, row ${rowIndex + 1}`;

  if (column.kind === "period") {
    return (
      <td className={ts.tdEditable}>
        <input
          id={cellId(rowIndex, columnIndex)}
          aria-label={cellLabel}
          list="dsg-quarters"
          disabled={readOnly}
          value={draft}
          placeholder="2026-Q1"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={base}
        />
      </td>
    );
  }

  const invalidEmail =
    column.kind === "email" && draft.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.trim());
  // Dates are plain text rather than a native picker, which shows the browser's locale format
  // (09/29/2026) instead of YYYY-MM-DD. Edits in another format are converted on save.

  return (
    <td className={ts.tdEditable}>
      <input
        id={cellId(rowIndex, columnIndex)}
        aria-label={cellLabel}
        type={column.kind === "email" ? "email" : "text"}
        inputMode={column.kind === "number" || column.kind === "rating" ? "decimal" : undefined}
        disabled={readOnly}
        value={draft}
        placeholder={column.kind === "email" ? "name@vinted.com" : column.kind === "date" ? "YYYY-MM-DD" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        title={invalidEmail ? "This does not look like an email address" : undefined}
        className={`${base} ${column.kind === "number" || column.kind === "rating" ? "text-right tabular-nums" : ""} ${
          invalidEmail ? "text-destructive" : ""
        }`}
      />
    </td>
  );
};

export const DatasetGrid = ({
  columns,
  rows,
  readOnly,
  onCellChange,
  onRenameColumn,
  onChangeColumnKind,
  onDeleteColumn,
  onAddColumn,
  onAddRow,
  onDeleteRow,
  onPasteBlock,
}: DatasetGridProps) => (
  // Scrolls inside its own frame so the header row can stay in view (sticky needs the scrolling box).
  // In a column that fits the window it fills the space left; otherwise it caps at the window height.
  <div className={`${ts.container} overflow-auto max-h-[calc(100vh-220px)] xl:max-h-none xl:flex-1 xl:min-h-0`}>
    <datalist id="dsg-quarters">
      {recentQuarters(12).map((q) => (
        <option key={q} value={q} />
      ))}
    </datalist>
    <table className={`${ts.table} ${ts.colDividers}`}>
      <thead>
        <tr className={ts.headRow}>
          <th className={cn(dense.th, "w-10")}>
            #
          </th>
          {columns.map((column) => (
            <ColumnHeader
              key={column.id}
              column={column}
              readOnly={readOnly}
              onRename={(label) => onRenameColumn(column, label)}
              onChangeKind={(kind) => onChangeColumnKind(column, kind)}
              onDelete={() => onDeleteColumn(column)}
            />
          ))}
          <th className={cn(dense.th, "w-8 px-1 py-0")}>
            {!readOnly && (
              <button
                aria-label="Add column"
                onClick={onAddColumn}
                className={cn(dense.iconButton, "hover:bg-[var(--surface-hover)]")}
              >
                <Plus size={14} />
              </button>
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={row.id} className={`group ${ts.row}`}>
            <td className={cn(dense.td, ts.tdMuted, "tabular-nums")}>
              {rowIndex + 1}
            </td>
            {columns.map((column, columnIndex) => (
              <GridCell
                key={column.id}
                row={row}
                column={column}
                rowIndex={rowIndex}
                columnIndex={columnIndex}
                columnCount={columns.length}
                rowCount={rows.length}
                readOnly={readOnly}
                onCellChange={(value) => onCellChange(row, column, value)}
                onPasteBlock={onPasteBlock}
              />
            ))}
            <td className={dense.tdAction}>
              {!readOnly && (
                <button
                  aria-label="Delete row"
                  onClick={() => onDeleteRow(row)}
                  className={cn(dense.iconButton, "opacity-0 transition-opacity hover:bg-[rgba(208,69,85,0.08)] hover:text-destructive group-hover:opacity-100")}
                >
                  <Trash size={14} />
                </button>
              )}
            </td>
          </tr>
        ))}
        {!readOnly && (
          <tr>
            <td colSpan={columns.length + 2} className={ts.footerCell}>
              <button
                onClick={onAddRow}
                className={cn(ts.footerAction, "px-2 py-1")}
              >
                <Plus size={14} /> New row
              </button>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default DatasetGrid;
