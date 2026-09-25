import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
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

const kindLabels: { kind: DatasetColumnKind; label: string }[] = [
  { kind: "email", label: "Email" },
  { kind: "date", label: "Date" },
  { kind: "number", label: "Number" },
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
    <th className={`${ts.th} min-w-[160px]`}>
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
            className="w-full bg-transparent text-[14px] font-medium text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && setEditing(true)}
            className="flex-1 truncate text-left text-[14px] font-medium text-foreground"
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
                className="flex h-6 w-6 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)]"
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

  const base =
    "w-full h-full min-h-[44px] bg-transparent px-4 py-3 text-[14px] text-foreground outline-none focus:bg-[rgba(0,119,130,0.06)] focus:ring-1 focus:ring-primary rounded-[2px]";

  if (column.kind === "period") {
    return (
      <td className={ts.tdEditable}>
        <input
          id={cellId(rowIndex, columnIndex)}
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

  return (
    <td className={ts.tdEditable}>
      <input
        id={cellId(rowIndex, columnIndex)}
        type={column.kind === "date" ? "date" : column.kind === "email" ? "email" : "text"}
        inputMode={column.kind === "number" ? "decimal" : undefined}
        disabled={readOnly}
        value={draft}
        placeholder={column.kind === "email" ? "name@vinted.com" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        title={invalidEmail ? "This does not look like an email address" : undefined}
        className={`${base} ${column.kind === "number" ? "text-right tabular-nums" : ""} ${
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
  <div className={`${ts.containerNested} overflow-x-auto`}>
    <datalist id="dsg-quarters">
      {recentQuarters(12).map((q) => (
        <option key={q} value={q} />
      ))}
    </datalist>
    <table className={ts.table}>
      <thead>
        <tr className={ts.headRow}>
          <th className={`${ts.th} w-12`}>
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
          <th className={`${ts.th} w-12 px-2`}>
            {!readOnly && (
              <button
                aria-label="Add column"
                onClick={onAddColumn}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)]"
              >
                <Plus size={16} />
              </button>
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={row.id} className={`group ${ts.row} last:border-b`}>
            <td className={`${ts.td} ${ts.tdMuted} align-middle`}>
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
            <td className={`${ts.td} px-2 align-middle`}>
              {!readOnly && (
                <button
                  aria-label="Delete row"
                  onClick={() => onDeleteRow(row)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground opacity-0 transition-opacity hover:bg-[rgba(208,69,85,0.08)] hover:text-destructive group-hover:opacity-100"
                >
                  <Trash size={14} />
                </button>
              )}
            </td>
          </tr>
        ))}
        {!readOnly && (
          <tr>
            <td colSpan={columns.length + 2} className="p-0">
              <button
                onClick={onAddRow}
                className={ts.footerAction}
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
