"use client";

import * as React from "react";
import {
  Building2,
  Users,
  Hash,
  BellRing,
  Shield,
  Palette,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { CompanyProfileSettings } from "@/components/settings/company-profile";
import { UserManagementSettings } from "@/components/settings/user-management";
import { CostCodesSettings } from "@/components/settings/cost-codes";
import { RolePermissionsSettings } from "@/components/settings/role-permissions";
import { RequirePermission } from "@/components/require-permission";

// ── Section registry ──
const sections = [
  {
    id: "company",
    title: "Company Profile",
    icon: Building2,
    component: CompanyProfileSettings,
    ready: true,
  },
  {
    id: "users",
    title: "User Management",
    icon: Users,
    component: UserManagementSettings,
    ready: true,
  },
  {
    id: "cost-codes",
    title: "Cost Codes",
    icon: Hash,
    component: CostCodesSettings,
    ready: true,
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: BellRing,
    component: null,
    ready: false,
  },
  {
    id: "security",
    title: "Roles & Permissions",
    icon: Shield,
    component: RolePermissionsSettings,
    ready: true,
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: Palette,
    component: null,
    ready: false,
  },
  {
    id: "integrations",
    title: "Data & Integrations",
    icon: Database,
    component: null,
    ready: false,
  },
] as const;

export default function SettingsPage() {
  const [activeSection, setActiveSection] = React.useState("company");

  const active = sections.find((s) => s.id === activeSection);
  const ActiveComponent = active?.component;

  return (
    <RequirePermission permission="settings.view">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account, company, and application preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="md:w-56 shrink-0 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <Button
                key={section.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-start gap-2 text-xs cursor-pointer ${
                  isActive
                    ? "font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  if (section.ready) {
                    setActiveSection(section.id);
                  } else {
                    toast.info(`${section.title} coming soon`);
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                {section.title}
                {!section.ready && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] bg-muted text-muted-foreground border-muted-foreground/20"
                  >
                    Soon
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {ActiveComponent ? (
              <ActiveComponent />
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  This section is coming soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </RequirePermission>
  );
}
