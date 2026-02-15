/**
 * CSV / Excel export utility.
 *
 * Uses SheetJS (xlsx) to produce .xlsx workbooks — compatible with Excel,
 * Google Sheets, and every other spreadsheet app.
 */

import * as XLSX from "xlsx";

export interface Column<T> {
  /** Unique key for this column (used for filtering) */
  id?: string;
  header: string;
  accessor: (row: T) => string | number;
}

/**
 * Filter columns to only include selected ones.
 */
function filterColumns<T>(columns: Column<T>[], selectedIds?: string[]): Column<T>[] {
  if (!selectedIds) return columns;
  return columns.filter((c) => c.id && selectedIds.includes(c.id));
}

/**
 * Export an array of data as an .xlsx file.
 */
export function exportToExcel<T>(
  data: T[],
  columns: Column<T>[],
  filename: string,
  selectedColumnIds?: string[]
) {
  const cols = filterColumns(columns, selectedColumnIds);
  const headers = cols.map((c) => c.header);
  const rows = data.map((row) => cols.map((c) => c.accessor(row)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-size columns
  ws["!cols"] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export an array of data as a .csv file (plain text fallback).
 */
export function exportToCSV<T>(
  data: T[],
  columns: Column<T>[],
  filename: string,
  selectedColumnIds?: string[]
) {
  const cols = filterColumns(columns, selectedColumnIds);
  const headers = cols.map((c) => c.header);
  const rows = data.map((row) =>
    cols.map((c) => {
      const val = c.accessor(row);
      const str = String(val);
      // Escape values that contain commas, quotes, or newlines
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
