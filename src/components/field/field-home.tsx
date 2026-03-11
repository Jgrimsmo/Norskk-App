"use client";

import * as React from "react";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import {
  Truck,
  FileText,
  ChevronRight,
  Loader2,
  CalendarDays,
  MapPin,
  Plus,
  HardHat,
  Wifi,
  WifiOff,
  Navigation,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/field/pull-to-refresh";

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
  const { data: employees, loading: loadingEmp, refresh: refreshEmp } = useEmployees();
  const { data: projects, loading: loadingProjects, refresh: refreshProjects } = useProjects();
  const { data: timeEntries, loading: loadingTime, refresh: refreshTime } = useTimeEntries();
  const { data: dispatches, loading: loadingDispatches, refresh: refreshDispatches } = useDispatches();
  const { user } = useAuth();

  const loading = loadingEmp || loadingProjects || loadingTime || loadingDispatches;

  // Track last synced time — updates whenever data finishes loading
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (!loading) setLastSynced(new Date());
  }, [loading, employees, projects, timeEntries, dispatches]);

  // Re-render the "ago" label every 30s
  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 30_000);
    return () => clearInterval(interval);
  }, []);

  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  React.useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([refreshEmp(), refreshProjects(), refreshTime(), refreshDispatches()]);
  }, [refreshEmp, refreshProjects, refreshTime, refreshDispatches]);

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
    return dispatches.find((d) => {
      if (!d.employeeIds.includes(employeeId)) return false;
      // Must span today
      if (d.date > today || (d.endDate ?? d.date) < today) return false;
      // Respect resourceDates if present
      const ranges = d.resourceDates?.[employeeId];
      if (!ranges) return true;
      const arr = Array.isArray(ranges) ? ranges : [ranges as { start: string; end: string }];
      if (arr.length === 0) return true;
      return arr.some((r) => today >= r.start && today <= r.end);
    }) ?? null;
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
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-5 pb-6">
      {/* ── Greeting + sync status ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="h-3 w-3 text-emerald-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-destructive" />
            )}
            <span className="text-[11px] text-muted-foreground">
              {lastSynced ? formatDistanceToNow(lastSynced, { addSuffix: true }) : "syncing…"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Today's Assignment ── */}
      {todayProject ? (() => {
        const addressParts = [todayProject.address, todayProject.city, todayProject.province].filter(Boolean);
        const fullAddress = addressParts.join(", ");
        const mapsUrl = fullAddress
          ? `https://maps.apple.com/?daddr=${encodeURIComponent(fullAddress)}`
          : null;

        return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="bg-primary/10 px-4 py-2 flex items-center gap-2">
            <HardHat className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Today&apos;s Assignment
            </p>
          </div>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 active:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug">{todayProject.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {fullAddress}
                  </p>
                </div>
                <Navigation className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              </div>
              <p className="text-[10px] text-primary font-medium mt-1.5 ml-7">
                Tap for directions
              </p>
            </a>
          ) : (
            <div className="px-4 py-3 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug">{todayProject.name}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {todayProject.status ?? "Active"}
              </Badge>
            </div>
          )}
        </div>
        );
      })() : (
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
    </PullToRefresh>
  );
}

