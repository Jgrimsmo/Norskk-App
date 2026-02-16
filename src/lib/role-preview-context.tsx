"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface RolePreviewContextValue {
  /** The role being previewed, or null if not previewing */
  previewRole: string | null;
  /** Whether preview mode is active */
  isPreviewing: boolean;
  /** Start previewing as a specific role */
  startPreview: (role: string) => void;
  /** Stop previewing (return to your real role) */
  stopPreview: () => void;
}

const RolePreviewContext = createContext<RolePreviewContextValue | null>(null);

export function useRolePreview() {
  const ctx = useContext(RolePreviewContext);
  if (!ctx)
    throw new Error("useRolePreview must be used within <RolePreviewProvider>");
  return ctx;
}

export function RolePreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [previewRole, setPreviewRole] = useState<string | null>(null);

  const startPreview = useCallback((role: string) => {
    setPreviewRole(role);
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewRole(null);
  }, []);

  return (
    <RolePreviewContext.Provider
      value={{
        previewRole,
        isPreviewing: previewRole !== null,
        startPreview,
        stopPreview,
      }}
    >
      {children}
    </RolePreviewContext.Provider>
  );
}
