import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { AuthGuard } from "@/components/auth-guard";
import { CompanyProfileProvider } from "@/hooks/use-company-profile";
import { GlobalSearch } from "@/components/global-search";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <CompanyProfileProvider>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <TopBar />
              <main className="flex-1 overflow-auto p-4 lg:p-6">
                {children}
              </main>
            </SidebarInset>
            <GlobalSearch />
          </SidebarProvider>
        </TooltipProvider>
      </CompanyProfileProvider>
    </AuthGuard>
  );
}
