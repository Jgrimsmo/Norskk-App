/**
 * Professional Time Tracking PDF report for client billing.
 *
 * Groups time entries by project with subtotals, total hours,
 * and a summary section at the top.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { capitalize } from "@/lib/utils/lookup";
import type {
  TimeEntry,
  Employee,
  Project,
  CostCode,
  CompanyProfile,
} from "@/lib/types/time-tracking";

const COLORS = {
  primary: [54, 69, 130] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [220, 220, 220] as [number, number, number],
  altRow: [245, 247, 252] as [number, number, number],
  subtotal: [235, 238, 248] as [number, number, number],
};

interface TimeReportOptions {
  entries: TimeEntry[];
  employees: Employee[];
  projects: Project[];
  costCodes: CostCode[];
  company?: CompanyProfile | null;
  dateRange?: string;
  filename?: string;
  /** Which column keys to include (undefined = all) */
  selectedColumns?: string[];
  /** Group by field: "project" | "employee" | "date" | "costCode" | "none" */
  groupBy?: string;
  /** Report title override */
  title?: string;
  /** PDF orientation override */
  orientation?: "portrait" | "landscape";
}

export async function buildTimeTrackingReportDoc(opts: TimeReportOptions): Promise<jsPDF> {
  const {
    entries,
    employees,
    projects,
    costCodes,
    company,
    dateRange,
    selectedColumns,
    groupBy = "project",
    title: reportTitle = "TIME TRACKING REPORT",
    orientation = "landscape",
  } = opts;

  // Column definitions keyed by id
  const allColumnDefs: { id: string; header: string; width: number; halign?: "left" | "right" }[] = [
    { id: "date", header: "Date", width: 22 },
    { id: "employee", header: "Employee", width: 32 },
    { id: "project", header: "Project", width: 40 },
    { id: "costCode", header: "Cost Code", width: 45 },
    { id: "workType", header: "Work Type", width: 20 },
    { id: "hours", header: "Hours", width: 16, halign: "right" },
    { id: "approval", header: "Status", width: 18 },
    { id: "equipment", header: "Equipment", width: 30 },
    { id: "attachment", header: "Attachment", width: 30 },
    { id: "tool", header: "Tool", width: 30 },
    { id: "notes", header: "Notes", width: 0 },
  ];

  // Filter columns based on selection
  const activeCols = selectedColumns
    ? allColumnDefs.filter((c) => selectedColumns.includes(c.id))
    : allColumnDefs.filter((c) => ["date", "employee", "costCode", "workType", "hours", "approval", "notes"].includes(c.id));

  const doc = new jsPDF({ orientation, unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  let y = margin;

  // ── Header ──
  y = await drawCompanyHeader(doc, company, pageWidth, margin, y);

  // ── Title bar ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, pageWidth - margin * 2, 9, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(reportTitle.toUpperCase(), margin + 4, y + 6.5);

  if (dateRange) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(dateRange, pageWidth - margin - 4, y + 6.5, { align: "right" });
  }
  y += 13;

  // ── Summary box ──
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const uniqueProjects = new Set(entries.map((e) => e.projectId)).size;
  const uniqueEmployees = new Set(entries.map((e) => e.employeeId)).size;
  const approvedEntries = entries.filter((e) => e.approval === "approved").length;

  doc.setFillColor(245, 247, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, "F");

  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");

  const stats = [
    { label: "Total Entries", value: String(entries.length) },
    { label: "Total Hours", value: totalHours.toFixed(1) },
    { label: "Projects", value: String(uniqueProjects) },
    { label: "Employees", value: String(uniqueEmployees) },
    { label: "Approved", value: `${approvedEntries}/${entries.length}` },
  ];

  const statWidth = (pageWidth - margin * 2) / stats.length;
  stats.forEach((stat, i) => {
    const x = margin + statWidth * i + statWidth / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(stat.label, x, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text(stat.value, x, y + 11, { align: "center" });
    doc.setTextColor(...COLORS.gray);
  });

  y += 18;

  // ── Resolve display values for a single entry ──
  function resolveEntry(e: TimeEntry): Record<string, string> {
    const emp = employees.find((x) => x.id === e.employeeId);
    const proj = projects.find((x) => x.id === e.projectId);
    const cc = costCodes.find((x) => x.id === e.costCodeId);
    return {
      date: e.date,
      employee: emp?.name || e.employeeId,
      project: proj?.name || e.projectId,
      costCode: cc?.description || e.costCodeId,
      workType: e.workType === "lump-sum" ? "Lump Sum" : "T&M",
      hours: e.hours.toFixed(1),
      approval: capitalize(e.approval),
      equipment: e.equipmentId || "",
      attachment: e.attachmentId || "",
      tool: e.toolId || "",
      notes: e.notes || "",
    };
  }

  // ── Determine grouping ──
  type GroupKeyFn = (e: TimeEntry) => string;
  type GroupLabelFn = (key: string) => string;

  let groupKeyFn: GroupKeyFn;
  let groupLabelFn: GroupLabelFn;

  switch (groupBy) {
    case "employee":
      groupKeyFn = (e) => e.employeeId;
      groupLabelFn = (key) => {
        const emp = employees.find((x) => x.id === key);
        return emp?.name || key;
      };
      break;
    case "date":
      groupKeyFn = (e) => e.date;
      groupLabelFn = (key) => key;
      break;
    case "costCode":
      groupKeyFn = (e) => e.costCodeId;
      groupLabelFn = (key) => {
        const cc = costCodes.find((x) => x.id === key);
        return cc?.description || key;
      };
      break;
    case "none":
      // No grouping — single flat table
      groupKeyFn = () => "__all__";
      groupLabelFn = () => "";
      break;
    default: // "project"
      groupKeyFn = (e) => e.projectId;
      groupLabelFn = (key) => {
        const p = projects.find((x) => x.id === key);
        return p?.name || key;
      };
      break;
  }

  // Group entries
  const groups = new Map<string, TimeEntry[]>();
  entries.forEach((e) => {
    const key = groupKeyFn(e);
    const arr = groups.get(key) || [];
    arr.push(e);
    groups.set(key, arr);
  });

  const isGrouped = groupBy !== "none";
  const headers = activeCols.map((c) => c.header);
  const hoursColIdx = activeCols.findIndex((c) => c.id === "hours");

  groups.forEach((groupEntries, groupKey) => {
    const groupLabel = groupLabelFn(groupKey);
    const groupHours = groupEntries.reduce((s, e) => s + e.hours, 0);

    // Build table rows
    const rows = groupEntries.map((e) => {
      const resolved = resolveEntry(e);
      return activeCols.map((c) => resolved[c.id] ?? "");
    });

    // Add subtotal row if grouped
    if (isGrouped) {
      const subtotalRow = activeCols.map((c, i) => {
        if (c.id === "hours") return groupHours.toFixed(1);
        if (i === Math.max(0, (hoursColIdx > 0 ? hoursColIdx - 1 : 0))) return "SUBTOTAL";
        return "";
      });
      rows.push(subtotalRow);
    }

    // Build head rows
    const headRows: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = [];
    if (isGrouped && groupLabel) {
      headRows.push([
        {
          content: `${groupLabel}  •  ${groupHours.toFixed(1)} hrs`,
          colSpan: activeCols.length,
          styles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: "bold",
            fontSize: 8,
            cellPadding: 2.5,
          },
        },
      ]);
    }
    headRows.push(headers);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: headRows,
      body: rows,
      headStyles: {
        fillColor: isGrouped ? [75, 90, 150] : COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: COLORS.dark,
      },
      alternateRowStyles: {
        fillColor: COLORS.altRow,
      },
      columnStyles: Object.fromEntries(
        activeCols.map((c, i) => [
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
      didParseCell: (data) => {
        if (
          isGrouped &&
          data.section === "body" &&
          data.row.index === rows.length - 1
        ) {
          data.cell.styles.fillColor = COLORS.subtotal;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 7.5;
        }
      },
      didDrawPage: () => {
        drawPageFooter(doc, company, pageWidth, pageHeight);
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  });

  // ── Grand total ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GRAND TOTAL", margin + 4, y + 5.5);
  doc.text(`${totalHours.toFixed(1)} Hours`, pageWidth - margin - 4, y + 5.5, {
    align: "right",
  });

  // ── Footer ──
  drawPageFooter(doc, company, pageWidth, pageHeight);

  return doc;
}

/**
 * Generate and download a time tracking PDF report.
 */
export async function generateTimeTrackingReport(opts: TimeReportOptions) {
  const doc = await buildTimeTrackingReportDoc(opts);
  const filename = opts.filename || "time-tracking-report";
  doc.save(`${filename}.pdf`);
}

/**
 * Generate a time tracking PDF and return a blob URL for preview.
 */
export async function generateTimeTrackingReportBlobUrl(opts: TimeReportOptions): Promise<string> {
  const doc = await buildTimeTrackingReportDoc(opts);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

// ── Company header ──
async function drawCompanyHeader(
  doc: jsPDF,
  company: CompanyProfile | null | undefined,
  pageWidth: number,
  margin: number,
  y: number
): Promise<number> {
  if (company?.logoUrl) {
    try {
      const img = await loadImage(company.logoUrl);
      const maxH = 14;
      const ratio = img.width / img.height;
      doc.addImage(img, "PNG", margin, y, Math.min(maxH * ratio, 35), maxH);
      y += 1;
    } catch {
      /* skip */
    }
  }

  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(company?.name || "Norskk", company?.logoUrl ? margin + 38 : margin, y + 5);

  if (company) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray);
    const info = [company.address, [company.city, company.province, company.postalCode].filter(Boolean).join(", "), company.phone, company.email].filter(Boolean);
    info.forEach((line, i) => {
      doc.text(line, pageWidth - margin, y + 2 + i * 3, { align: "right" });
    });
  }

  y += 17;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;
  return y;
}

function drawPageFooter(
  doc: jsPDF,
  company: CompanyProfile | null | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const margin = 12;
  const fy = pageHeight - 8;
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.2);
  doc.line(margin, fy - 2, pageWidth - margin, fy - 2);
  doc.setTextColor(...COLORS.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`${company?.name || "Norskk"} — Confidential`, margin, fy);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-CA")}  •  Page ${(doc as any).getCurrentPageInfo().pageNumber}`,
    pageWidth - margin,
    fy,
    { align: "right" }
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
