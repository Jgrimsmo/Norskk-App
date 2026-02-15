"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface FilterOption {
  id: string;
  label: string;
}

interface ColumnFilterProps {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function ColumnFilter({
  title,
  options,
  selected,
  onChange,
}: ColumnFilterProps) {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggleOption = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(new Set());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-auto py-0.5 px-1 text-xs font-semibold gap-1 hover:bg-transparent ${
            activeCount > 0 ? "text-primary" : "text-foreground"
          }`}
        >
          {title}
          {activeCount > 0 && (
            <Badge className="h-4 min-w-[16px] px-1 text-[9px] rounded-full">
              {activeCount}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0" sideOffset={4}>
        {/* Search */}
        {options.length > 5 && (
          <div className="p-2 pb-0">
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        )}

        {/* Options */}
        <div className="max-h-[200px] overflow-y-auto p-2 space-y-0.5">
          {filtered.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.has(opt.id)}
                onCheckedChange={() => toggleOption(opt.id)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No results</p>
          )}
        </div>

        {/* Footer */}
        {activeCount > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs gap-1 text-muted-foreground"
                onClick={clearAll}
              >
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
