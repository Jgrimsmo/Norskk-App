"use client";

import * as React from "react";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import {
  Clock,
  Truck,
  FileText,
  ChevronRight,
  Loader2,
  CalendarDays,
  MapPin,
  Plus,
  HardHat,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  useEmployees,
  useProjects,
  useTimeEntries,
  useDispatches,
} from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";

// ────────────────────────────────────────────────────────
// Field Home — Mobile-first dashboard for field workers
// ────────────────────────────────────────────────────────

const quickActions = [
  {
    title: "My Schedule",
    description: "See where you're dispatched",
    href: "/field/dispatch",
    icon: Truck,
  },
  {
    title: "Daily Site Reports",
    description: "Create & view daily reports",
    href: "/field/daily-report",
    icon: FileText,
  },
  {
    title: "Time History",
    description: "View your pay period hours",
    href: "/field/time",
    icon: CalendarDays,
  },
];

export function FieldHome() {
  const { data: employees, loading: loadingEmp } = useEmployees();
  const { data: projects, loading: loadingProjects } = useProjects();
  const { data: timeEntries, loading: loadingTime } = useTimeEntries();
  const { data: dispatches, loading: loadingDispatches } = useDispatches();
  const { user } = useAuth();

  const loading = loadingEmp || loadingProjects || loadingTime || loadingDispatches;

  // Auto-match the logged-in user to their employee record
  const currentEmployee = React.useMemo(() => {
    if (!user) return null;
    const byUid = employees.find((e) => e.id === user.uid || e.uid === user.uid);
    if (byUid) return byUid;
    return employees.find(
      (e) => e.email && e.email.toLowerCase() === user.email?.toLowerCase()
    );
  }, [employees, user]);

  const employeeId = currentEmployee?.id || "";
  const firstName =
    currentEmployee?.name?.split(" ")[0] || user?.displayName?.split(" ")[0];

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "EEEE, MMMM d");

  // ── Today's dispatch assignment ──
  const todayDispatch = React.useMemo(() => {
    if (!employeeId) return null;
    return dispatches.find(
      (d) => d.date === today && d.employeeIds.includes(employeeId)
    ) ?? null;
  }, [dispatches, employeeId, today]);

  const todayProject = React.useMemo(() => {
    if (!todayDispatch) return null;
    return projects.find((p) => p.id === todayDispatch.projectId) ?? null;
  }, [todayDispatch, projects]);

  // ── Week-to-date hours ──
  const weekHours = React.useMemo(() => {
    if (!employeeId) return 0;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return timeEntries
      .filter((e) => {
        if (e.employeeId !== employeeId) return false;
        try {
          return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + (e.hours ?? 0), 0);
  }, [timeEntries, employeeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
      </div>

      {/* ── Today's Assignment ── */}
      {todayProject ? (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/10 px-4 py-2 flex items-center gap-2">
            <HardHat className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Today&apos;s Assignment
            </p>
          </div>
          <div className="px-4 py-3 flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug">{todayProject.name}</p>
              {(todayProject.address || todayProject.city) && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[todayProject.address, todayProject.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">
              {todayProject.status ?? "Active"}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-4 flex items-center gap-3 text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <p className="text-sm">No dispatch assignment for today.</p>
        </div>
      )}

      {/* ── Week Hours + Log Time CTA ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <p className="text-xs text-muted-foreground font-medium">Week Hours</p>
          <p className="text-3xl font-bold mt-1">
            {weekHours % 1 === 0 ? weekHours : weekHours.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">this week so far</p>
        </div>
        <Link href={`/field/entry?employee=${employeeId}`} className="block">
          <div className="rounded-xl bg-primary text-primary-foreground shadow-sm p-4 h-full flex flex-col justify-between cursor-pointer hover:bg-primary/90 active:bg-primary/80 transition-colors">
            <Plus className="h-5 w-5" />
            <div>
              <p className="font-semibold text-sm leading-tight">Log Time</p>
              <p className="text-xs opacity-75 mt-0.5">Record today&apos;s hours</p>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </p>
        <div className="space-y-2.5">
          {quickActions.map((action) => (
            <Link key={action.href} href={`${action.href}?employee=${employeeId}`}>
              <div className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

