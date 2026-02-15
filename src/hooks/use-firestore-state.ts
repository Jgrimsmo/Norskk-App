"use client";

import { useCallback, useState } from "react";
import { useCollection } from "@/hooks/use-collection";

/**
 * A drop-in replacement for `useState<T[]>(initialData)` that is backed
 * by a Firestore collection with real-time sync.
 *
 * Returns `[data, setData, loading, saving, error]` — the setter accepts either
 * a new array or a functional update `(prev) => next`, diffs against
 * the current snapshot, and writes adds / updates / removes to Firestore.
 *
 * `saving` is true while a write operation is in progress.
 *
 * Usage:
 *   const [entries, setEntries, loading, saving] =
 *     useFirestoreState<TimeEntry>(Collections.TIME_ENTRIES);
 */
export function useFirestoreState<T extends { id: string }>(path: string) {
  const { data, loading, error, add, update, remove } = useCollection<T>(path);
  const [saving, setSaving] = useState(false);

  const setData = useCallback(
    async (newData: T[] | ((prev: T[]) => T[])) => {
      const resolved = typeof newData === "function" ? newData(data) : newData;

      // ── Diff ──────────────────────────────────────────
      const currentIds = new Set(data.map((d) => d.id));
      const nextIds = new Set(resolved.map((d) => d.id));

      const added = resolved.filter((item) => !currentIds.has(item.id));
      const removed = data.filter((item) => !nextIds.has(item.id));
      const updated = resolved.filter((item) => {
        if (!currentIds.has(item.id)) return false; // newly added
        const old = data.find((o) => o.id === item.id);
        return old && JSON.stringify(old) !== JSON.stringify(item);
      });

      // ── Write ─────────────────────────────────────────
      const ops: Promise<void>[] = [];
      for (const item of added) ops.push(add(item));
      for (const item of removed) ops.push(remove(item.id));
      for (const item of updated) {
        const { id, ...rest } = item;
        ops.push(update(id, rest as Partial<Omit<T, "id">>));
      }

      if (ops.length > 0) {
        setSaving(true);
        try {
          await Promise.all(ops);
        } finally {
          setSaving(false);
        }
      }
    },
    [data, add, update, remove]
  );

  return [data, setData, loading, saving, error] as const;
}
