"use client";

import { useState, useCallback, useMemo } from "react";

interface UseRowSelectionReturn<TId extends string = string> {
  /** Currently selected row ids */
  selected: Set<TId>;
  /** Number of selected rows */
  count: number;
  /** Whether a specific row is selected */
  isSelected: (id: TId) => boolean;
  /** Toggle a single row */
  toggle: (id: TId) => void;
  /** Select all from the given list */
  selectAll: (ids: TId[]) => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Whether all the given ids are selected */
  allSelected: (ids: TId[]) => boolean;
  /** Whether some (but not all) of the given ids are selected */
  someSelected: (ids: TId[]) => boolean;
}

export function useRowSelection<TId extends string = string>(): UseRowSelectionReturn<TId> {
  const [selected, setSelected] = useState<Set<TId>>(new Set());

  const toggle = useCallback((id: TId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: TId[]) => {
    setSelected(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (id: TId) => selected.has(id),
    [selected]
  );

  const allSelected = useCallback(
    (ids: TId[]) => ids.length > 0 && ids.every((id) => selected.has(id)),
    [selected]
  );

  const someSelected = useCallback(
    (ids: TId[]) => ids.some((id) => selected.has(id)) && !ids.every((id) => selected.has(id)),
    [selected]
  );

  const count = useMemo(() => selected.size, [selected]);

  return { selected, count, isSelected, toggle, selectAll, deselectAll, allSelected, someSelected };
}
