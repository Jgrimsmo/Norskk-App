"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, subDays, startOfMonth, endOfMonth } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  FolderKanban,
  Clock,
  ShieldCheck,
  Wrench,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  CircleDot,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/time-tracking/date-range-picker";

import {
  useEmployees,
  useProjects,
  useEquipment,
  useTimeEntries,
  useSafetyForms,
} from "@/hooks/use-firestore";
import type { ProjectStatus } from "@/lib/types/time-tracking";

// ── Helpers ──
function lookupName(
  id: string,
  list: { id: string; name?: string; code?: string; description?: string }[]
): string {
  const item = list.find((i) => i.id === id);
  if (!item) return "—";
  if ("code" in item && item.code) return `${item.code} — ${item.description}`;
  return item.name ?? "—";
}

import { projectStatusColors, safetyStatusColors } from "@/lib/constants/status-colors";

const formTypeLabels: Record<string, string> = {
  flha: "FLHA",
  "toolbox-talk": "Toolbox Talk",
  "near-miss": "Near Miss",
  "incident-report": "Incident Report",
  "safety-inspection": "Safety Inspection",
};

const formTypeColors: Record<string, string> = {
  flha: "bg-blue-100 text-blue-800 border-blue-200",
  "toolbox-talk": "bg-purple-100 text-purple-800 border-purple-200",
  "near-miss": "bg-orange-100 text-orange-800 border-orange-200",
  "incident-report": "bg-red-100 text-red-800 border-red-200",
  "safety-inspection": "bg-teal-100 text-teal-800 border-teal-200",
};

export default function DashboardPage() {
  // ── Data from Firestore ──
  const { data: employees, loading: l1 } = useEmployees();
  const { data: projects, loading: l2 } = useProjects();
  const { data: equipment, loading: l3 } = useEquipment();
  const { data: timeEntries, loading: l4 } = useTimeEntries();
  const { data: safetyForms, loading: l5 } = useSafetyForms();
  const loading = l1 || l2 || l3 || l4 || l5;

  // ── Date range filter (default: this week, Mon–Sun) ──
  const now = new Date();
  const defaultRange: DateRange = {
    from: startOfWeek(now, { weekStartsOn: 1 }),
    to: endOfWeek(now, { weekStartsOn: 1 }),
  };
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultRange);
  const [rangeLabel, setRangeLabel] = React.useState("This Week");

  const applyPreset = (label: string, from: Date, to: Date) => {
    setDateRange({ from, to });
    setRangeLabel(label);
  };

  const presets = React.useMemo(() => [
    { label: "This Week", from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) },
    { label: "This Month", from: startOfMonth(now), to: endOfMonth(now) },
    { label: "Last 30 Days", from: subDays(now, 30), to: now },
    { label: "Last 90 Days", from: subDays(now, 90), to: now },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  // Filter time entries and safety forms by the selected range
  const filteredTimeEntries = React.useMemo(() => {
    if (!dateRange?.from) return timeEntries;
    const start = dateRange.from;
    const end = dateRange.to ?? dateRange.from;
    return timeEntries.filter((e) => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start, end });
    });
  }, [timeEntries, dateRange]);

  const filteredSafetyForms = React.useMemo(() => {
    if (!dateRange?.from) return safetyForms;
    const start = dateRange.from;
    const end = dateRange.to ?? dateRange.from;
    return safetyForms.filter((f) => {
      const d = parseISO(f.date);
      return isWithinInterval(d, { start, end });
    });
  }, [safetyForms, dateRange]);

  // ── Derived data (uses filtered entries) ──
  const totalHours = filteredTimeEntries.reduce((sum, e) => sum + e.hours, 0);
  const pendingApprovals = filteredTimeEntries.filter((e) => e.approval === "pending").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const equipmentInUse = equipment.filter((e) => e.status === "in-use" && e.id !== "eq-none").length;
  const equipmentAvailable = equipment.filter((e) => e.status === "available" && e.id !== "eq-none").length;
  const openSafetyForms = filteredSafetyForms.filter((f) => f.status === "draft" || f.status === "submitted").length;
  const incidentCount = filteredSafetyForms.filter(
    (f) => f.formType === "incident-report" || f.formType === "near-miss"
  ).length;

  // Hours by project (filtered range)
  const hoursByProject = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredTimeEntries.forEach((e) => {
      map.set(e.projectId, (map.get(e.projectId) || 0) + e.hours);
    });
    return projects
      .filter((p) => map.has(p.id))
      .map((p) => ({ ...p, hours: map.get(p.id)! }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredTimeEntries, projects]);

  const maxHours = Math.max(...hoursByProject.map((p) => p.hours), 1);

  // Recent time entries (last 5 within range)
  const recentEntries = [...filteredTimeEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Recent safety forms (last 5 within range)
  const recentSafety = [...filteredSafetyForms]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back. Here&apos;s an overview of your construction operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant={rangeLabel === p.label ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => applyPreset(p.label, p.from, p.to)}
            >
              {p.label}
            </Button>
          ))}
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={(r) => {
              setDateRange(r);
              setRangeLabel("Custom");
            }}
          />
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Hours */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Hours — {rangeLabel}
            </div>
            {pendingApprovals > 0 && (
              <Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-200">
                {pendingApprovals} pending
              </Badge>
            )}
          </div>
          <div className="mt-2 text-3xl font-bold">{totalHours}</div>
          <p className="text-xs text-muted-foreground mt-1">
            across {filteredTimeEntries.length} entries
          </p>
        </div>

        {/* Active Projects */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FolderKanban className="h-4 w-4" />
            Active Projects
          </div>
          <div className="mt-2 text-3xl font-bold text-green-600">{activeProjects}</div>
          <p className="text-xs text-muted-foreground mt-1">
            of {projects.length} total projects
          </p>
        </div>

        {/* Safety Forms */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Open Safety Forms
            </div>
            {incidentCount > 0 && (
              <Badge variant="outline" className="text-[10px] bg-red-100 text-red-800 border-red-200">
                {incidentCount} incidents
              </Badge>
            )}
          </div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{openSafetyForms}</div>
          <p className="text-xs text-muted-foreground mt-1">
            drafts &amp; awaiting review
          </p>
        </div>

        {/* Equipment */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Equipment In Use
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{equipmentInUse}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {equipmentAvailable} available
          </p>
        </div>
      </div>

      {/* ─── Middle row: Hours by Project + Project Status ─── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hours by Project */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Hours by Project</h3>
            </div>
            <span className="text-xs text-muted-foreground">{rangeLabel}</span>
          </div>
          <div className="space-y-3">
            {hoursByProject.map((project) => (
              <div key={project.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium truncate max-w-[200px]">
                    {project.number} — {project.name}
                  </span>
                  <span className="text-muted-foreground font-medium ml-2">
                    {project.hours}h
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(project.hours / maxHours) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <Link href="/time-tracking">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-0 h-auto">
              View all time entries
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Project Status Overview */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Project Status</h3>
            </div>
          </div>
          <div className="space-y-2">
            {projects.map((project) => {
              const projectHours = filteredTimeEntries
                .filter((e) => e.projectId === project.id)
                .reduce((sum, e) => sum + e.hours, 0);

              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium capitalize shrink-0 ${projectStatusColors[project.status]}`}
                    >
                      {project.status}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {project.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {project.number} · {project.developer}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium shrink-0 ml-2">
                    {projectHours > 0 ? `${projectHours}h` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <Separator className="my-4" />
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-0 h-auto">
              View all projects
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Bottom row: Recent Entries + Safety + Workforce ─── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Time Entries */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Recent Entries</h3>
            </div>
            {pendingApprovals > 0 && (
              <Badge variant="outline" className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-200">
                {pendingApprovals} pending
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {recentEntries.map((entry) => {
              const approvalColor =
                entry.approval === "approved"
                  ? "text-green-600"
                  : entry.approval === "rejected"
                    ? "text-red-600"
                    : "text-yellow-600";

              return (
                <div
                  key={entry.id}
                  className="flex items-start justify-between rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {lookupName(entry.employeeId, employees)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {lookupName(entry.projectId, projects)} · {entry.notes || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-semibold">{entry.hours}h</p>
                    <p className={`text-[10px] capitalize ${approvalColor}`}>
                      {entry.approval}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <Separator className="my-4" />
          <Link href="/time-tracking">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-0 h-auto">
              View all entries
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Safety Snapshot */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Safety Forms</h3>
            </div>
            {incidentCount > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-[10px] font-medium">{incidentCount} flagged</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {recentSafety.map((form) => (
              <div
                key={form.id}
                className="flex items-start justify-between rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-medium ${formTypeColors[form.formType]}`}
                    >
                      {formTypeLabels[form.formType]}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate max-w-[180px]">
                    {form.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {lookupName(form.submittedById, employees)} · {format(parseISO(form.date), "MM/dd")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] capitalize shrink-0 ml-2 ${safetyStatusColors[form.status]}`}
                >
                  {form.status}
                </Badge>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <Link href="/safety">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-0 h-auto">
              View all safety forms
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Workforce Today */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Workforce</h3>
          </div>

          {/* Workforce stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{activeEmployees}</p>
              <p className="text-[10px] text-green-600 font-medium">Active</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">
                {employees.length - activeEmployees}
              </p>
              <p className="text-[10px] text-gray-500 font-medium">Inactive</p>
            </div>
          </div>

          {/* Roles breakdown */}
          <p className="text-xs font-medium text-muted-foreground mb-2">By Role</p>
          <div className="space-y-1.5">
            {Object.entries(
              employees
                .filter((e) => e.status === "active")
                .reduce(
                  (acc, e) => {
                    acc[e.role] = (acc[e.role] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
            )
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => (
                <div key={role} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="h-2.5 w-2.5 text-primary" />
                    <span className="text-foreground">{role}</span>
                  </div>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
          </div>

          <Separator className="my-4" />

          {/* Equipment quick stats */}
          <p className="text-xs font-medium text-muted-foreground mb-2">Equipment</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="text-foreground">Available</span>
              </div>
              <span className="text-muted-foreground">{equipmentAvailable}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3 w-3 text-blue-600" />
                <span className="text-foreground">In Use</span>
              </div>
              <span className="text-muted-foreground">{equipmentInUse}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                <span className="text-foreground">Maintenance</span>
              </div>
              <span className="text-muted-foreground">
                {equipment.filter((e) => e.status === "maintenance").length}
              </span>
            </div>
          </div>

          <Separator className="my-4" />
          <Link href="/employees">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-0 h-auto">
              View employees
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
