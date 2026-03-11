"use client";

import { useState, useCallback, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

interface UseTableSortReturn<K extends string> {
  sortKey: K | null;
  sortDir: SortDirection;
  toggleSort: (key: K) => void;
  sortData: <T>(data: T[], accessor: (item: T, key: K) => string | number) => T[];
}

export function useTableSort<K extends string>(): UseTableSortReturn<K> {
  const [sortKey, setSortKey] = useState<K | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const toggleSort = useCallback(
    (key: K) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir(null);
      }
    },
    [sortKey, sortDir]
  );

  const sortData = useCallback(
    <T,>(data: T[], accessor: (item: T, key: K) => string | number): T[] => {
      if (!sortKey || !sortDir) return data;
      const sorted = [...data].sort((a, b) => {
        const aVal = accessor(a, sortKey);
        const bVal = accessor(b, sortKey);
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
        if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
      return sorted;
    },
    [sortKey, sortDir]
  );

  return { sortKey, sortDir, toggleSort, sortData };
}
