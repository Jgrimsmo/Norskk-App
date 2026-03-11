"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortDirection } from "@/hooks/use-table-sort";

interface SortableHeaderProps {
  label: string;
  column: string;
  sortKey: string | null;
  sortDir: SortDirection;
  onToggle: (column: string) => void;
}

export function SortableHeader({
  label,
  column,
  sortKey,
  sortDir,
  onToggle,
}: SortableHeaderProps) {
  const active = sortKey === column;

  return (
    <button
      type="button"
      onClick={() => onToggle(column)}
      className="inline-flex items-center gap-1 text-xs font-semibold hover:text-primary transition-colors cursor-pointer"
    >
      {label}
      {active && sortDir === "asc" ? (
        <ArrowUp className="h-3 w-3 text-primary" />
      ) : active && sortDir === "desc" ? (
        <ArrowDown className="h-3 w-3 text-primary" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}
