"use client";

import * as React from "react";
import { Users, X, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import type { Employee } from "@/lib/types/time-tracking";

interface StaffPickerSectionProps {
  selected: string[];
  onToggle: (empId: string) => void;
  employees: Employee[];
  disabled?: boolean;
}

export function StaffPickerSection({
  selected,
  onToggle,
  employees,
  disabled,
}: StaffPickerSectionProps) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return employees
      .filter((e) => e.status === "active")
      .filter((e) => e.name.toLowerCase().includes(q));
  }, [search, employees]);

  return (
    <section>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-orange-500" />
        On-site Staff ({selected.length})
      </h3>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((empId) => {
            const emp = employees.find((e) => e.id === empId);
            return (
              <span
                key={empId}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
              >
                {emp?.name ?? empId}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onToggle(empId)}
                    className="hover:text-destructive cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="h-9 text-sm pl-8 rounded-lg focus-visible:ring-1"
            />
          </div>
          {search.trim().length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border bg-popover shadow-md">
              <div className="max-h-[200px] overflow-y-auto p-1.5 space-y-0.5">
                {filtered.map((emp) => {
                  const checked = selected.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => { onToggle(emp.id); setSearch(""); }}
                        className="h-3.5 w-3.5"
                      />
                      <span className={checked ? "font-medium" : ""}>
                        {emp.name}
                      </span>
                      {emp.role && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          {emp.role}
                        </span>
                      )}
                    </label>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No employees found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
