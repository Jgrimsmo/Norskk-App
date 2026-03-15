"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

export interface ColumnDef {
  /** Unique column id (e.g. "name", "status") */
  id: string;
  /** Display label shown in the settings panel */
  label: string;
  /** Whether the column is visible by default */
  defaultVisible?: boolean;
  /** If true, column cannot be hidden (e.g. checkbox, actions) */
  alwaysVisible?: boolean;
}

interface UseTableColumnsReturn {
  /** Ordered list of column ids that are currently visible */
  visibleColumns: string[];
  /** Full ordered column list with visibility state */
  columns: (ColumnDef & { visible: boolean })[];
  /** Toggle a column's visibility */
  toggleColumn: (id: string) => void;
  /** Move a column from one index to another */
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  /** Check if a specific column is visible */
  isVisible: (id: string) => boolean;
  /** Reset to defaults */
  reset: () => void;
}

function loadFromStorage(key: string): { order: string[]; hidden: string[] } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(key: string, order: string[], hidden: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ order, hidden }));
  } catch {
    // storage full or unavailable — ignore
  }
}

export function useTableColumns(
  storageKey: string,
  columnDefs: ColumnDef[]
): UseTableColumnsReturn {
  const defaultOrder = useMemo(() => columnDefs.map((c) => c.id), [columnDefs]);
  const defaultHidden = useMemo(
    () =>
      columnDefs
        .filter((c) => c.defaultVisible === false && !c.alwaysVisible)
        .map((c) => c.id),
    [columnDefs]
  );

  const [order, setOrder] = useState<string[]>(() => {
    const saved = loadFromStorage(storageKey);
    if (saved?.order) {
      // Merge: keep saved order, add any new columns not in saved
      const savedSet = new Set(saved.order);
      const validSaved = saved.order.filter((id) =>
        columnDefs.some((c) => c.id === id)
      );
      const newCols = defaultOrder.filter((id) => !savedSet.has(id));
      return [...validSaved, ...newCols];
    }
    return defaultOrder;
  });

  const [hidden, setHidden] = useState<Set<string>>(() => {
    const saved = loadFromStorage(storageKey);
    if (saved?.hidden) return new Set(saved.hidden);
    return new Set(defaultHidden);
  });

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(storageKey, order, Array.from(hidden));
  }, [storageKey, order, hidden]);

  const toggleColumn = useCallback(
    (id: string) => {
      const def = columnDefs.find((c) => c.id === id);
      if (def?.alwaysVisible) return;
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [columnDefs]
  );

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const isVisible = useCallback(
    (id: string) => {
      const def = columnDefs.find((c) => c.id === id);
      if (def?.alwaysVisible) return true;
      return !hidden.has(id);
    },
    [columnDefs, hidden]
  );

  const columns = useMemo(
    () =>
      order.map((id) => {
        const def = columnDefs.find((c) => c.id === id)!;
        return { ...def, visible: isVisible(id) };
      }).filter(Boolean),
    [order, columnDefs, isVisible]
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible).map((c) => c.id),
    [columns]
  );

  const reset = useCallback(() => {
    setOrder(defaultOrder);
    setHidden(new Set(defaultHidden));
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [defaultOrder, defaultHidden, storageKey]);

  return { visibleColumns, columns, toggleColumn, reorderColumns, isVisible, reset };
}
