"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Truck,
  Clock,
  ClipboardList,
  ShieldCheck,
  Users,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { usePermissions } from "@/hooks/use-permissions";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see this item (e.g. "time-tracking.view") */
  permission?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard, permission: "dashboard.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Time Tracking", href: "/time-tracking", icon: Clock, permission: "time-tracking.view" },
      { title: "Dispatch", href: "/dispatch", icon: Truck, permission: "dispatch.view" },
      { title: "Projects", href: "/projects", icon: FolderKanban, permission: "projects.view" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Employees", href: "/employees", icon: Users, permission: "employees.view" },
      { title: "Equipment", href: "/equipment", icon: Wrench, permission: "equipment.view" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { title: "Daily Reports", href: "/daily-reports", icon: ClipboardList, permission: "daily-reports.view" },
      { title: "Safety", href: "/safety", icon: ShieldCheck, permission: "safety.view" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Field View", href: "/field", icon: Smartphone, permission: "field.view" },
      { title: "Settings", href: "/settings", icon: Settings, permission: "settings.view" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, open } = useSidebar();
  const { profile } = useCompanyProfile();
  const { can } = usePermissions();

  const companyName = profile?.name || "Norskk";
  const companyInitial = companyName.charAt(0).toUpperCase();
  const logoUrl = profile?.logoUrl;

  // Filter nav sections based on permissions
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || can(item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]">
      <SidebarHeader className="flex flex-col items-center px-3 py-5 group-data-[collapsible=icon]:py-3">
        <Link href="/" className="flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="w-full max-h-16 shrink-0 rounded-lg object-contain group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:max-h-8 invert dark:invert-0"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-2xl group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:text-sm">
              {companyInitial}
            </div>
          )}
        </Link>
      </SidebarHeader>

      <Separator className="bg-sidebar-border/60" />

      <SidebarContent>
        {filteredSections.map((section, index) => (
          <SidebarGroup key={section.label} className={index > 0 ? "pt-4" : ""}>
            <SidebarGroupLabel className="text-sidebar-foreground text-[0.65rem] uppercase tracking-widest font-semibold mb-0.5 px-2 border-b border-sidebar-border pb-1">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`h-9 rounded-md transition-colors data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary data-[active=true]:pl-[calc(0.5rem-2px)]`}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full h-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {open ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
