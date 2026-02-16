"use client";

import * as React from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { Plus, ExternalLink } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
import { safetyFormCSVColumns, safetyFormPDFColumns, safetyFormPDFRows } from "@/lib/export/columns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ColumnFilter } from "@/components/time-tracking/column-filter";
import { DateColumnFilter } from "@/components/time-tracking/date-column-filter";
import { FLHAFormDialog } from "@/components/safety/flha-form-dialog";

import {
  type SafetyForm,
  type SafetyFormType,
  type SafetyFormStatus,
  type Employee,
  type Project,
} from "@/lib/types/time-tracking";
import { useEmployees, useProjects } from "@/hooks/use-firestore";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

import { lookupName } from "@/lib/utils/lookup";

const formTypeLabels: Record<SafetyFormType, string> = {
  flha: "FLHA",
  "toolbox-talk": "Toolbox Talk",
  "near-miss": "Near Miss",
  "incident-report": "Incident Report",
  "safety-inspection": "Safety Inspection",
};

const formTypeColors: Record<SafetyFormType, string> = {
  flha: "bg-blue-100 text-blue-800 border-blue-200",
  "toolbox-talk": "bg-purple-100 text-purple-800 border-purple-200",
  "near-miss": "bg-orange-100 text-orange-800 border-orange-200",
  "incident-report": "bg-red-100 text-red-800 border-red-200",
  "safety-inspection": "bg-teal-100 text-teal-800 border-teal-200",
};

import { safetyStatusColors as statusColors } from "@/lib/constants/status-colors";

const statusLabels: Record<SafetyFormStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  closed: "Closed",
};

function newBlankForm(date: string, formType: SafetyFormType): SafetyForm {
  return {
    id: `sf-${crypto.randomUUID().slice(0, 8)}`,
    date,
    formType,
    projectId: "",
    submittedById: "",
    title: "",
    description: "",
    status: "draft",
  };
}

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface SafetyFormsTableProps {
  forms: SafetyForm[];
  onFormsChange: (forms: SafetyForm[]) => void;
}

export function SafetyFormsTable({
  forms,
  onFormsChange,
}: SafetyFormsTableProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeForm, setActiveForm] = React.useState<SafetyForm | null>(null);

  const openFormDialog = (form: SafetyForm) => {
    setActiveForm(form);
    setDialogOpen(true);
  };

  const handleDialogSave = (updated: SafetyForm) => {
    // If this is a brand new form (not yet in the list), add it
    const exists = forms.some((f) => f.id === updated.id);
    if (exists) {
      onFormsChange(forms.map((f) => (f.id === updated.id ? updated : f)));
    } else {
      onFormsChange([...forms, updated]);
    }
  };

  // ── Filter state ──
  const [dateFilter, setDateFilter] = React.useState<DateRange | undefined>(
    undefined
  );
  const [formTypeFilter, setFormTypeFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [projectFilter, setProjectFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [submittedByFilter, setSubmittedByFilter] = React.useState<Set<string>>(
    new Set()
  );
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(
    new Set()
  );

  // ── Option arrays for filters ──
  const formTypeOptions: { id: string; label: string }[] = [
    { id: "flha", label: "FLHA" },
    { id: "toolbox-talk", label: "Toolbox Talk" },
    { id: "near-miss", label: "Near Miss" },
    { id: "incident-report", label: "Incident Report" },
    { id: "safety-inspection", label: "Safety Inspection" },
  ];

  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: `${p.number} — ${p.name}`,
  }));

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: e.name,
  }));

  const statusOptions: { id: string; label: string }[] = [
    { id: "draft", label: "Draft" },
    { id: "submitted", label: "Submitted" },
    { id: "reviewed", label: "Reviewed" },
    { id: "closed", label: "Closed" },
  ];

  // ── Filtered forms ──
  const filteredForms = React.useMemo(() => {
    return forms.filter((form) => {
      if (dateFilter?.from && dateFilter?.to) {
        const d = parseISO(form.date);
        if (
          !isWithinInterval(d, { start: dateFilter.from, end: dateFilter.to })
        )
          return false;
      }
      if (formTypeFilter.size > 0 && !formTypeFilter.has(form.formType))
        return false;
      if (projectFilter.size > 0 && !projectFilter.has(form.projectId))
        return false;
      if (
        submittedByFilter.size > 0 &&
        !submittedByFilter.has(form.submittedById)
      )
        return false;
      if (statusFilter.size > 0 && !statusFilter.has(form.status))
        return false;
      return true;
    });
  }, [forms, dateFilter, formTypeFilter, projectFilter, submittedByFilter, statusFilter]);

  // ── Delete row ──
  const deleteRow = (id: string) => {
    onFormsChange(forms.filter((f) => f.id !== id));
  };

  // ── Add new form — opens dialog immediately ──
  const addForm = (formType: SafetyFormType = "flha") => {
    const today = new Date().toISOString().split("T")[0];
    const form = newBlankForm(today, formType);
    // Don't add to list yet — will be added on save
    openFormDialog(form);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => addForm("flha")}
        >
          <Plus className="h-3.5 w-3.5" />
          New FLHA
        </Button>
        <SafetyExport forms={filteredForms} employees={employees} projects={projects} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[110px] text-xs font-semibold px-3">
                  <DateColumnFilter
                    dateRange={dateFilter}
                    onDateRangeChange={setDateFilter}
                  />
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Form Type"
                    options={formTypeOptions}
                    selected={formTypeFilter}
                    onChange={setFormTypeFilter}
                  />
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Project"
                    options={projectOptions}
                    selected={projectFilter}
                    onChange={setProjectFilter}
                  />
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Submitted By"
                    options={employeeOptions}
                    selected={submittedByFilter}
                    onChange={setSubmittedByFilter}
                  />
                </TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold px-3">
                  Title
                </TableHead>
                <TableHead className="w-[100px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Status"
                    options={statusOptions}
                    selected={statusFilter}
                    onChange={setStatusFilter}
                  />
                </TableHead>
                <TableHead className="w-[70px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredForms.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No safety forms match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredForms.map((form) => (
                <TableRow
                  key={form.id}
                  className="group h-[40px] cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => openFormDialog(form)}
                >
                  {/* Date */}
                  <TableCell className="text-xs px-3 text-muted-foreground">
                    {format(parseISO(form.date), "MM/dd/yyyy")}
                  </TableCell>

                  {/* Form Type */}
                  <TableCell className="px-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium ${formTypeColors[form.formType]}`}
                    >
                      {formTypeLabels[form.formType]}
                    </Badge>
                  </TableCell>

                  {/* Project */}
                  <TableCell className="text-xs px-3 text-foreground">
                    {lookupName(form.projectId, projects)}
                  </TableCell>

                  {/* Submitted By */}
                  <TableCell className="text-xs px-3 text-foreground">
                    {lookupName(form.submittedById, employees)}
                  </TableCell>

                  {/* Title */}
                  <TableCell className="text-xs px-3 text-foreground font-medium truncate max-w-[280px]">
                    {form.title || <span className="text-muted-foreground italic">Untitled</span>}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium capitalize ${statusColors[form.status]}`}
                    >
                      {statusLabels[form.status]}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-2">
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFormDialog(form);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="text-xs">Open form</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <DeleteConfirmButton
                              onConfirm={() => deleteRow(form.id)}
                              itemLabel="this safety form"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="text-xs">Delete form</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {filteredForms.length} of {forms.length} forms
        </span>
      </div>

      {/* FLHA Dialog */}
      {activeForm && activeForm.formType === "flha" && (
        <FLHAFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={activeForm}
          onSave={handleDialogSave}
        />
      )}
    </div>
  );
}

// ── Export sub-component ──
const SAFETY_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "date", header: "Date" },
  { id: "type", header: "Type" },
  { id: "project", header: "Project" },
  { id: "submittedBy", header: "Submitted By" },
  { id: "title", header: "Title" },
  { id: "status", header: "Status" },
];

const SAFETY_GROUP_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "type", label: "Form Type" },
  { value: "submittedBy", label: "Submitted By" },
  { value: "status", label: "Status" },
];

function SafetyExport({ forms, employees, projects }: { forms: SafetyForm[]; employees: Employee[]; projects: Project[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(forms, safetyFormCSVColumns(employees, projects), filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(forms, safetyFormCSVColumns(employees, projects), filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: safetyFormPDFColumns,
        rows: safetyFormPDFRows(forms, employees, projects),
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
      columns: safetyFormPDFColumns,
      rows: safetyFormPDFRows(forms, employees, projects),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={SAFETY_EXPORT_COLUMNS}
      groupOptions={SAFETY_GROUP_OPTIONS}
      defaultTitle="Safety Forms (FLHA)"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={forms.length === 0}
      recordCount={forms.length}
    />
  );
}
