"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  FolderKanban,
  Clock,
  ShieldCheck,
  ArrowRight,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useEmployees,
  useProjects,
  useTimeEntries,
  useSafetyForms,
  useDispatches,
  useCostCodes,
  useEquipment,
} from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";

import { lookupName } from "@/lib/utils/lookup";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import { safetyStatusColors } from "@/lib/constants/status-colors";

const approvalColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const workTypeLabels: Record<string, string> = {
  "lump-sum": "Lump Sum",
  tm: "T&M",
};
import { RequirePermission } from "@/components/require-permission";

const formTypeLabels: Record<string, string> = {
  flha: "FLHA",
  "toolbox-talk": "Toolbox Talk",
  "near-miss": "Near Miss",
  "incident-report": "Incident Report",
  "safety-inspection": "Safety Inspection",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: employees, loading: l1 } = useEmployees();
  const { data: projects, loading: l2 } = useProjects();
  const { data: timeEntries, loading: l3 } = useTimeEntries();
  const { data: safetyForms, loading: l4 } = useSafetyForms();
  const { data: dispatches, loading: l5 } = useDispatches();
  const { data: costCodes, loading: l6 } = useCostCodes();
  const { data: equipment, loading: l7 } = useEquipment();
  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  const today = format(new Date(), "yyyy-MM-dd");

  // ── Today's dispatch stats ──
  const todayDispatches = dispatches.filter((d) => d.date === today);
  const todayProjectIds = new Set(todayDispatches.map((d) => d.projectId));
  const todayEmployeeIds = new Set(todayDispatches.flatMap((d) => d.employeeIds));
  const activeProjectsToday = todayProjectIds.size;
  const peopleOnSiteToday = todayEmployeeIds.size;

  // ── Recent time entries (last 8) ──
  const recentEntries = [...timeEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  // ── Recent safety forms (last 8) ──
  const recentSafety = [...safetyForms]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  // Greeting
  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <RequirePermission permission="dashboard.view">
      <div className="space-y-6">
        {/* ─── Header ─── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* ─── Today's Stats ─── */}
        <div className="grid gap-4 grid-cols-2">
          <Link href="/dispatch">
            <div className="rounded-xl border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FolderKanban className="h-4 w-4" />
                Active Projects Today
              </div>
              <p className="mt-2 text-3xl font-bold">{activeProjectsToday}</p>
            </div>
          </Link>

          <Link href="/dispatch">
            <div className="rounded-xl border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                People on Site Today
              </div>
              <p className="mt-2 text-3xl font-bold">{peopleOnSiteToday}</p>
            </div>
          </Link>
        </div>

        {/* ─── Recent Time Entries ─── */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent Time Entries</h2>
            </div>
            <Link href="/time-tracking">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 h-[36px]">
                  <TableHead className="text-xs font-semibold px-3">Date</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Employee</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Project</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Cost Code</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Equipment</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Work Type</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Hours</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Notes</TableHead>
                  <TableHead className="text-xs font-semibold px-3">Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                      No time entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentEntries.map((entry) => (
                    <TableRow key={entry.id} className="h-[36px] hover:bg-muted/20">
                      <TableCell className="text-xs px-3 whitespace-nowrap">
                        {format(parseISO(entry.date), "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell className="text-xs px-3 truncate max-w-[140px]">
                        {lookupName(entry.employeeId, employees)}
                      </TableCell>
                      <TableCell className="text-xs px-3 truncate max-w-[160px]">
                        {lookupName(entry.projectId, projects)}
                      </TableCell>
                      <TableCell className="text-xs px-3 truncate max-w-[140px]">
                        {lookupName(entry.costCodeId, costCodes)}
                      </TableCell>
                      <TableCell className="text-xs px-3 truncate max-w-[140px]">
                        {entry.equipmentId && entry.equipmentId !== EQUIPMENT_NONE_ID
                          ? lookupName(entry.equipmentId, equipment)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs px-3 whitespace-nowrap">
                        {workTypeLabels[entry.workType] ?? entry.workType}
                      </TableCell>
                      <TableCell className="text-xs px-3 font-medium">
                        {entry.hours}
                      </TableCell>
                      <TableCell className="text-xs px-3 truncate max-w-[160px] text-muted-foreground">
                        {entry.notes || "—"}
                      </TableCell>
                      <TableCell className="px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${approvalColors[entry.approval]}`}
                        >
                          {entry.approval}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ─── Recent Safety Forms ─── */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent Safety Forms</h2>
            </div>
            <Link href="/safety">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="p-5 pt-3">
            {recentSafety.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No safety forms yet
              </p>
            ) : (
              <div className="space-y-1">
                {recentSafety.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {form.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lookupName(form.submittedById, employees)} · {formTypeLabels[form.formType] ?? form.formType}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize shrink-0 ${safetyStatusColors[form.status]}`}
                    >
                      {form.status}
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground w-14 text-right">
                      {format(parseISO(form.date), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
