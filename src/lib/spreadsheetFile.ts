export const SPREADSHEET_ACCEPT =
  ".csv,.tsv,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Cell = string | number | boolean | Date | null | undefined;

export interface SheetTable {
  name: string;
  rows: Cell[][];
}

export interface ReadTableFile {
  /** CSV text, so Excel files go through the same parser as CSV files. */
  text: string;
  /** The sheet that was used, when the workbook has more than one with data. */
  sheetName?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel dates come back as UTC midnight; times only when the cell has one. */
export const cellText = (value: Cell): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const day = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
    const hasTime = value.getUTCHours() || value.getUTCMinutes();
    return hasTime ? `${day} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}` : day;
  }
  return String(value);
};

const quote = (value: string) => (/[",\n\r;\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const rowsToCsv = (rows: Cell[][]) => rows.map((row) => row.map((cell) => quote(cellText(cell))).join(",")).join("\n");

const filledRows = (sheet: SheetTable) => sheet.rows.filter((row) => row.some((cell) => cellText(cell).trim() !== "")).length;

/** Apple Numbers adds an "Export Summary" sheet; otherwise the sheet with the most rows is the data. */
export const pickSheet = (sheets: SheetTable[]): { sheet: SheetTable | null; withData: number } => {
  const candidates = sheets.filter((s) => filledRows(s) > 0 && s.name.trim().toLowerCase() !== "export summary");
  const sheet = candidates.reduce<SheetTable | null>((best, s) => (!best || filledRows(s) > filledRows(best) ? s : best), null);
  return { sheet, withData: candidates.length };
};

const isExcel = (file: File) =>
  /\.xlsx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Reads a CSV, TSV or Excel (.xlsx) file as CSV text. */
export const readTableFile = async (file: File): Promise<ReadTableFile> => {
  if (!isExcel(file)) return { text: await file.text() };
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = (await readXlsxFile(file)).map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }));
  const { sheet, withData } = pickSheet(sheets);
  if (!sheet) return { text: "" };
  return { text: rowsToCsv(sheet.rows), sheetName: withData > 1 ? sheet.name : undefined };
};
