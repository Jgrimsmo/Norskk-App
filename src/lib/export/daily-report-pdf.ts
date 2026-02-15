/**
 * Professional Daily Report PDF — single report detail view.
 *
 * Produces a multi-section report suitable for sending to clients showing
 * all daily report details: weather, manpower, equipment, work performed,
 * delays, material deliveries, visitors, and notes.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { capitalize } from "@/lib/utils/lookup";
import type {
  DailyReport,
  Employee,
  Project,
  Equipment,
  CompanyProfile,
} from "@/lib/types/time-tracking";

const C = {
  primary: [54, 69, 130] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [220, 220, 220] as [number, number, number],
  altRow: [245, 247, 252] as [number, number, number],
  sectionBg: [240, 242, 250] as [number, number, number],
};

interface DailyReportPDFOptions {
  report: DailyReport;
  employees: Employee[];
  projects: Project[];
  equipment: Equipment[];
  company?: CompanyProfile | null;
  filename?: string;
}

export async function generateDailyReportPDF(opts: DailyReportPDFOptions) {
  const {
    report,
    employees,
    projects,
    equipment,
    company,
    filename,
  } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const project = projects.find((p) => p.id === report.projectId);
  const author = employees.find((e) => e.id === report.authorId);
  const projectLabel = project?.name || report.projectId;
  const reportFilename = filename || `daily-report-${report.reportNumber}-${report.date}`;

  // ── Header ──
  y = await drawHeader(doc, company, pageWidth, margin, y);

  // ── Title bar ──
  doc.setFillColor(...C.primary);
  doc.rect(margin, y, contentWidth, 10, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`DAILY REPORT #${report.reportNumber}`, margin + 4, y + 7);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(report.date, pageWidth - margin - 4, y + 7, { align: "right" });
  y += 14;

  // ── Project / Author info ──
  const infoRows = [
    ["Project:", projectLabel],
    ["Author:", author?.name || report.authorId],
    ["Status:", capitalize(report.status)],
    ["Date:", report.date],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: infoRows,
    theme: "plain",
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30, textColor: C.gray, fontSize: 8 },
      1: { textColor: C.dark, fontSize: 8 },
    },
    styles: { cellPadding: 1.5 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  // ── 1. Weather ──
  y = sectionHeader(doc, "1. WEATHER CONDITIONS", margin, contentWidth, y);

  const w = report.weather;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ["Temperature", w.temperature],
      ["Conditions", w.conditions.join(", ")],
      ["Wind Speed", w.windSpeed || "—"],
      ["Precipitation", w.precipitation || "—"],
      ["Ground", w.groundConditions || "—"],
      ["Weather Delay", w.weatherDelay ? `Yes (${w.delayHours} hrs)` : "No"],
    ],
    theme: "grid",
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, textColor: C.gray, fontSize: 7.5 },
      1: { textColor: C.dark, fontSize: 7.5 },
    },
    styles: { cellPadding: 2, lineColor: C.lightGray, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: C.altRow },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  // ── 2. Manpower ──
  if (report.manpower.length > 0) {
    y = checkPageBreak(doc, y, 30, pageHeight, margin);
    y = sectionHeader(doc, "2. MANPOWER", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Company", "Trade", "Headcount", "Hours", "Overtime", "Foreman", "Description"]],
      body: report.manpower.map((m) => [
        m.company,
        m.trade,
        String(m.headcount),
        String(m.hoursWorked),
        String(m.overtimeHours),
        m.foremanName,
        m.workDescription || "",
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.dark },
      alternateRowStyles: { fillColor: C.altRow },
      styles: { lineColor: C.lightGray, lineWidth: 0.2 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 3. Equipment Log ──
  if (report.equipmentLog.length > 0) {
    y = checkPageBreak(doc, y, 30, pageHeight, margin);
    y = sectionHeader(doc, "3. EQUIPMENT", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Equipment", "Hours Used", "Idle Hours", "Operator", "Notes"]],
      body: report.equipmentLog.map((e) => {
        const eq = equipment.find((x) => x.id === e.equipmentId);
        return [
          eq?.name || e.equipmentId,
          String(e.hoursUsed),
          String(e.idleHours),
          e.operatorName || "—",
          e.notes || "",
        ];
      }),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.dark },
      alternateRowStyles: { fillColor: C.altRow },
      styles: { lineColor: C.lightGray, lineWidth: 0.2 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 4. Work Performed ──
  if (report.workPerformed.length > 0) {
    y = checkPageBreak(doc, y, 30, pageHeight, margin);
    y = sectionHeader(doc, "4. WORK PERFORMED", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Description", "Location", "Trade", "Status", "% Complete", "Notes"]],
      body: report.workPerformed.map((w) => [
        w.description,
        w.location || "—",
        w.trade || "—",
        w.status,
        `${w.percentComplete}%`,
        w.notes || "",
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.dark },
      alternateRowStyles: { fillColor: C.altRow },
      styles: { lineColor: C.lightGray, lineWidth: 0.2, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 45 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 5. Delays ──
  if (report.delays.length > 0) {
    y = checkPageBreak(doc, y, 30, pageHeight, margin);
    y = sectionHeader(doc, "5. DELAYS", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Type", "Description", "Duration (hrs)", "Responsible Party", "Schedule Impact"]],
      body: report.delays.map((d) => [
        d.delayType,
        d.description,
        String(d.durationHours),
        d.responsibleParty || "—",
        d.scheduleImpact ? "Yes" : "No",
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.dark },
      alternateRowStyles: { fillColor: C.altRow },
      styles: { lineColor: C.lightGray, lineWidth: 0.2, overflow: "linebreak" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 6. Material Deliveries ──
  if (report.materialDeliveries.length > 0) {
    y = checkPageBreak(doc, y, 30, pageHeight, margin);
    y = sectionHeader(doc, "6. MATERIAL DELIVERIES", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Description", "Supplier", "Qty", "PO #", "Ticket #", "Received By", "Condition"]],
      body: report.materialDeliveries.map((m) => [
        m.description,
        m.supplier || "—",
        m.quantity || "—",
        m.poNumber || "—",
        m.deliveryTicket || "—",
        m.receivedBy || "—",
        m.condition,
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.dark },
      alternateRowStyles: { fillColor: C.altRow },
      styles: { lineColor: C.lightGray, lineWidth: 0.2 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 7. Visitors ──
  if (report.visitors.length > 0) {
    y = checkPageBreak(doc, y, 30, pageHeight, margin);
    y = sectionHeader(doc, "7. VISITORS", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Name", "Company", "Purpose", "Time In", "Time Out"]],
      body: report.visitors.map((v) => [
        v.name,
        v.company || "—",
        v.purpose || "—",
        v.timeIn || "—",
        v.timeOut || "—",
      ]),
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
      bodyStyles: { fontSize: 7, cellPadding: 2, textColor: C.dark },
      alternateRowStyles: { fillColor: C.altRow },
      styles: { lineColor: C.lightGray, lineWidth: 0.2 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 8. Notes ──
  const notes = [
    { label: "Safety Notes", value: report.safetyNotes },
    { label: "General Notes", value: report.generalNotes },
    { label: "Next Day Plan", value: report.nextDayPlan },
  ].filter((n) => n.value);

  if (notes.length > 0) {
    y = checkPageBreak(doc, y, 25, pageHeight, margin);
    y = sectionHeader(doc, "8. NOTES", margin, contentWidth, y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: notes.map((n) => [n.label, n.value]),
      theme: "grid",
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 35, textColor: C.gray, fontSize: 7.5 },
        1: { textColor: C.dark, fontSize: 7.5 },
      },
      styles: { cellPadding: 2.5, lineColor: C.lightGray, lineWidth: 0.2, overflow: "linebreak" },
    });
  }

  // ── Footer on all pages ──
  const totalPages = (doc as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, company, pageWidth, pageHeight, margin);
  }

  doc.save(`${reportFilename}.pdf`);
}

// ── Helpers ──

function sectionHeader(
  doc: jsPDF,
  title: string,
  margin: number,
  width: number,
  y: number
): number {
  doc.setFillColor(...C.sectionBg);
  doc.rect(margin, y, width, 7, "F");
  doc.setTextColor(...C.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, margin + 3, y + 5);
  return y + 9;
}

function checkPageBreak(
  doc: jsPDF,
  y: number,
  needed: number,
  pageHeight: number,
  margin: number
): number {
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawFooter(
  doc: jsPDF,
  company: CompanyProfile | null | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  const fy = pageHeight - 10;
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.2);
  doc.line(margin, fy - 2, pageWidth - margin, fy - 2);
  doc.setTextColor(...C.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`${company?.name || "Norskk"} — Confidential`, margin, fy);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-CA")}  •  Page ${(doc as any).getCurrentPageInfo().pageNumber} of ${(doc as any).getNumberOfPages()}`,
    pageWidth - margin,
    fy,
    { align: "right" }
  );
}

async function drawHeader(
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

  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(company?.name || "Norskk", company?.logoUrl ? margin + 38 : margin, y + 5);

  if (company) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    const info = [
      company.address,
      [company.city, company.province, company.postalCode].filter(Boolean).join(", "),
      company.phone,
      company.email,
    ].filter(Boolean);
    info.forEach((line, i) => {
      doc.text(line, pageWidth - margin, y + 2 + i * 3, { align: "right" });
    });
  }

  y += 17;
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;
  return y;
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
