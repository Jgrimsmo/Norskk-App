"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ColumnDef } from "@/hooks/use-table-columns";

interface ColumnSettingsProps {
  columns: (ColumnDef & { visible: boolean })[];
  onToggle: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

export function ColumnSettings({ columns, onToggle, onReorder, onReset }: ColumnSettingsProps) {
  const toggleable = columns.filter((c) => !c.alwaysVisible);

  const reorder = (fromIdx: number, toIdx: number) => {
    const fromId = toggleable[fromIdx].id;
    const toId = toggleable[toIdx].id;
    const fromFull = columns.findIndex((c) => c.id === fromId);
    const toFull = columns.findIndex((c) => c.id === toId);
    if (fromFull !== -1 && toFull !== -1) onReorder(fromFull, toFull);
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 cursor-pointer">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent><p className="text-xs">Column settings</p></TooltipContent>
      </Tooltip>

      <PopoverContent className="w-56 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-semibold">Columns</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={onReset}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Reset to default</p></TooltipContent>
          </Tooltip>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {toggleable.map((col, idx) => (
            <div
              key={col.id}
              className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted/50"
            >
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 cursor-pointer"
                  disabled={idx === 0}
                  onClick={() => reorder(idx, idx - 1)}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 cursor-pointer"
                  disabled={idx === toggleable.length - 1}
                  onClick={() => reorder(idx, idx + 1)}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <label
                htmlFor={`col-toggle-${col.id}`}
                className="flex-1 text-xs cursor-pointer select-none"
              >
                {col.label}
              </label>
              <Switch
                id={`col-toggle-${col.id}`}
                checked={col.visible}
                onCheckedChange={() => onToggle(col.id)}
                className="scale-75"
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
