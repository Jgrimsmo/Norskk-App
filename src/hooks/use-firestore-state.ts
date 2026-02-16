"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useCollection } from "@/hooks/use-collection";

/**
 * A drop-in replacement for `useState<T[]>(initialData)` that is backed
 * by a Firestore collection with real-time sync.
 *
 * Returns `[data, setData, loading, saving, error]` — the setter accepts either
 * a new array or a functional update `(prev) => next`, diffs against
 * the current snapshot, and writes adds / updates / removes to Firestore.
 *
 * Writes are debounced by default (800ms) so rapid keystrokes don't
 * trigger a save on every character. Structural changes (add / remove rows)
 * are flushed immediately. Optimistic local state ensures the UI stays
 * responsive while writes are pending.
 *
 * `saving` is true while a write operation is in progress.
 *
 * The `setData` function has a **stable identity** (never changes between renders),
 * making it safe to use in `useCallback` dependency arrays without causing
 * unnecessary re-creates.
 *
 * Usage:
 *   const [entries, setEntries, loading, saving] =
 *     useFirestoreState<TimeEntry>(Collections.TIME_ENTRIES);
 */
export function useFirestoreState<T extends { id: string }>(path: string) {
  const { data: firestoreData, loading, error, add, update, remove } = useCollection<T>(path);
  const [saving, setSaving] = useState(false);

  // Optimistic local overrides — items the user has edited but haven't
  // been flushed to Firestore yet.
  const [localOverrides, setLocalOverrides] = useState<Map<string, T>>(new Map());
  // Locally added items (not yet in Firestore snapshot)
  const [localAdds, setLocalAdds] = useState<Map<string, T>>(new Map());
  // Locally removed IDs (still in Firestore snapshot)
  const [localRemoves, setLocalRemoves] = useState<Set<string>>(new Set());

  // Merge Firestore data with local optimistic state
  const data = useMemo(() => {
    let merged = firestoreData
      .filter((item) => !localRemoves.has(item.id))
      .map((item) => localOverrides.get(item.id) ?? item);

    // Append locally added items that aren't in Firestore yet
    for (const [id, item] of localAdds) {
      if (!merged.some((m) => m.id === id)) {
        merged.push(item);
      }
    }

    return merged;
  }, [firestoreData, localOverrides, localAdds, localRemoves]);

  // Keep mutable refs so setData can close over the latest values
  // without needing them in its dependency array.
  const dataRef = useRef(data);
  dataRef.current = data;
  const addRef = useRef(add);
  addRef.current = add;
  const updateRef = useRef(update);
  updateRef.current = update;
  const removeRef = useRef(remove);
  removeRef.current = remove;

  // Debounce timer for update-only changes
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Map<string, T>>(new Map());

  const flushUpdates = useCallback(async () => {
    const pending = new Map(pendingUpdatesRef.current);
    pendingUpdatesRef.current = new Map();

    if (pending.size === 0) return;

    const ops: Promise<void>[] = [];
    for (const [, item] of pending) {
      const { id, ...rest } = item;
      ops.push(updateRef.current(id, rest as Partial<Omit<T, "id">>));
    }

    setSaving(true);
    try {
      await Promise.all(ops);
    } finally {
      // Clear overrides for items that have been written
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        for (const id of pending.keys()) {
          next.delete(id);
        }
        return next;
      });
      setSaving(false);
    }
  }, []);

  const setData = useCallback(
    async (newData: T[] | ((prev: T[]) => T[])) => {
      const currentData = dataRef.current;
      const resolved =
        typeof newData === "function" ? newData(currentData) : newData;

      // ── Diff ──────────────────────────────────────────
      const currentIds = new Set(currentData.map((d) => d.id));
      const nextIds = new Set(resolved.map((d) => d.id));

      const added = resolved.filter((item) => !currentIds.has(item.id));
      const removed = currentData.filter((item) => !nextIds.has(item.id));
      const updated = resolved.filter((item) => {
        if (!currentIds.has(item.id)) return false;
        const old = currentData.find((o) => o.id === item.id);
        return old && JSON.stringify(old) !== JSON.stringify(item);
      });

      // ── Apply optimistic local state immediately ──────
      if (updated.length > 0) {
        setLocalOverrides((prev) => {
          const next = new Map(prev);
          for (const item of updated) {
            next.set(item.id, item);
          }
          return next;
        });
      }
      if (added.length > 0) {
        setLocalAdds((prev) => {
          const next = new Map(prev);
          for (const item of added) {
            next.set(item.id, item);
          }
          return next;
        });
      }
      if (removed.length > 0) {
        setLocalRemoves((prev) => {
          const next = new Set(prev);
          for (const item of removed) {
            next.add(item.id);
          }
          return next;
        });
      }

      // ── Write to Firestore ────────────────────────────
      // Adds & removes flush immediately
      const immediateOps: Promise<void>[] = [];
      for (const item of added) immediateOps.push(addRef.current(item));
      for (const item of removed) immediateOps.push(removeRef.current(item.id));

      if (immediateOps.length > 0) {
        // Structural change — flush any pending updates too
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        const pendingItems = new Map(pendingUpdatesRef.current);
        pendingUpdatesRef.current = new Map();
        const flushOps = Array.from(pendingItems.values()).map((item) => {
          const { id, ...rest } = item;
          return updateRef.current(id, rest as Partial<Omit<T, "id">>);
        });

        setSaving(true);
        try {
          await Promise.all([...immediateOps, ...flushOps]);
        } finally {
          // Clear local optimistic state for completed writes
          setLocalAdds((prev) => {
            const next = new Map(prev);
            for (const item of added) next.delete(item.id);
            return next;
          });
          setLocalRemoves((prev) => {
            const next = new Set(prev);
            for (const item of removed) next.delete(item.id);
            return next;
          });
          setLocalOverrides((prev) => {
            const next = new Map(prev);
            for (const id of pendingItems.keys()) next.delete(id);
            return next;
          });
          setSaving(false);
        }
      }

      // Updates are debounced
      if (updated.length > 0) {
        for (const item of updated) {
          pendingUpdatesRef.current.set(item.id, item);
        }
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          flushUpdates();
        }, 2000);
      }
    },
    [flushUpdates]
  );

  return [data, setData, loading, saving, error] as const;
}
