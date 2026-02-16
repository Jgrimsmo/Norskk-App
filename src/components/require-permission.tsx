"use client";

import { ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
  /** Optional fallback — defaults to an "Access Denied" message */
  fallback?: React.ReactNode;
}

/**
 * Wraps content that requires a specific permission.
 * Shows an access-denied message if the user doesn't have the permission.
 * While permissions are loading, renders nothing to avoid flicker.
 */
export function RequirePermission({
  permission,
  children,
  fallback,
}: RequirePermissionProps) {
  const { can, loading, role } = usePermissions();

  if (loading) return null;

  if (!can(permission)) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Your role ({role || "unknown"}) doesn&apos;t have permission to
            access this page. Contact an administrator to update your
            permissions.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
