"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { CompanyProfileProvider } from "@/hooks/use-company-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/firebase/auth-context";
import { useEmployees } from "@/hooks/use-firestore";
import { DEFAULT_ROLE_TEMPLATES } from "@/lib/constants/permissions";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { NotificationBell } from "@/components/shared/notification-bell";
import { FieldBottomNav } from "@/components/field/field-bottom-nav";
import { ServiceWorkerRegistration } from "@/components/field/service-worker-registration";

function UserMenu({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep menu open if click is inside the menu or inside a Radix portal (e.g. ThemeToggle dropdown)
      if (ref.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-radix-popper-content-wrapper]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold cursor-pointer active:scale-95 transition-transform"
      >
        {initials || "?"}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-48 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium truncate">{name}</p>
          </div>
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="w-full px-3 py-2 flex items-center gap-2 text-sm text-destructive hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function FieldHeader() {
  const { user, signOut } = useAuth();
  const { profile } = useCompanyProfile();
  const { data: employees } = useEmployees();
  const companyName = profile?.name || "Norskk";

  const currentEmployee = useMemo(() => {
    if (!user) return null;
    return (
      employees.find((e) => e.id === user.uid || e.uid === user.uid) ||
      employees.find((e) => e.email && e.email.toLowerCase() === user.email?.toLowerCase()) ||
      null
    );
  }, [user, employees]);

  const displayName = currentEmployee?.name || user?.displayName || user?.email || "User";

  // Check if the current user has dashboard management permissions
  const showAdminLink = useMemo(() => {
    if (!currentEmployee) return false;
    const level = currentEmployee.permissionLevel || currentEmployee.role;
    if (!level) return false;
    const template = DEFAULT_ROLE_TEMPLATES.find(
      (t) => t.role.toLowerCase() === level.toLowerCase()
    );
    return template ? template.permissions.includes("employees.view") : false;
  }, [currentEmployee]);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between px-4 min-h-14 safe-area-top">
        <div className="flex items-center gap-3">
          {profile?.logoUrl ? (
            <Image
              src={profile.logoUrl}
              alt={companyName}
              width={96}
              height={32}
              className="h-8 w-auto rounded invert dark:invert-0"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {companyName.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-sm">{companyName}</span>
        </div>

        <div className="flex items-center gap-2">
          {showAdminLink && (
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}
          <NotificationBell />
          <UserMenu name={displayName} onSignOut={signOut} />
        </div>
      </div>
    </header>
  );
}

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <CompanyProfileProvider>
        <ServiceWorkerRegistration />
        <div className="min-h-svh flex flex-col bg-muted/30">
          <FieldHeader />
          <main className="flex-1 px-4 py-4 pb-20 max-w-lg mx-auto w-full">
            {children}
          </main>
          <FieldBottomNav />
        </div>
      </CompanyProfileProvider>
    </AuthGuard>
  );
}
