"use client";

import * as React from "react";
import { Clock, Truck, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useEmployees } from "@/hooks/use-firestore";

// ────────────────────────────────────────────────────────
// Field Home — Landing page with employee picker + actions
// ────────────────────────────────────────────────────────

const actions = [
  {
    title: "Time Entries",
    description: "View & submit your hours",
    href: "/field/time",
    icon: Clock,
  },
  {
    title: "My Schedule",
    description: "See where you're dispatched this week",
    href: "/field/dispatch",
    icon: Truck,
  },
  {
    title: "Daily Site Reports",
    description: "Create & view daily site reports",
    href: "/field/daily-report",
    icon: FileText,
  },
];

export function FieldHome() {
  const { data: employees } = useEmployees();
  const [employeeId, setEmployeeId] = React.useState("");

  const activeEmployees = React.useMemo(
    () => employees.filter((e) => e.status === "active"),
    [employees]
  );

  const selectedEmployee = activeEmployees.find((e) => e.id === employeeId);
  const firstName = selectedEmployee?.name?.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ── */}
      <div>
        <h1 className="text-2xl font-bold">
          {selectedEmployee ? `Welcome, ${firstName}!` : "Welcome!"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {selectedEmployee
            ? "What would you like to do?"
            : "Select your name to get started"}
        </p>
      </div>

      {/* ── Employee Selector ── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Who are you?</Label>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="h-12 text-sm cursor-pointer">
            <SelectValue placeholder="Select your name…" />
          </SelectTrigger>
          <SelectContent>
            {activeEmployees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id} className="text-sm">
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Action Buttons ── */}
      {employeeId && (
        <div className="space-y-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={`${action.href}?employee=${employeeId}`}
            >
              <div className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
