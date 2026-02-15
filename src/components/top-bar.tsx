"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/firebase/auth-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/dispatch": "Dispatch",
  "/time-tracking": "Time Tracking",
  "/daily-reports": "Daily Reports",
  "/safety": "Safety",
  "/employees": "Employees",
  "/equipment": "Equipment",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

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

  const pageTitle = getPageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
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
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">
                    {pageTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right section: search, notifications, user menu */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search (desktop) */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search... ⌘K"
            aria-label="Search"
            className="w-64 pl-9 h-9 bg-muted/50 border-transparent focus:border-input focus:bg-background cursor-pointer"
            readOnly
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            onFocus={(e) => e.currentTarget.blur()}
          />
        </div>

        {/* Search (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => toast.info("Notifications coming soon", { description: "Real-time notifications will be available once the backend is connected." })}
        >
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

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
            <DropdownMenuItem onClick={() => toast.info("Profile settings coming soon")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOut(); router.push("/login"); }}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
