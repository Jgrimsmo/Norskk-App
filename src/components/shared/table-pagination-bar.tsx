"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/hooks/use-table-pagination";

interface TablePaginationBarProps {
  selectedCount: number;
  totalItems: number;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
}

export function TablePaginationBar({
  selectedCount,
  totalItems,
  pageSize,
  onPageSizeChange,
}: TablePaginationBarProps) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground px-1 py-1">
      <span>Selected: {selectedCount}</span>
      <div className="flex items-center gap-3">
        <span>{totalItems} Results</span>
        <div className="flex items-center gap-1.5">
          <span>Show:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              onPageSizeChange(v === "all" ? "all" : (Number(v) as 25 | 50 | 100))
            }
          >
            <SelectTrigger className="h-7 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
