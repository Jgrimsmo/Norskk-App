/**
 * Export column definitions for each table.
 *
 * Each set of columns defines:
 * - headers for CSV/Excel
 * - data accessors that resolve IDs to names using lookup arrays
 * - PDF column widths
 */

import type {
  TimeEntry,
  Employee,
  Project,
  Equipment,
  Attachment,
  Tool,
  CostCode,
  SafetyForm,
  DailyReport,
} from "@/lib/types/time-tracking";
import type { Column } from "./csv";
import type { PDFColumn } from "./pdf";
import { capitalize } from "@/lib/utils/lookup";

// ── Helpers ──
function lookup<T extends { id: string; name: string }>(
  id: string,
  arr: T[]
): string {
  return arr.find((x) => x.id === id)?.name || id;
}

// ── Time Entries ──
export function timeEntryColumns(
  employees: Employee[],
  projects: Project[],
  costCodes: CostCode[],
  equipment: Equipment[],
  attachments: Attachment[],
  tools: Tool[]
): { csv: Column<TimeEntry>[]; pdf: PDFColumn[] } {
  const csv: Column<TimeEntry>[] = [
    { id: "date", header: "Date", accessor: (r) => r.date },
    { id: "employee", header: "Employee", accessor: (r) => lookup(r.employeeId, employees) },
    {
      id: "project",
      header: "Project",
      accessor: (r) => {
        const p = projects.find((x) => x.id === r.projectId);
        return p?.name || r.projectId;
      },
    },
    {
      id: "costCode",
      header: "Cost Code",
      accessor: (r) => {
        const cc = costCodes.find((x) => x.id === r.costCodeId);
        return cc?.description || r.costCodeId;
      },
    },
    {
      id: "equipment",
      header: "Equipment",
      accessor: (r) => {
        const e = equipment.find((x) => x.id === r.equipmentId);
        return e?.name || r.equipmentId || "";
      },
    },
    {
      id: "attachment",
      header: "Attachment",
      accessor: (r) => {
        const a = attachments.find((x) => x.id === r.attachmentId);
        return a?.name || r.attachmentId || "";
      },
    },
    {
      id: "tool",
      header: "Tool",
      accessor: (r) => {
        const t = tools.find((x) => x.id === r.toolId);
        return t?.name || r.toolId || "";
      },
    },
    {
      id: "workType",
      header: "Work Type",
      accessor: (r) =>
        r.workType === "lump-sum" ? "Lump Sum" : "T&M",
    },
    { id: "hours", header: "Hours", accessor: (r) => r.hours },
    { id: "notes", header: "Notes", accessor: (r) => r.notes || "" },
    {
      id: "approval",
      header: "Approval",
      accessor: (r) =>
        capitalize(r.approval),
    },
  ];

  const pdf: PDFColumn[] = [
    { header: "Date", dataKey: "date", width: 22 },
    { header: "Employee", dataKey: "employee", width: 28 },
    { header: "Project", dataKey: "project", width: 34 },
    { header: "Cost Code", dataKey: "costCode", width: 30 },
    { header: "Type", dataKey: "workType", width: 16 },
    { header: "Hours", dataKey: "hours", width: 14, halign: "right" },
    { header: "Approval", dataKey: "approval", width: 18 },
    { header: "Notes", dataKey: "notes" },
  ];

  return { csv, pdf };
}

export function timeEntryPDFRows(
  entries: TimeEntry[],
  employees: Employee[],
  projects: Project[],
  costCodes: CostCode[]
): Record<string, string | number>[] {
  return entries.map((r) => ({
    date: r.date,
    employee: lookup(r.employeeId, employees),
    project: (() => {
      const p = projects.find((x) => x.id === r.projectId);
      return p?.name || r.projectId;
    })(),
    costCode: (() => {
      const cc = costCodes.find((x) => x.id === r.costCodeId);
      return cc?.description || r.costCodeId;
    })(),
    workType: r.workType === "lump-sum" ? "Lump Sum" : "T&M",
    hours: r.hours,
    approval: capitalize(r.approval),
    notes: r.notes || "",
  }));
}

// ── Employees ──
export const employeeCSVColumns: Column<Employee>[] = [
  { id: "name", header: "Name", accessor: (r) => r.name },
  { id: "role", header: "Role", accessor: (r) => r.role },
  { id: "phone", header: "Phone", accessor: (r) => r.phone || "" },
  { id: "email", header: "Email", accessor: (r) => r.email || "" },
  { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
];

export const employeePDFColumns: PDFColumn[] = [
  { header: "Name", dataKey: "name", width: 45 },
  { header: "Role", dataKey: "role", width: 35 },
  { header: "Phone", dataKey: "phone", width: 35 },
  { header: "Email", dataKey: "email", width: 50 },
  { header: "Status", dataKey: "status", width: 20 },
];

export function employeePDFRows(data: Employee[]): Record<string, string | number>[] {
  return data.map((r) => ({
    name: r.name,
    role: r.role,
    phone: r.phone || "",
    email: r.email || "",
    status: capitalize(r.status),
  }));
}

// ── Projects ──
export function projectCSVColumns(costCodes: CostCode[]): Column<Project>[] {
  return [
    { id: "number", header: "Number", accessor: (r) => r.number },
    { id: "name", header: "Name", accessor: (r) => r.name },
    { id: "developer", header: "Developer", accessor: (r) => r.developer || "" },
    { id: "address", header: "Address", accessor: (r) => r.address || "" },
    { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
    {
      id: "costCodes",
      header: "Cost Codes",
      accessor: (r) =>
        r.costCodeIds
          .map((id) => costCodes.find((cc) => cc.id === id)?.code)
          .filter(Boolean)
          .join(", "),
    },
  ];
}

export const projectPDFColumns: PDFColumn[] = [
  { header: "Number", dataKey: "number", width: 22 },
  { header: "Name", dataKey: "name", width: 45 },
  { header: "Developer", dataKey: "developer", width: 35 },
  { header: "Address", dataKey: "address", width: 40 },
  { header: "Status", dataKey: "status", width: 22 },
  { header: "Cost Codes", dataKey: "costCodes" },
];

export function projectPDFRows(data: Project[], costCodes: CostCode[]): Record<string, string | number>[] {
  return data.map((r) => ({
    number: r.number,
    name: r.name,
    developer: r.developer || "",
    address: r.address || "",
    status: capitalize(r.status),
    costCodes: r.costCodeIds
      .map((id) => costCodes.find((cc) => cc.id === id)?.code)
      .filter(Boolean)
      .join(", "),
  }));
}

// ── Equipment ──
export const equipmentCSVColumns: Column<Equipment>[] = [
  { id: "number", header: "Number", accessor: (r) => r.number },
  { id: "name", header: "Name", accessor: (r) => r.name },
  { id: "category", header: "Category", accessor: (r) => r.category },
  { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
];

export const equipmentPDFColumns: PDFColumn[] = [
  { header: "Number", dataKey: "number", width: 30 },
  { header: "Name", dataKey: "name", width: 55 },
  { header: "Category", dataKey: "category", width: 45 },
  { header: "Status", dataKey: "status", width: 30 },
];

export function equipmentPDFRows(data: Equipment[]): Record<string, string | number>[] {
  return data.map((r) => ({
    number: r.number,
    name: r.name,
    category: r.category,
    status: capitalize(r.status),
  }));
}

// ── Attachments ──
export const attachmentCSVColumns: Column<Attachment>[] = [
  { id: "number", header: "Number", accessor: (r) => r.number },
  { id: "name", header: "Name", accessor: (r) => r.name },
  { id: "category", header: "Category", accessor: (r) => r.category },
  { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
];

export const attachmentPDFColumns: PDFColumn[] = [
  { header: "Number", dataKey: "number", width: 30 },
  { header: "Name", dataKey: "name", width: 55 },
  { header: "Category", dataKey: "category", width: 45 },
  { header: "Status", dataKey: "status", width: 30 },
];

export function attachmentPDFRows(data: Attachment[]): Record<string, string | number>[] {
  return data.map((r) => ({
    number: r.number,
    name: r.name,
    category: r.category,
    status: capitalize(r.status),
  }));
}

// ── Tools ──
export const toolCSVColumns: Column<Tool>[] = [
  { id: "number", header: "Number", accessor: (r) => r.number },
  { id: "name", header: "Name", accessor: (r) => r.name },
  { id: "category", header: "Category", accessor: (r) => r.category },
  { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
];

export const toolPDFColumns: PDFColumn[] = [
  { header: "Number", dataKey: "number", width: 30 },
  { header: "Name", dataKey: "name", width: 55 },
  { header: "Category", dataKey: "category", width: 45 },
  { header: "Status", dataKey: "status", width: 30 },
];

export function toolPDFRows(data: Tool[]): Record<string, string | number>[] {
  return data.map((r) => ({
    number: r.number,
    name: r.name,
    category: r.category,
    status: capitalize(r.status),
  }));
}

// ── Safety Forms ──
export function safetyFormCSVColumns(
  employees: Employee[],
  projects: Project[]
): Column<SafetyForm>[] {
  return [
    { id: "date", header: "Date", accessor: (r) => r.date },
    { id: "type", header: "Type", accessor: (r) => r.formType.toUpperCase().replace("-", " ") },
    {
      id: "project",
      header: "Project",
      accessor: (r) => {
        const p = projects.find((x) => x.id === r.projectId);
        return p?.name || r.projectId;
      },
    },
    { id: "submittedBy", header: "Submitted By", accessor: (r) => lookup(r.submittedById, employees) },
    { id: "title", header: "Title", accessor: (r) => r.title || "" },
    { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
  ];
}

export const safetyFormPDFColumns: PDFColumn[] = [
  { header: "Date", dataKey: "date", width: 22 },
  { header: "Type", dataKey: "type", width: 25 },
  { header: "Project", dataKey: "project", width: 40 },
  { header: "Submitted By", dataKey: "submittedBy", width: 30 },
  { header: "Title", dataKey: "title" },
  { header: "Status", dataKey: "status", width: 20 },
];

export function safetyFormPDFRows(
  data: SafetyForm[],
  employees: Employee[],
  projects: Project[]
): Record<string, string | number>[] {
  return data.map((r) => ({
    date: r.date,
    type: r.formType.toUpperCase().replace("-", " "),
    project: (() => {
      const p = projects.find((x) => x.id === r.projectId);
      return p?.name || r.projectId;
    })(),
    submittedBy: lookup(r.submittedById, employees),
    title: r.title || "",
    status: capitalize(r.status),
  }));
}

// -- Daily Reports --
export function dailyReportCSVColumns(
  employees: Employee[],
  projects: Project[]
): Column<DailyReport>[] {
  return [
    { id: "date", header: "Date", accessor: (r) => r.date },
    { id: "time", header: "Time", accessor: (r) => r.time || "" },
    {
      id: "project",
      header: "Project",
      accessor: (r) => {
        const p = projects.find((x) => x.id === r.projectId);
        return p?.name || r.projectId;
      },
    },
    { id: "author", header: "Author", accessor: (r) => lookup(r.authorId, employees) },
    {
      id: "weather",
      header: "Weather",
      accessor: (r) =>
        `${r.weather.conditions.join(", ")} ${r.weather.temperature}`,
    },
    {
      id: "staff",
      header: "Staff",
      accessor: (r) => (r.onSiteStaff ?? []).length,
    },
    {
      id: "photos",
      header: "Photos",
      accessor: (r) =>
        (r.morningPhotoUrls?.length ?? 0) +
        (r.workPhotoUrls?.length ?? 0) +
        (r.endOfDayPhotoUrls?.length ?? 0),
    },
    { id: "status", header: "Status", accessor: (r) => capitalize(r.status) },
  ];
}

export const dailyReportPDFColumns: PDFColumn[] = [
  { header: "Date", dataKey: "date", width: 22 },
  { header: "Time", dataKey: "time", width: 16 },
  { header: "Project", dataKey: "project", width: 45 },
  { header: "Author", dataKey: "author", width: 30 },
  { header: "Weather", dataKey: "weather", width: 30 },
  { header: "Staff", dataKey: "staff", width: 14, halign: "right" },
  { header: "Photos", dataKey: "photos", width: 14, halign: "right" },
  { header: "Status", dataKey: "status", width: 20 },
];

export function dailyReportPDFRows(
  data: DailyReport[],
  employees: Employee[],
  projects: Project[]
): Record<string, string | number>[] {
  return data.map((r) => ({
    date: r.date,
    time: r.time || "",
    project: (() => {
      const p = projects.find((x) => x.id === r.projectId);
      return p?.name || r.projectId;
    })(),
    author: lookup(r.authorId, employees),
    weather: `${r.weather.conditions.join(", ")} ${r.weather.temperature}`,
    staff: (r.onSiteStaff ?? []).length,
    photos:
      (r.morningPhotoUrls?.length ?? 0) +
      (r.workPhotoUrls?.length ?? 0) +
      (r.endOfDayPhotoUrls?.length ?? 0),
    status: capitalize(r.status),
  }));
}
