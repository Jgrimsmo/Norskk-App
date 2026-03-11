"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useEmployees } from "@/hooks/use-firestore";

/**
 * Resolves the current field user's employee ID.
 * Checks URL param first, then falls back to UID/email matching.
 */
export function useCurrentEmployee() {
  const { user } = useAuth();
  const { data: employees, loading } = useEmployees();

  const employee = useMemo(() => {
    if (!user) return null;
    const byUid = employees.find((e) => e.id === user.uid || e.uid === user.uid);
    if (byUid) return byUid;
    return (
      employees.find(
        (e) => e.email && e.email.toLowerCase() === user.email?.toLowerCase()
      ) ?? null
    );
  }, [employees, user]);

  return { employee, employeeId: employee?.id ?? "", loading };
}
