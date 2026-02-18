"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Warn the user when they have unsaved changes and try to leave/close.
 *
 * - Adds a `beforeunload` listener to prevent accidental page navigation.
 * - Returns a `confirmClose` function that shows a browser confirm dialog
 *   before closing (for use in dialog onOpenChange handlers).
 *
 * @param isDirty — whether the form has unsaved changes
 */
export function useUnsavedWarning(isDirty: boolean) {
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  // Browser navigation guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  /**
   * Call this in your dialog's `onOpenChange` handler.
   * Returns `true` if it's safe to close (no unsaved changes or user confirmed).
   */
  const confirmClose = useCallback((): boolean => {
    if (!dirtyRef.current) return true;
    return window.confirm(
      "You have unsaved changes. Are you sure you want to close?"
    );
  }, []);

  return { confirmClose };
}
