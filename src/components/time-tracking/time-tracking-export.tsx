"use client";

import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { timeEntryColumns } from "@/lib/export/columns";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import type { TimeEntry } from "@/lib/types/time-tracking";

const TIME_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "date", header: "Date" },
  { id: "employee", header: "Employee" },
  { id: "project", header: "Project" },
  { id: "costCode", header: "Cost Code" },
  { id: "equipment", header: "Equipment" },
  { id: "attachment", header: "Attachment" },
  { id: "tool", header: "Tool" },
  { id: "workType", header: "Work Type" },
  { id: "hours", header: "Hours" },
  { id: "approval", header: "Approval" },
  { id: "notes", header: "Notes" },
];

const TIME_GROUP_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "employee", label: "Employee" },
  { value: "date", label: "Date" },
  { value: "costCode", label: "Cost Code" },
  { value: "workType", label: "Work Type" },
  { value: "approval", label: "Approval Status" },
  { value: "equipment", label: "Equipment" },
  { value: "attachment", label: "Attachment" },
  { value: "tool", label: "Tool" },
];

export function TimeTrackingExport({
  entries,
  employees,
  projects,
  costCodes,
  equipment,
  attachments,
  tools,
  open,
  onOpenChange,
  trigger,
}: {
  entries: TimeEntry[];
  employees: { id: string; name: string }[];
  projects: { id: string; name: string; number: string }[];
  costCodes: { id: string; code: string; description: string }[];
  equipment: { id: string; name: string; number: string }[];
  attachments: { id: string; name: string; number: string }[];
  tools: { id: string; name: string; number: string }[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode | null;
}) {
  const { profile } = useCompanyProfile();
  const { csv } = timeEntryColumns(
    employees as never[],
    projects as never[],
    costCodes as never[],
    equipment as never[],
    attachments as never[],
    tools as never[]
  );

  const handleExport = async (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(entries, csv, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(entries, csv, filename, config.selectedColumns);
    } else {
      const { generateTimeTrackingPDF } = await import("@/lib/export/react-pdf/time-tracking-report");
      generateTimeTrackingPDF({
        entries,
        employees: employees as never[],
        projects: projects as never[],
        costCodes: costCodes as never[],
        equipment: equipment as never[],
        attachments: attachments as never[],
        tools: tools as never[],
        company: profile,
        selectedColumns: config.selectedColumns,
        groupBy: config.groupBy,
        groupByLevels: config.groupByLevels,
        title: config.title,
        orientation: config.orientation,
      });
    }
  };

  const handlePreview = async (config: ExportConfig) => {
    const { generateTimeTrackingPDFBlobUrl } = await import("@/lib/export/react-pdf/time-tracking-report");
    return generateTimeTrackingPDFBlobUrl({
      entries,
      employees: employees as never[],
      projects: projects as never[],
      costCodes: costCodes as never[],
      equipment: equipment as never[],
      attachments: attachments as never[],
      tools: tools as never[],
      company: profile,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
      groupByLevels: config.groupByLevels,
      title: config.title,
      orientation: config.orientation,
    });
  };

  return (
    <ExportDialog
      columns={TIME_EXPORT_COLUMNS}
      groupOptions={TIME_GROUP_OPTIONS}
      defaultTitle="Time Tracking Report"
      defaultOrientation="landscape"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={entries.length === 0}
      recordCount={entries.length}
      templateKey="time-tracking"
      controlledOpen={open}
      onControlledOpenChange={onOpenChange}
      trigger={trigger}
    />
  );
}
