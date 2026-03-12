"use client";

import { usePathname, useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useRolePreview } from "@/lib/role-preview-context";
import { usePermissions } from "@/hooks/use-permissions";
import { DEFAULT_ROLE_TEMPLATES } from "@/lib/constants/permissions";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/shared/notification-bell";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/dispatch": "Dispatch",
  "/time-tracking": "Time Tracking",
  "/daily-reports": "Daily Reports",
  "/safety": "Safety",
  "/employees": "Employees",
  "/equipment": "Equipment",
  "/vendors": "Vendors",
  "/payables": "Payables",
  "/settings": "Settings",
};

// Sub-page second-level crumb labels keyed by parent path
const subPageLabels: Record<string, string> = {
  "/projects": "Project Detail",
  "/equipment": "Equipment Detail",
  "/employees": "Employee Detail",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { previewRole, isPreviewing, startPreview, stopPreview } =
    useRolePreview();
  const { realRole } = usePermissions();

  // Only show "View as" for actual admins (or users with no role yet — owner)
  const isAdmin = !realRole || realRole.toLowerCase() === "admin";

  // Derive initials & display values from Firebase user
  const displayName = user?.displayName || "User";
  const email = user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (path === "/" && pathname === "/") return title;
      if (path !== "/" && pathname.startsWith(path)) return title;
    }
    return "Dashboard";
  };

  // Determine if we're on a sub-page (e.g. /projects/abc123)
  const pathSegments = pathname.split("/").filter(Boolean);
  const isSubPage = pathSegments.length >= 2;
  const parentPath = isSubPage ? `/${pathSegments[0]}` : null;
  const parentTitle = parentPath ? pageTitles[parentPath] ?? null : null;
  const subPageLabel = parentPath ? subPageLabels[parentPath] ?? "Detail" : null;

  const pageTitle = getPageTitle();

  return (
    <>
      {/* Preview mode banner */}
      {isPreviewing && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-amber-950 safe-area-top">
          <Eye className="h-4 w-4" />
          <span className="text-xs font-semibold">
            Previewing as: {previewRole}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1 bg-white/80 hover:bg-white border-amber-600 text-amber-900 cursor-pointer"
            onClick={stopPreview}
          >
            <X className="h-3 w-3" />
            Exit preview
          </Button>
        </div>
      )}
      <header className="sticky top-0 z-30 flex min-h-14 items-center gap-4 border-b bg-background px-4 lg:px-6 safe-area-top">
      {/* Left section: sidebar trigger + breadcrumb */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 h-8 w-8 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-5" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathname !== "/" && (
              isSubPage && parentTitle ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={parentPath!} className="text-muted-foreground hover:text-foreground">
                      {parentTitle}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium">{subPageLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-medium">
                      {pageTitle}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right section: search, notifications, user menu */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <GlobalSearch />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* View As Role (admin only) */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isPreviewing ? "default" : "outline"}
                size="sm"
                className="hidden sm:flex h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                {isPreviewing ? `Viewing: ${previewRole}` : "View as…"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                Preview as role
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DEFAULT_ROLE_TEMPLATES.map((t) => (
                <DropdownMenuItem
                  key={t.role}
                  className="text-xs cursor-pointer gap-2"
                  onClick={() => startPreview(t.role)}
                >
                  {t.role}
                  {previewRole === t.role && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[9px] px-1"
                    >
                      Active
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
              {isPreviewing && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs cursor-pointer text-amber-600 gap-2"
                    onClick={stopPreview}
                  >
                    <X className="h-3.5 w-3.5" />
                    Exit preview
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings?section=profile")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOut(); router.push("/login"); }}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
