"use client";

import * as React from "react";
import { Plus, Pencil, Check, Users, X } from "lucide-react";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { EmployeeDetailSheet } from "@/components/employees/employee-detail-sheet";
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

  // ── Detail sheet state ──
  const [selectedEmpId, setSelectedEmpId] = React.useState<string | null>(null);
  const selectedEmployee = React.useMemo(
    () => employeeList.find((e) => e.id === selectedEmpId) ?? null,
    [employeeList, selectedEmpId]
  );

  const handleDetailUpdate = React.useCallback(
    (id: string, patch: Partial<Employee>) => {
      onEmployeesChange((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    [onEmployeesChange]
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
    const all = [...new Set(employeeList.map((e) => e.role).filter(Boolean))].sort();
    return all.map((r) => ({ id: r, label: r }));
  }, [employeeList]);

  // Permission level filter options
  const [permLevelFilter, setPermLevelFilter] = React.useState<Set<string>>(new Set());
  const permLevelOptions = React.useMemo(() => {
    const all = [...new Set(employeeList.map((e) => e.permissionLevel || e.role).filter(Boolean))].sort();
    return all.map((r) => ({ id: r, label: r }));
  }, [employeeList]);

  const statusOptions = (["active", "inactive"] as EmployeeStatus[]).map(
    (s) => ({ id: s, label: statusLabels[s] })
  );

  // ── Filtered employees ──
  const filteredEmployees = React.useMemo(() => {
    return employeeList.filter((emp) => {
      if (roleFilter.size > 0 && !roleFilter.has(emp.role)) return false;
      if (permLevelFilter.size > 0 && !permLevelFilter.has(emp.permissionLevel || emp.role)) return false;
      if (statusFilter.size > 0 && !statusFilter.has(emp.status)) return false;
      return true;
    });
  }, [employeeList, roleFilter, permLevelFilter, statusFilter]);

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

  // ── Add form state ──
  const [adding, setAdding] = React.useState(false);
  const [newForm, setNewForm] = React.useState({
    name: "",
    role: "",
    permissionLevel: "Labourer",
    phone: "",
    email: "",
    status: "active" as EmployeeStatus,
  });

  const handleAddSubmit = React.useCallback(() => {
    if (!newForm.name.trim()) return;
    const emp: Employee = {
      id: `emp-${crypto.randomUUID().slice(0, 8)}`,
      name: newForm.name.trim(),
      role: newForm.role,
      permissionLevel: newForm.permissionLevel,
      phone: newForm.phone.trim(),
      email: newForm.email.trim(),
      status: newForm.status,
    };
    onEmployeesChange((prev) => [...prev, emp]);
    setAdding(false);
    setNewForm({ name: "", role: "", permissionLevel: "Labourer", phone: "", email: "", status: "active" });
  }, [newForm, onEmployeesChange]);

  const unlockRow = (id: string) => {
    setUnlockedIds((prev) => new Set(prev).add(id));
  };

  const lockRow = (id: string) => {
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs cursor-pointer"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Employee
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-primary/40 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                  <TableHead className="w-[170px] text-xs font-semibold px-3">Name</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold px-3">Role / Title</TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold px-3">Phone</TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold px-3">Email</TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold px-3">Status</TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold px-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-[36px] hover:bg-muted/20">
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.name}
                      onChange={(v) => setNewForm((f) => ({ ...f, name: v }))}
                      placeholder="Full name"
                    />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.role}
                      onChange={(v) => setNewForm((f) => ({ ...f, role: v }))}
                      placeholder="e.g. Director"
                    />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.phone}
                      onChange={(v) => setNewForm((f) => ({ ...f, phone: v }))}
                      placeholder="(555) 000-0000"
                    />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellInput
                      value={newForm.email}
                      onChange={(v) => setNewForm((f) => ({ ...f, email: v }))}
                      placeholder="email@company.com"
                    />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <CellSelect
                      value={newForm.status}
                      onChange={(v) => setNewForm((f) => ({ ...f, status: v as EmployeeStatus }))}
                      options={statusOptions}
                      placeholder="Status"
                    />
                  </TableCell>
                  <TableCell className="p-0 px-1">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs cursor-pointer px-3"
                        onClick={handleAddSubmit}
                        disabled={!newForm.name.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 cursor-pointer p-0"
                        onClick={() => { setAdding(false); setNewForm({ name: "", role: "", permissionLevel: "Labourer", phone: "", email: "", status: "active" }); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 h-[40px]">
                <TableHead className="w-[170px] text-xs font-semibold px-3">
                  Name
                </TableHead>
                <TableHead className="w-[140px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Role / Title"
                    options={roleOptions}
                    selected={roleFilter}
                    onChange={setRoleFilter}
                  />
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold px-3">
                  <ColumnFilter
                    title="Permission Level"
                    options={permLevelOptions}
                    selected={permLevelFilter}
                    onChange={setPermLevelFilter}
                  />
                </TableHead>
                <TableHead className="w-[140px] text-xs font-semibold px-3">
                  Phone
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold px-3">
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
                  <TableCell colSpan={7} className="h-40 text-center">
                    {employeeList.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">No employees yet</p>
                        <p className="text-xs">Add your first employee to get started.</p>
                        <button
                          onClick={() => setAdding(true)}
                          className="mt-1 text-xs text-primary hover:underline cursor-pointer"
                        >
                          + Add Employee
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No employees match the current filters.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {filteredEmployees.map((emp) => {
                const isLocked = !unlockedIds.has(emp.id);

                return (
                  <TableRow
                    key={emp.id}
                    className="group h-[36px] hover:bg-muted/20"
                  >
                    {/* Name */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <button
                          className="text-xs px-2 font-medium text-foreground hover:text-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-left transition-colors"
                          onClick={() => setSelectedEmpId(emp.id)}
                        >
                          {emp.name}
                        </button>
                      ) : (
                        <CellInput
                          value={emp.name}
                          onChange={(v) => updateEmployee(emp.id, "name", v)}
                          placeholder="Full name"
                        />
                      )}
                    </TableCell>

                    {/* Role / Title */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.role || "—"}
                        </span>
                      ) : (
                        <CellInput
                          value={emp.role}
                          onChange={(v) => updateEmployee(emp.id, "role", v)}
                          placeholder="e.g. Director"
                        />
                      )}
                    </TableCell>

                    {/* Permission Level (read-only — editable in Settings → User Management) */}
                    <TableCell className="p-0 px-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium"
                      >
                        {emp.permissionLevel || emp.role}
                      </Badge>
                    </TableCell>

                    {/* Phone */}
                    <TableCell className="p-0 px-1">
                      {isLocked ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.phone || "—"}
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
                      {isLocked ? (
                        <span className="text-xs px-2 text-muted-foreground">
                          {emp.email || "—"}
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
                      {isLocked ? (
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
                      {isLocked ? (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => unlockRow(emp.id)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Edit</p>
                            </TooltipContent>
                          </Tooltip>
                          <DeleteConfirmButton
                            onConfirm={() => deleteEmployee(emp.id)}
                            itemLabel="this employee"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 cursor-pointer"
                                onClick={() => lockRow(emp.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Done editing</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => lockRow(emp.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Cancel</p>
                            </TooltipContent>
                          </Tooltip>
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
      {/* Employee detail sheet */}
      <EmployeeDetailSheet
        employee={selectedEmployee}
        open={!!selectedEmpId}
        onOpenChange={(open) => { if (!open) setSelectedEmpId(null); }}
        onUpdate={handleDetailUpdate}
      />
    </div>
  );
}
