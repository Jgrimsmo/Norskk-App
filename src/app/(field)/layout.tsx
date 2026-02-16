"use client";

import { AuthGuard } from "@/components/auth-guard";
import { CompanyProfileProvider } from "@/hooks/use-company-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/firebase/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCompanyProfile } from "@/hooks/use-company-profile";

function FieldHeader() {
  const { signOut } = useAuth();
  const { profile } = useCompanyProfile();
  const companyName = profile?.name || "Norskk";

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {profile?.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt={companyName}
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
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </Link>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
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
        <div className="min-h-svh flex flex-col bg-muted/30">
          <FieldHeader />
          <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
            {children}
          </main>
        </div>
      </CompanyProfileProvider>
    </AuthGuard>
  );
}
