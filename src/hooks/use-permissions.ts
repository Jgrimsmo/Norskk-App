"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useEmployees, useRolePermissions } from "@/hooks/use-firestore";
import { useRolePreview } from "@/lib/role-preview-context";
import { DEFAULT_ROLE_TEMPLATES, ALL_PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Hook that resolves the current user's permissions.
 *
 * 1. Finds the employee record matching the auth user's email.
 * 2. Checks if a preview role is active (admin feature).
 * 3. Looks up the role's permission set from Firestore (or falls back to
 *    the default template if none is stored yet).
 * 4. Returns `can(permission)` to check against.
 *
 * Usage:
 *   const { can, role, loading } = usePermissions();
 *   if (can("time-tracking.approve")) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();
  const { data: employees, loading: loadingEmp } = useEmployees();
  const { data: rolePermissions, loading: loadingRoles } = useRolePermissions();
  const { previewRole } = useRolePreview();

  // Find the employee matching the auth user
  const employee = useMemo(
    () => employees.find((e) => e.email === user?.email),
    [employees, user?.email]
  );

  const realRole = employee?.role ?? "";
  // Use preview role if set, otherwise use real role
  const role = previewRole ?? realRole;

  // Resolve permissions: Firestore override → default template → full access fallback
  const permissions = useMemo(() => {
    // Check Firestore first (case-insensitive match)
    const stored = rolePermissions.find(
      (rp) => rp.role.toLowerCase() === role.toLowerCase()
    );
    if (stored) return new Set(stored.permissions);

    // Fall back to default template (case-insensitive match)
    const template = DEFAULT_ROLE_TEMPLATES.find(
      (t) => t.role.toLowerCase() === role.toLowerCase()
    );
    if (template) return new Set(template.permissions);

    // If no employee record, no role, or no matching role config found,
    // grant full access so the owner can still reach Settings and fix things.
    return new Set(ALL_PERMISSIONS);
  }, [role, rolePermissions, employee]);

  const can = (permission: string): boolean => permissions.has(permission);

  const loading = loadingEmp || loadingRoles;

  return {
    /** Check if the current user has a specific permission */
    can,
    /** The active role (preview or real) */
    role,
    /** The user's real role (ignoring preview) */
    realRole,
    /** The full set of permission strings */
    permissions,
    /** The matched employee record */
    employee,
    /** Whether data is still loading */
    loading,
  };
}
