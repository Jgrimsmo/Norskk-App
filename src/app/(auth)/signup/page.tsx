"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Public signup is disabled. Users are invited by an admin.
 * Redirect to login page.
 */
export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
          N
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Invite Only</h1>
        <p className="text-sm text-muted-foreground">
          Accounts are created by your company admin. If you&apos;ve received an
          invitation email, use the link to set your password, then sign in.
        </p>
      </div>
    </div>
  );
}
