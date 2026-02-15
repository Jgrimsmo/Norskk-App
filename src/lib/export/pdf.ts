/**
 * PDF report generator using jsPDF + jspdf-autotable.
 *
 * Creates professional, branded reports suitable for client billing.
 */

import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import type { CompanyProfile } from "@/lib/types/time-tracking";

// ── Colour palette ──
const COLORS = {
  primary: [54, 69, 130] as [number, number, number], // deep blue
  primaryLight: [230, 234, 245] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [220, 220, 220] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  tableHeader: [54, 69, 130] as [number, number, number],
  tableHeaderText: [255, 255, 255] as [number, number, number],
  tableAltRow: [245, 247, 252] as [number, number, number],
};

export interface PDFColumn {
  header: string;
  dataKey: string;
  width?: number;
  halign?: "left" | "center" | "right";
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  company?: CompanyProfile | null;
  orientation?: "portrait" | "landscape";
  columns?: PDFColumn[];
  rows?: Record<string, string | number>[];
  /** Custom render callback — receives the doc after the header is drawn */
  customRender?: (doc: jsPDF, startY: number) => void;
  dateRange?: string;
  footerNote?: string;
  /** Which column dataKeys to include (undefined = all) */
  selectedColumns?: string[];
  /** Group by a specific dataKey field */
  groupBy?: string;
}

/**
 * Generate and download a professional PDF report.
 */
export async function generatePDF(options: PDFReportOptions) {
  const {
    title,
    subtitle,
    filename,
    company,
    orientation = "portrait",
    columns: allColumns,
    rows,
    customRender,
    dateRange,
    footerNote,
    selectedColumns,
    groupBy,
  } = options;

  // Filter columns based on selection
  const columns = allColumns && selectedColumns
    ? allColumns.filter((c) => selectedColumns.includes(c.dataKey))
    : allColumns;

  const doc = new jsPDF({ orientation, unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let y = margin;

  // ── Company logo + header ──
  y = await drawHeader(doc, company, pageWidth, margin, y);

  // ── Report title bar ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), margin + 4, y + 7);

  if (dateRange) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(dateRange, pageWidth - margin - 4, y + 7, { align: "right" });
  }

  y += 14;

  if (subtitle) {
    doc.setTextColor(...COLORS.gray);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(subtitle, margin, y);
    y += 6;
  }

  // ── Table or custom content ──
  if (customRender) {
    customRender(doc, y);
  } else if (columns && rows) {
    // Determine if we should group the rows
    if (groupBy && groupBy !== "none") {
      const groupCol = columns.find((c) => c.dataKey === groupBy);
      const groups = new Map<string, Record<string, string | number>[]>();
      rows.forEach((row) => {
        const key = String(row[groupBy] ?? "Other");
        const arr = groups.get(key) || [];
        arr.push(row);
        groups.set(key, arr);
      });

      // Remove the grouped column from table columns to avoid duplication
      const tableCols = columns.filter((c) => c.dataKey !== groupBy);

      groups.forEach((groupRows, groupKey) => {
        const groupLabel = groupCol ? `${groupCol.header}: ${groupKey}` : groupKey;

        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [
            [
              {
                content: `${groupLabel}  (${groupRows.length} records)`,
                colSpan: tableCols.length,
                styles: {
                  fillColor: COLORS.primary,
                  textColor: COLORS.white,
                  fontStyle: "bold",
                  fontSize: 8,
                  cellPadding: 2.5,
                },
              },
            ],
            tableCols.map((c) => c.header),
          ],
          body: groupRows.map((row) =>
            tableCols.map((c) => String(row[c.dataKey] ?? ""))
          ),
          headStyles: {
            fillColor: [75, 90, 150],
            textColor: COLORS.tableHeaderText,
            fontStyle: "bold",
            fontSize: 7.5,
            cellPadding: 2,
            halign: "left",
          },
          bodyStyles: {
            fontSize: 7.5,
            cellPadding: 2,
            textColor: COLORS.dark,
          },
          alternateRowStyles: {
            fillColor: COLORS.tableAltRow,
          },
          columnStyles: Object.fromEntries(
            tableCols.map((c, i) => [
              i,
              {
                cellWidth: c.width || "auto",
                halign: c.halign || "left",
              },
            ])
          ),
          styles: {
            lineColor: COLORS.lightGray,
            lineWidth: 0.2,
            overflow: "linebreak",
          },
          didDrawPage: (data) => {
            drawFooter(doc, company, footerNote, pageWidth, pageHeight);
            if (data.pageNumber > 1) {
              doc.setFillColor(...COLORS.primary);
              doc.rect(margin, 10, pageWidth - margin * 2, 7, "F");
              doc.setTextColor(...COLORS.white);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.text(`${title} (continued)`, margin + 3, 15);
            }
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 4;
      });
    } else {
      // No grouping — flat table
      const tableOptions: UserOptions = {
        startY: y,
        margin: { left: margin, right: margin },
        head: [columns.map((c) => c.header)],
        body: rows.map((row) => columns.map((c) => String(row[c.dataKey] ?? ""))),
        headStyles: {
          fillColor: COLORS.tableHeader,
          textColor: COLORS.tableHeaderText,
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 3,
          halign: "left",
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: COLORS.dark,
        },
        alternateRowStyles: {
          fillColor: COLORS.tableAltRow,
        },
        columnStyles: Object.fromEntries(
          columns
            .map((c, i) => [
              i,
              {
                cellWidth: c.width || "auto",
                halign: c.halign || "left",
              },
            ])
        ),
        styles: {
          lineColor: COLORS.lightGray,
          lineWidth: 0.25,
          overflow: "linebreak",
        },
        tableLineColor: COLORS.lightGray,
        tableLineWidth: 0.25,
        didDrawPage: (data) => {
          drawFooter(doc, company, footerNote, pageWidth, pageHeight);
          if (data.pageNumber > 1) {
            doc.setFillColor(...COLORS.primary);
            doc.rect(margin, 10, pageWidth - margin * 2, 7, "F");
            doc.setTextColor(...COLORS.white);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(`${title} (continued)`, margin + 3, 15);
          }
        },
      };

      autoTable(doc, tableOptions);
    }
  }

  // ── Footer on last page ──
  drawFooter(doc, company, footerNote, pageWidth, pageHeight);

  doc.save(`${filename}.pdf`);
}

// ── Header with optional logo ──
async function drawHeader(
  doc: jsPDF,
  company: CompanyProfile | null | undefined,
  pageWidth: number,
  margin: number,
  y: number
): Promise<number> {
  const headerRight = pageWidth - margin;

  // Logo
  if (company?.logoUrl) {
    try {
      const img = await loadImage(company.logoUrl);
      const maxH = 16;
      const ratio = img.width / img.height;
      const w = maxH * ratio;
      doc.addImage(img, "PNG", margin, y, Math.min(w, 40), maxH);
      y += 2; // offset text below logo top
    } catch {
      // Logo failed to load — skip
    }
  }

  // Company name
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const name = company?.name || "Norskk";
  doc.text(name, company?.logoUrl ? margin + 44 : margin, y + 6);

  // Company details on the right
  if (company) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.gray);
    const lines: string[] = [];
    if (company.address) lines.push(company.address);
    const cityLine = [company.city, company.province, company.postalCode]
      .filter(Boolean)
      .join(", ");
    if (cityLine) lines.push(cityLine);
    if (company.phone) lines.push(company.phone);
    if (company.email) lines.push(company.email);

    lines.forEach((line, i) => {
      doc.text(line, headerRight, y + 2 + i * 3.5, { align: "right" });
    });
  }

  y += 20;

  // Divider line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, headerRight, y);
  y += 4;

  return y;
}

// ── Footer ──
function drawFooter(
  doc: jsPDF,
  company: CompanyProfile | null | undefined,
  footerNote: string | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const margin = 15;
  const footerY = pageHeight - 12;

  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.25);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setTextColor(...COLORS.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  const left = footerNote || `${company?.name || "Norskk"} — Confidential`;
  doc.text(left, margin, footerY);

  const date = new Date().toLocaleDateString("en-CA");
  const pageNum = `Generated ${date}  •  Page ${(doc as any).getCurrentPageInfo().pageNumber}`;
  doc.text(pageNum, pageWidth - margin, footerY, { align: "right" });
}

// ── Load image from URL to data URL ──
function loadImage(
  url: string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
