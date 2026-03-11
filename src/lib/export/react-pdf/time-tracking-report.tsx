/**
 * Time Tracking PDF report built with React-PDF.
 *
 * Produces a professional, branded timecard report suitable for
 * sending to clients. Groups entries by project (or employee / date /
 * cost code) with subtotals and a grand total bar.
 *
 * Re-uses shared layout from:
 *   - report-layout.tsx  (header, footer, summary strip)
 *   - report-table.tsx   (generic table)
 *   - styles.ts          (colours, fonts)
 */

import React from "react";
import { Document, pdf } from "@react-pdf/renderer";
import { ReportPage, SummaryStrip, GrandTotalBar } from "./report-layout";
import {
  ReportTable,
  type TableColumn,
  type TableRow,
} from "./report-table";
import { capitalize } from "@/lib/utils/lookup";
import type {
  TimeEntry,
  Employee,
  Project,
  CostCode,
  Equipment,
  Attachment,
  Tool,
  CompanyProfile,
} from "@/lib/types/time-tracking";

// ── Column definitions (keyed so the export dialog can filter them) ──

const ALL_COLUMNS: (TableColumn & { id: string })[] = [
  { id: "date", key: "date", header: "Date", flex: 1 },
  { id: "employee", key: "employee", header: "Employee", flex: 1.4 },
  { id: "project", key: "project", header: "Project", flex: 1.6 },
  { id: "costCode", key: "costCode", header: "Cost Code", flex: 1.8 },
  { id: "workType", key: "workType", header: "Type", flex: 0.5 },
  { id: "hours", key: "hours", header: "Hours", flex: 0.6, align: "right" },
  { id: "approval", key: "approval", header: "Status", flex: 0.7, align: "center" },
  { id: "equipment", key: "equipment", header: "Equipment", flex: 1.3 },
  { id: "attachment", key: "attachment", header: "Attachment", flex: 1.3 },
  { id: "tool", key: "tool", header: "Tool", flex: 1.3 },
  { id: "notes", key: "notes", header: "Notes", flex: 2.5 },
];

// ── Public options ──

export interface TimeTrackingReportOptions {
  entries: TimeEntry[];
  employees: Employee[];
  projects: Project[];
  costCodes: CostCode[];
  equipment?: Equipment[];
  attachments?: Attachment[];
  tools?: Tool[];
  company?: CompanyProfile | null;
  dateRange?: string;
  title?: string;
  orientation?: "portrait" | "landscape";
  /** Column IDs to include (undefined = sensible defaults) */
  selectedColumns?: string[];
  /** "project" | "employee" | "date" | "costCode" | "none" */
  groupBy?: string;
  /** Multi-level grouping (e.g. ["project","employee"]) — takes precedence over groupBy */
  groupByLevels?: string[];
}

// ── Format a date string for display (e.g. "Jan 15") ──

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Resolve a TimeEntry to display-ready row fields ──

function resolveEntry(
  e: TimeEntry,
  employees: Employee[],
  projects: Project[],
  costCodes: CostCode[],
  equipment: Equipment[],
  attachments: Attachment[],
  tools: Tool[]
): TableRow {
  const emp = employees.find((x) => x.id === e.employeeId);
  const proj = projects.find((x) => x.id === e.projectId);
  const cc = costCodes.find((x) => x.id === e.costCodeId);
  const eq = equipment.find((x) => x.id === e.equipmentId);
  const att = attachments.find((x) => x.id === e.attachmentId);
  const tl = tools.find((x) => x.id === e.toolId);
  return {
    date: formatDate(e.date),
    employee: emp?.name || "",
    project: proj?.name || "",
    costCode: cc?.code || "",
    workType: e.workType === "lump-sum" ? "LS" : "T&M",
    hours: e.hours.toFixed(1),
    approval: capitalize(e.approval),
    equipment: eq?.name || "",
    attachment: att?.name || "",
    tool: tl?.name || "",
    notes: e.notes || "",
  };
}

// ── The React component that IS the PDF document ──

// Helper: resolve groupBy key for a single field
function getGroupKeyFn(
  field: string,
  employees: Employee[],
  projects: Project[],
  costCodes: CostCode[],
  equipment: Equipment[] = [],
  attachments: Attachment[] = [],
  tools: Tool[] = [],
): { keyFn: (e: TimeEntry) => string; labelFn: (key: string) => string; labelPrefix: string } {
  switch (field) {
    case "employee":
      return {
        keyFn: (e) => e.employeeId,
        labelFn: (key) => employees.find((x) => x.id === key)?.name || key,
        labelPrefix: "Employee",
      };
    case "date":
      return {
        keyFn: (e) => e.date,
        labelFn: (key) => formatDate(key),
        labelPrefix: "Date",
      };
    case "costCode":
      return {
        keyFn: (e) => e.costCodeId,
        labelFn: (key) => {
          const cc = costCodes.find((x) => x.id === key);
          return cc?.code || key;
        },
        labelPrefix: "Cost Code",
      };
    case "workType":
      return {
        keyFn: (e) => e.workType,
        labelFn: (key) => (key === "lump-sum" ? "Lump Sum" : "T&M"),
        labelPrefix: "Work Type",
      };
    case "approval":
      return {
        keyFn: (e) => e.approval,
        labelFn: (key) => capitalize(key),
        labelPrefix: "Status",
      };
    case "equipment":
      return {
        keyFn: (e) => e.equipmentId || "__none__",
        labelFn: (key) => key === "__none__" ? "No Equipment" : (equipment.find((x) => x.id === key)?.name || key),
        labelPrefix: "Equipment",
      };
    case "attachment":
      return {
        keyFn: (e) => e.attachmentId || "__none__",
        labelFn: (key) => key === "__none__" ? "No Attachment" : (attachments.find((x) => x.id === key)?.name || key),
        labelPrefix: "Attachment",
      };
    case "tool":
      return {
        keyFn: (e) => e.toolId || "__none__",
        labelFn: (key) => key === "__none__" ? "No Tool" : (tools.find((x) => x.id === key)?.name || key),
        labelPrefix: "Tool",
      };
    default: // "project"
      return {
        keyFn: (e) => e.projectId,
        labelFn: (key) => projects.find((x) => x.id === key)?.name || key,
        labelPrefix: "Project",
      };
  }
}

// Nested group node
interface GroupNode {
  key: string;
  label: string;
  depth: number;
  entries: TimeEntry[];
  resolvedRows: TableRow[];
  hours: number;
  children: GroupNode[];
}

function buildGroupTree(
  entries: TimeEntry[],
  resolvedRows: TableRow[],
  levels: { keyFn: (e: TimeEntry) => string; labelFn: (key: string) => string }[],
  depth: number
): GroupNode[] {
  if (levels.length === 0) {
    // Leaf — single flat group
    return [{
      key: "__leaf__",
      label: "",
      depth,
      entries,
      resolvedRows,
      hours: entries.reduce((s, e) => s + e.hours, 0),
      children: [],
    }];
  }

  const [current, ...rest] = levels;
  const buckets = new Map<string, { entries: TimeEntry[]; rows: TableRow[] }>();
  const order: string[] = [];

  entries.forEach((e, i) => {
    const key = current.keyFn(e);
    if (!buckets.has(key)) {
      buckets.set(key, { entries: [], rows: [] });
      order.push(key);
    }
    const b = buckets.get(key)!;
    b.entries.push(e);
    b.rows.push(resolvedRows[i]);
  });

  return order.map((key) => {
    const b = buckets.get(key)!;
    return {
      key,
      label: current.labelFn(key),
      depth,
      entries: b.entries,
      resolvedRows: b.rows,
      hours: b.entries.reduce((s, e) => s + e.hours, 0),
      children: buildGroupTree(b.entries, b.rows, rest, depth + 1),
    };
  });
}

function TimeTrackingDocument({
  entries,
  employees,
  projects,
  costCodes,
  equipment = [],
  attachments = [],
  tools = [],
  company,
  dateRange,
  title = "Time Tracking Report",
  orientation = "landscape",
  selectedColumns,
  groupBy = "project",
  groupByLevels,
}: TimeTrackingReportOptions) {
  // Pick which columns to show
  const defaultCols = ["date", "employee", "costCode", "workType", "hours", "approval", "notes"];
  const visibleIds = selectedColumns ?? defaultCols;
  const columns: TableColumn[] = visibleIds
    .map((id) => ALL_COLUMNS.find((c) => c.id === id))
    .filter((c): c is TableColumn & { id: string } => c != null);

  // Resolve all entries
  const resolved = entries.map((e) =>
    resolveEntry(e, employees, projects, costCodes, equipment, attachments, tools)
  );

  // Summary stats
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  // Determine effective grouping levels
  const effectiveLevels = groupByLevels && groupByLevels.length > 0
    ? groupByLevels
    : groupBy !== "none" ? [groupBy] : [];

  const levelFns = effectiveLevels.map((field) =>
    getGroupKeyFn(field, employees, projects, costCodes, equipment, attachments, tools)
  );

  const groupTree = buildGroupTree(
    entries,
    resolved,
    levelFns.map((l) => ({ keyFn: l.keyFn, labelFn: l.labelFn })),
    0
  );

  const isGrouped = effectiveLevels.length > 0;
  const hasHoursCol = columns.some((c) => c.key === "hours");

  // Build subtotal row helper
  const buildSubtotal = (hours: number): TableRow | undefined => {
    if (!hasHoursCol) return undefined;
    return Object.fromEntries(
      columns.map((c) => {
        if (c.key === "hours") return [c.key, hours.toFixed(1)];
        const hoursIdx = columns.findIndex((col) => col.key === "hours");
        const myIdx = columns.indexOf(c);
        if (hoursIdx > 0 && myIdx === hoursIdx - 1) return [c.key, "Subtotal"];
        return [c.key, ""];
      })
    );
  };

  // Recursively render group nodes
  let nodeCounter = 0;
  function renderGroupNodes(nodes: GroupNode[]): React.ReactNode[] {
    const elements: React.ReactNode[] = [];

    for (const node of nodes) {
      const nodeId = nodeCounter++;

      // Check if all children are unlabeled leaves (data-only)
      const childrenAreLeaves = node.children.length > 0 &&
        node.children.every((c) => !c.label && c.children.length === 0);

      if (node.children.length > 0 && node.label && !childrenAreLeaves) {
        // Parent group with labeled sub-groups — render header, then recurse
        elements.push(
          <ReportTable
            key={`hdr-${nodeId}`}
            columns={columns}
            rows={[]}
            groupHeader={node.label}
            groupHeaderRight={`${node.entries.length} ${node.entries.length === 1 ? "entry" : "entries"}  ·  ${node.hours.toFixed(1)} hrs`}
            depth={node.depth}
          />
        );
        elements.push(...renderGroupNodes(node.children));
        // Parent subtotal after all sub-groups
        if (hasHoursCol && effectiveLevels.length > 1) {
          elements.push(
            <ReportTable
              key={`sub-${nodeId}`}
              columns={columns}
              rows={[]}
              subtotal={buildSubtotal(node.hours)}
              depth={node.depth}
            />
          );
        }
      } else if (node.label) {
        // Leaf group (or parent whose children are all data-only leaves)
        // Consolidate all rows into one table
        const allRows = childrenAreLeaves
          ? node.children.flatMap((c) => c.resolvedRows)
          : node.resolvedRows;

        elements.push(
          <ReportTable
            key={`grp-${nodeId}`}
            columns={columns}
            rows={allRows}
            groupHeader={node.label}
            groupHeaderRight={`${allRows.length} ${allRows.length === 1 ? "entry" : "entries"}  ·  ${node.hours.toFixed(1)} hrs`}
            subtotal={isGrouped ? buildSubtotal(node.hours) : undefined}
            depth={node.depth}
          />
        );
      } else {
        // No grouping — flat table
        elements.push(
          <ReportTable
            key={`flat-${nodeId}`}
            columns={columns}
            rows={node.resolvedRows}
          />
        );
      }
    }

    return elements;
  }

  return (
    <Document>
      <ReportPage
        company={company}
        title={title}
        dateRange={dateRange}
        orientation={orientation}
      >
        {/* Tables — nested groups */}
        {renderGroupNodes(groupTree)}

        {/* Grand total — right-aligned like an invoice */}
        <GrandTotalBar
          label="Total Hours"
          value={totalHours.toFixed(1)}
        />
      </ReportPage>
    </Document>
  );
}

// ── Fetch the company logo as a base64 data URL via server-side proxy (bypasses CORS) ──

async function fetchLogoAsDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/logo?url=${encodeURIComponent(logoUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/** Pre-fetch the company logo so it embeds reliably in the PDF */
async function resolveCompanyLogo(
  opts: TimeTrackingReportOptions
): Promise<TimeTrackingReportOptions> {
  // Prefer the dedicated PDF logo; fall back to the main company logo
  const logoUrl = opts.company?.pdfLogoUrl || opts.company?.logoUrl;
  if (!logoUrl) return opts;
  const dataUrl = await fetchLogoAsDataUrl(logoUrl);
  if (!dataUrl) return opts;
  return {
    ...opts,
    company: {
      ...opts.company!,
      // Store in pdfLogoUrl so the layout knows which logo to use
      pdfLogoUrl: dataUrl,
    },
  };
}

// ── Public API: generate blob URL (for preview) or trigger download ──

export async function generateTimeTrackingPDF(
  opts: TimeTrackingReportOptions
): Promise<void> {
  const resolved = await resolveCompanyLogo(opts);
  const blob = await pdf(<TimeTrackingDocument {...resolved} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(opts.title || "time-tracking-report").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateTimeTrackingPDFBlobUrl(
  opts: TimeTrackingReportOptions
): Promise<string> {
  const resolved = await resolveCompanyLogo(opts);
  const blob = await pdf(<TimeTrackingDocument {...resolved} />).toBlob();
  return URL.createObjectURL(blob);
}
