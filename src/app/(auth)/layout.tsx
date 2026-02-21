import { CompanyProfileProvider } from "@/hooks/use-company-profile";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProfileProvider>
      <div className="flex min-h-svh">
        {/* Left branding panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-zinc-900 text-white p-12 relative overflow-hidden">
          {/* Background texture */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-zinc-700 via-zinc-900 to-black opacity-80" />

          <div className="relative z-10 flex flex-col items-center gap-8 text-center">
            {/* Logo */}
            <Image
              src="/Norskk.png"
              alt="Norskk"
              width={1792}
              height={1792}
              className="w-[360px] h-auto object-contain opacity-95"
              priority
            />

            {/* Brand name */}
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white" style={{ fontFamily: "var(--font-volkhov)" }}>Norskk</h1>
              <p className="mt-2 text-zinc-400 text-lg font-bold" style={{ fontFamily: "var(--font-volkhov)" }}>Construction Management Platform</p>
            </div>

            {/* Tagline */}
            <p className="max-w-xs text-zinc-500 text-sm leading-relaxed">
              Dispatch, time tracking, payables, safety, and daily reports — all in one place.
            </p>
          </div>

          {/* Bottom watermark */}
          <div className="absolute bottom-8 text-zinc-700 text-xs">
            norskk.cloud
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-1 flex-col items-center justify-center bg-background p-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 mb-8 lg:hidden">
            <Image
              src="/Norskk.png"
              alt="Norskk"
              width={56}
              height={56}
              className="h-14 w-14 object-contain invert dark:invert-0"
            />
            <span className="text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-volkhov)" }}>Norskk</span>
          </div>

          {children}
        </div>
      </div>
    </CompanyProfileProvider>
  );
}
