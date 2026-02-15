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

const navSections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Time Tracking", href: "/time-tracking", icon: Clock },
      { title: "Dispatch", href: "/dispatch", icon: Truck },
      { title: "Projects", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Employees", href: "/employees", icon: Users },
      { title: "Equipment", href: "/equipment", icon: Wrench },
    ],
  },
  {
    label: "Reporting",
    items: [
      { title: "Daily Reports", href: "/daily-reports", icon: ClipboardList },
      { title: "Safety", href: "/safety", icon: ShieldCheck },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, open } = useSidebar();
  const { profile } = useCompanyProfile();

  const companyName = profile?.name || "Norskk";
  const companyInitial = companyName.charAt(0).toUpperCase();
  const logoUrl = profile?.logoUrl;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="flex flex-col items-center px-3 py-6 group-data-[collapsible=icon]:py-3">
        <Link href="/" className="flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="w-full max-h-28 shrink-0 rounded-lg object-contain group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:max-h-8"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-4xl group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:text-sm">
              {companyInitial}
            </div>
          )}
        </Link>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
                        className="h-10"
                      >
                        <Link href={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span className="text-sm font-medium">{item.title}</span>
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
