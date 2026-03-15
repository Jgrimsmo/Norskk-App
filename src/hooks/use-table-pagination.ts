"use client";

import { useState, useCallback, useMemo } from "react";

export type PageSize = 25 | 50 | 100 | "all";
export const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: "all", label: "All" },
];

interface UseTablePaginationReturn<T> {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  page: number;
  setPage: (page: number) => void;
  /** Total number of pages (1 if "all") */
  totalPages: number;
  /** The paginated slice of data */
  paginatedData: T[];
  /** Total item count (before pagination) */
  totalItems: number;
}

export function useTablePagination<T>(
  data: T[],
  defaultPageSize: PageSize = 50
): UseTablePaginationReturn<T> {
  const [pageSize, setPageSizeRaw] = useState<PageSize>(defaultPageSize);
  const [page, setPage] = useState(0);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeRaw(size);
    setPage(0); // reset to first page on size change
  }, []);

  const totalItems = data.length;

  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Clamp page if data shrinks
  const clampedPage = useMemo(
    () => Math.min(page, totalPages - 1),
    [page, totalPages]
  );

  const paginatedData = useMemo(() => {
    if (pageSize === "all") return data;
    const start = clampedPage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, pageSize, clampedPage]);

  return {
    pageSize,
    setPageSize,
    page: clampedPage,
    setPage,
    totalPages,
    paginatedData,
    totalItems,
  };
}
