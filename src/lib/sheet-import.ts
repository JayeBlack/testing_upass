import * as XLSX from "xlsx";

/**
 * Reads an uploaded .csv, .xlsx, or .xls file and returns rows of strings
 * (including the header row). First sheet is used for Excel files.
 */
export async function readSheetFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
  const isCsv = name.endsWith(".csv");
  if (!isExcel && !isCsv) {
    throw new Error("Unsupported file type. Upload a .csv, .xlsx, or .xls file.");
  }
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return rows.map((r) => r.map((c) => (c == null ? "" : String(c).trim())));
}

export const SHEET_ACCEPT = ".csv,.xlsx,.xls";