"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Plus, FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/field", label: "Home", icon: Home },
  { href: "/field/dispatch", label: "Schedule", icon: CalendarDays },
  { href: "/field/entry", label: "Log Time", icon: Plus, primary: true },
  { href: "/field/daily-report", label: "Reports", icon: FileText },
  { href: "/field/time", label: "Hours", icon: Clock },
];

export function FieldBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/field"
            ? pathname === "/field"
            : pathname.startsWith(item.href);

          if (item.primary) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-4">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-medium mt-0.5 text-primary">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
