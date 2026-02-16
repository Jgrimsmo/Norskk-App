"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { ExportDialog } from "@/components/shared/export-dialog";
import type { ExportColumnDef, ExportConfig } from "@/components/shared/export-dialog";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { exportToExcel, exportToCSV } from "@/lib/export/csv";
import { generatePDF, generatePDFBlobUrl } from "@/lib/export/pdf";
import { employeeCSVColumns, employeePDFColumns, employeePDFRows } from "@/lib/export/columns";
import { DEFAULT_ROLE_TEMPLATES } from "@/lib/constants/permissions";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CellInput } from "@/components/shared/cell-input";
import { CellSelect } from "@/components/shared/cell-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ColumnFilter } from "@/components/time-tracking/column-filter";

import { type Employee, type EmployeeStatus } from "@/lib/types/time-tracking";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

import { employeeStatusColors as statusColors } from "@/lib/constants/status-colors";

const statusLabels: Record<EmployeeStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

function newBlankEmployee(): Employee {
  return {
    id: `emp-${crypto.randomUUID().slice(0, 8)}`,
    name: "",
    role: "",
    phone: "",
    email: "",
    status: "active",
  };
}

// ────────────────────────────────────────────
// Main table component
// ────────────────────────────────────────────

interface EmployeesTableProps {
  employees: Employee[];
  onEmployeesChange: (employees: Employee[] | ((prev: Employee[]) => Employee[])) => void;
}

export function EmployeesTable({
  employees: employeeList,
  onEmployeesChange,
}: EmployeesTableProps) {
  const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(
    new Set()
  );

  // ── Filter state ──
  const [roleFilter, setRoleFilter] = React.useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(
    new Set()
  );

  // Role options from templates (used for both the cell select and the column filter)
  const roleSelectOptions = React.useMemo(
    () => DEFAULT_ROLE_TEMPLATES.map((t) => ({ id: t.role, label: t.role })),
    []
  );

  // Filter option arrays – include template roles plus any extra roles already in use
  const roleOptions = React.useMemo(() => {
    const templateRoles = new Set(DEFAULT_ROLE_TEMPLATES.map((t) => t.role));
    const extra = employeeList
      .map((e) => e.role)
      .filter((r) => r && !templateRoles.has(r));
    const all = [...templateRoles, ...extra].sort();
    return all.map((r) => ({ id: r, label: r }));
  }, [employeeList]);

  const statusOptions = (["active", "inactive"] as EmployeeStatus[]).map(
    (s) => ({ id: s, label: statusLabels[s] })
  );

  // ── Filtered employees ──
  const filteredEmployees = React.useMemo(() => {
    return employeeList.filter((emp) => {
      if (roleFilter.size > 0 && !roleFilter.has(emp.role)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(emp.status)) return false;
      return true;
    });
  }, [employeeList, roleFilter, statusFilter]);

  // ── Mutations ──
  const updateEmployee = React.useCallback(
    (id: string, field: keyof Employee, value: string) => {
      onEmployeesChange((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      );
    },
    [onEmployeesChange]
  );

  const deleteEmployee = React.useCallback(
    (id: string) => {
      onEmployeesChange((prev) => prev.filter((emp) => emp.id !== id));
    },
    [onEmployeesChange]
  );

  const addEmployee = React.useCallback(() => {
    onEmployeesChange((prev) => [...prev, newBlankEmployee()]);
  }, [onEmployeesChange]);

  const unlockRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlockedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={addEmployee}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Employee
        </Button>
        <EmployeesExport employees={filteredEmployees} />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[180px] text-xs font-semibold px-3">
                  Name
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Role / Trade"
                    options={roleOptions}
                    selected={roleFilter}
                    onChange={setRoleFilter}
                  />
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold px-3">
                  Phone
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold px-3">
                  Email
                </TableHead>
                <TableHead className="w-[110px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Status"
                    options={statusOptions}
                    selected={statusFilter}
                    onChange={setStatusFilter}
                  />
                </TableHead>
                <TableHead className="w-[50px] text-xs font-semibold px-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No employees match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredEmployees.map((emp) => {
                const isInactive =
                  emp.status === "inactive" && !unlockedIds.has(emp.id);

                return (
                  <TableRow
                    key={emp.id}
                    className={`group h-[36px] ${
                      isInactive ? "bg-gray-50/30" : "hover:bg-muted/20"
                    }`}
                  >
                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isInactive ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.name}
                        </span>
                      ) : (
                        <CellInput
                          value={emp.name}
                          onChange={(v) => updateEmployee(emp.id, "name", v)}
                          placeholder="Full name"
                        />
                      )}
                    </TableCell>

                    {/* Role / Trade */}
                    <TableCell className="p-0 px-1">
                      {isInactive ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.role}
                        </span>
                      ) : (
                        <CellSelect
                          value={emp.role}
                          onChange={(v) => updateEmployee(emp.id, "role", v)}
                          options={roleSelectOptions}
                          placeholder="Select role"
                        />
                      )}
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="p-0 px-1">
                      {isInactive ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.phone}
                        </span>
                      ) : (
                        <CellInput
                          value={emp.phone}
                          onChange={(v) => updateEmployee(emp.id, "phone", v)}
                          placeholder="(555) 000-0000"
                        />
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="p-0 px-1">
                      {isInactive ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.email}
                        </span>
                      ) : (
                        <CellInput
                          value={emp.email}
                          onChange={(v) => updateEmployee(emp.id, "email", v)}
                          placeholder="email@company.com"
                        />
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 px-1">
                      {isInactive ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium capitalize ${statusColors[emp.status]}`}
                        >
                          {statusLabels[emp.status]}
                        </Badge>
                      ) : (
                        <CellSelect
                          value={emp.status}
                          onChange={(v) => updateEmployee(emp.id, "status", v)}
                          options={statusOptions}
                          placeholder="Status"
                        />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-0 px-1">
                      {isInactive ? (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => unlockRow(emp.id, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit inactive employee</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <DeleteConfirmButton
                            onConfirm={() => deleteEmployee(emp.id)}
                            itemLabel="this employee"
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          {filteredEmployees.length} of {employeeList.length} employees
        </span>
        <span className="font-medium text-foreground">
          {employeeList.filter((e) => e.status === "active").length} active
        </span>
      </div>
    </div>
  );
}

// ── Export sub-component ──
const EMPLOYEE_EXPORT_COLUMNS: ExportColumnDef[] = [
  { id: "name", header: "Name" },
  { id: "role", header: "Role" },
  { id: "phone", header: "Phone" },
  { id: "email", header: "Email" },
  { id: "status", header: "Status" },
];

const EMPLOYEE_GROUP_OPTIONS = [
  { value: "role", label: "Role" },
  { value: "status", label: "Status" },
];

function EmployeesExport({ employees }: { employees: Employee[] }) {
  const { profile } = useCompanyProfile();

  const handleExport = (config: ExportConfig) => {
    const datestamp = new Date().toISOString().slice(0, 10);
    const filename = `${config.title.toLowerCase().replace(/\s+/g, "-")}-${datestamp}`;

    if (config.format === "excel") {
      exportToExcel(employees, employeeCSVColumns, filename, config.selectedColumns);
    } else if (config.format === "csv") {
      exportToCSV(employees, employeeCSVColumns, filename, config.selectedColumns);
    } else {
      generatePDF({
        title: config.title,
        filename,
        company: profile,
        columns: employeePDFColumns,
        rows: employeePDFRows(employees),
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
      columns: employeePDFColumns,
      rows: employeePDFRows(employees),
      orientation: config.orientation,
      selectedColumns: config.selectedColumns,
      groupBy: config.groupBy,
    });

  return (
    <ExportDialog
      columns={EMPLOYEE_EXPORT_COLUMNS}
      groupOptions={EMPLOYEE_GROUP_OPTIONS}
      defaultTitle="Employees"
      onExport={handleExport}
      onGeneratePDFPreview={handlePreview}
      disabled={employees.length === 0}
      recordCount={employees.length}
    />
  );
}
