"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Silently redirects users who have field access but no dashboard access.
 * Place this inside any dashboard layout — it renders nothing but handles
 * the redirect so field-only users never see an "Access Denied" screen.
 */
export function RoleRedirect() {
  const { can, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!can("dashboard.view") && can("field.view")) {
      router.replace("/field");
    }
  }, [loading, can, router]);

  return null;
}
