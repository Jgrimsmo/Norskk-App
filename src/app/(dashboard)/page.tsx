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
  FileText,
  Receipt,
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
  useFormSubmissions,
  useDispatches,
  useCostCodes,
  useEquipment,
  useDailyReports,
  useInvoices,
  useVendors,
} from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import { usePermissions } from "@/hooks/use-permissions";

import { lookupName } from "@/lib/utils/lookup";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import {
  safetyStatusColors,
  approvalStatusColors,
  invoiceStatusColors,
} from "@/lib/constants/status-colors";
import {
  workTypeLabels,
  invoiceStatusLabels,
} from "@/lib/constants/labels";
import { RequirePermission } from "@/components/require-permission";

export default function DashboardPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { data: employees, loading: l1 } = useEmployees();
  const { data: projects, loading: l2 } = useProjects();
  const { data: timeEntries, loading: l3 } = useTimeEntries();
  const { data: formSubmissions, loading: l4 } = useFormSubmissions();
  const { data: dispatches, loading: l5 } = useDispatches();
  const { data: costCodes, loading: l6 } = useCostCodes();
  const { data: equipment, loading: l7 } = useEquipment();
  const { data: dailyReports, loading: l8 } = useDailyReports();
  const { data: invoices, loading: l9 } = useInvoices();
  const { data: vendors, loading: l10 } = useVendors();
  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10;

  const today = format(new Date(), "yyyy-MM-dd");

  // ── Today's dispatch stats ──
  const { activeProjectsToday, peopleOnSiteToday } = React.useMemo(() => {
    const todayDispatches = dispatches.filter((d) => d.date === today);
    const todayProjectIds = new Set(todayDispatches.map((d) => d.projectId));
    const todayEmployeeIds = new Set(todayDispatches.flatMap((d) => d.employeeIds));
    return {
      activeProjectsToday: todayProjectIds.size,
      peopleOnSiteToday: todayEmployeeIds.size,
    };
  }, [dispatches, today]);

  // ── Today's time entries ──
  const todayEntries = React.useMemo(
    () => timeEntries.filter((e) => e.date === today).sort((a, b) => b.date.localeCompare(a.date)),
    [timeEntries, today]
  );

  // ── Today's daily reports ──
  const todayDailyReports = React.useMemo(
    () => dailyReports
      .filter((r) => r.date === today)
      .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? "")),
    [dailyReports, today]
  );

  // ── Today's invoices ──
  const todayInvoices = React.useMemo(
    () => invoices.filter((inv) => inv.date === today).sort((a, b) => b.date.localeCompare(a.date)),
    [invoices, today]
  );

  // ── Today's safety form submissions ──
  const todaySafety = React.useMemo(
    () => formSubmissions
      .filter((fs) => fs.category === "safety" && fs.date === today)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [formSubmissions, today]
  );

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

        {/* ─── Operations ─── */}
        {can("time-tracking.view") && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Operations</p>
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Today&apos;s Time Entries</h2>
                </div>
                <Link href="/time-tracking">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    View all <ArrowRight className="h-3 w-3" />
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
                    {todayEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">No time entries today</TableCell>
                      </TableRow>
                    ) : (
                      todayEntries.map((entry) => (
                        <TableRow key={entry.id} className="h-[36px] hover:bg-muted/20">
                          <TableCell className="text-xs px-3 whitespace-nowrap">{format(parseISO(entry.date), "MM/dd/yyyy")}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[140px]">{lookupName(entry.employeeId, employees)}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[160px]">{lookupName(entry.projectId, projects)}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[140px]">{lookupName(entry.costCodeId, costCodes)}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[140px]">
                            {entry.equipmentId && entry.equipmentId !== EQUIPMENT_NONE_ID ? lookupName(entry.equipmentId, equipment) : "—"}
                          </TableCell>
                          <TableCell className="text-xs px-3 whitespace-nowrap">{workTypeLabels[entry.workType] ?? entry.workType}</TableCell>
                          <TableCell className="text-xs px-3 font-medium">{entry.hours}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[160px] text-muted-foreground">{entry.notes || "—"}</TableCell>
                          <TableCell className="px-3">
                            <Badge variant="outline" className={`text-[10px] capitalize ${approvalStatusColors[entry.approval]}`}>
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
          </div>
        )}

        {/* ─── Reporting ─── */}
        {(can("daily-reports.view") || can("safety.view")) && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Reporting</p>

            {can("daily-reports.view") && (
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between p-5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Today&apos;s Daily Reports</h2>
                  </div>
                  <Link href="/daily-reports">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                      View all <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 h-[36px]">
                        <TableHead className="text-xs font-semibold px-3">Date</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Report #</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Project</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Author</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Weather</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Staff</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Work Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayDailyReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">No daily reports today</TableCell>
                        </TableRow>
                      ) : (
                        todayDailyReports.map((report) => (
                          <TableRow key={report.id} className="h-[36px] hover:bg-muted/20">
                            <TableCell className="text-xs px-3 whitespace-nowrap">{format(parseISO(report.date), "MM/dd/yyyy")}</TableCell>
                            <TableCell className="text-xs px-3 font-medium">#{report.reportNumber}</TableCell>
                            <TableCell className="text-xs px-3 truncate max-w-[160px]">{lookupName(report.projectId, projects)}</TableCell>
                            <TableCell className="text-xs px-3 truncate max-w-[140px]">{lookupName(report.authorId, employees)}</TableCell>
                            <TableCell className="text-xs px-3 truncate max-w-[140px]">
                              {report.weather?.conditions?.length ? report.weather.conditions.join(", ") : "—"}
                              {report.weather?.temperature ? ` · ${report.weather.temperature}` : ""}
                            </TableCell>
                            <TableCell className="text-xs px-3">{report.onSiteStaff?.length ?? 0}</TableCell>
                            <TableCell className="text-xs px-3 truncate max-w-[200px] text-muted-foreground">{report.workDescription || "—"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {can("safety.view") && (
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between p-5 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Today&apos;s Safety Forms</h2>
                  </div>
                  <Link href="/safety">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                      View all <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 h-[36px]">
                        <TableHead className="text-xs font-semibold px-3">Date</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Form</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Submitted By</TableHead>
                        <TableHead className="text-xs font-semibold px-3">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySafety.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No safety forms today</TableCell>
                        </TableRow>
                      ) : (
                        todaySafety.map((form) => (
                          <TableRow key={form.id} className="h-[36px] hover:bg-muted/20">
                            <TableCell className="text-xs px-3 whitespace-nowrap">{format(parseISO(form.date), "MM/dd/yyyy")}</TableCell>
                            <TableCell className="text-xs px-3 font-medium truncate max-w-[200px]">{form.templateName}</TableCell>
                            <TableCell className="text-xs px-3 truncate max-w-[140px]">
                              {form.submittedByName || lookupName(form.submittedById, employees)}
                            </TableCell>
                            <TableCell className="px-3">
                              <Badge variant="outline" className={`text-[10px] capitalize ${safetyStatusColors[form.status] || ""}`}>
                                {form.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Accounting ─── */}
        {can("payables.view") && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Accounting</p>
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Today&apos;s Payables</h2>
                </div>
                <Link href="/payables">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 h-[36px]">
                      <TableHead className="text-xs font-semibold px-3">Date</TableHead>
                      <TableHead className="text-xs font-semibold px-3">Vendor</TableHead>
                      <TableHead className="text-xs font-semibold px-3">Project</TableHead>
                      <TableHead className="text-xs font-semibold px-3">File</TableHead>
                      <TableHead className="text-xs font-semibold px-3 text-right">Amount</TableHead>
                      <TableHead className="text-xs font-semibold px-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No invoices today</TableCell>
                      </TableRow>
                    ) : (
                      todayInvoices.map((inv) => (
                        <TableRow key={inv.id} className="h-[36px] hover:bg-muted/20">
                          <TableCell className="text-xs px-3 whitespace-nowrap">{format(parseISO(inv.date), "MM/dd/yyyy")}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[140px]">
                            {vendors.find((v) => v.id === inv.vendorId)?.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[160px]">{lookupName(inv.projectId, projects)}</TableCell>
                          <TableCell className="text-xs px-3 truncate max-w-[160px] text-muted-foreground">{inv.fileName}</TableCell>
                          <TableCell className="text-xs px-3 text-right font-medium whitespace-nowrap">
                            {inv.amount != null
                              ? `$${inv.amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "—"}
                          </TableCell>
                          <TableCell className="px-3">
                            <Badge variant="outline" className={`text-[10px] ${invoiceStatusColors[inv.status]}`}>
                              {invoiceStatusLabels[inv.status] ?? inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}