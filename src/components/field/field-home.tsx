"use client";

import * as React from "react";
import { Clock, Truck, FileText, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

import { useEmployees } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";

// ────────────────────────────────────────────────────────
// Field Home — Auto-identifies the user and shows actions
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
  const { data: employees, loading } = useEmployees();
  const { user } = useAuth();

  // Auto-match the logged-in user to their employee record
  const currentEmployee = React.useMemo(() => {
    if (!user) return null;
    // Match by UID (employee doc ID is the user's UID for invited users)
    const byUid = employees.find(
      (e) => e.id === user.uid || e.uid === user.uid
    );
    if (byUid) return byUid;
    // Fallback: match by email
    return employees.find(
      (e) => e.email && e.email.toLowerCase() === user.email?.toLowerCase()
    );
  }, [employees, user]);

  const employeeId = currentEmployee?.id || "";
  const firstName = currentEmployee?.name?.split(" ")[0] || user?.displayName?.split(" ")[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ── */}
      <div>
        <h1 className="text-2xl font-bold">
          {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          What would you like to do?
        </p>
      </div>

      {/* ── Action Buttons ── */}
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
    </div>
  );
}
