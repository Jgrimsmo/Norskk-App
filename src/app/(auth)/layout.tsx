import { CompanyProfileProvider } from "@/hooks/use-company-profile";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProfileProvider>
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        {children}
      </div>
    </CompanyProfileProvider>
  );
}
