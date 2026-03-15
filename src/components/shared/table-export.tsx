"use client";

import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV, type Column } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl, type PDFColumn } from "@/lib/export/pdf";
import {
  ExportDialog,
  type ExportColumnDef,
  type ExportConfig,
} from "@/components/shared/export-dialog";

interface TableExportProps<T> {
  items: T[];
  csvColumns: Column<T>[];
  pdfColumns: PDFColumn[];
  pdfRows: Record<string, string | number>[];
  exportColumns: ExportColumnDef[];
  groupOptions?: { value: string; label: string }[];
  defaultTitle: string;
}

export function TableExport<T>({
  items,
  csvColumns,
  pdfColumns,
  pdfRows,
  exportColumns,
  groupOptions,
  defaultTitle,
}: TableExportProps<T>) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(items, csvColumns, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(items, csvColumns, filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: pdfColumns,
        rows: pdfRows,
        orientation: config.orientation,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
      });
    }
  };

  const handlePreview = (config: ExportConfig) =>
    generatePDFBlobUrl({
      title: config.title,
      filename: "preview",
      company: profile,
      columns: pdfColumns,
      rows: pdfRows,
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={exportColumns}
      groupOptions={groupOptions}
      defaultTitle={defaultTitle}
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={items.length === 0}
      recordCount={items.length}
    />
  );
}
