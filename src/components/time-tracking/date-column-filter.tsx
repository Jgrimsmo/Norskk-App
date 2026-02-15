"use client";

import * as React from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateColumnFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DateColumnFilter({
  dateRange,
  onDateRangeChange,
}: DateColumnFilterProps) {
  const [open, setOpen] = React.useState(false);
  const hasFilter = dateRange?.from && dateRange?.to;

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-auto py-0.5 px-1 text-xs font-semibold gap-1 hover:bg-transparent ${
            hasFilter ? "text-primary" : "text-foreground"
          }`}
        >
          Date
          {hasFilter && (
            <Badge className="h-4 min-w-[16px] px-1 text-[9px] rounded-full">
              <CalendarIcon className="h-2.5 w-2.5" />
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" sideOffset={4}>
        <div className="p-3 pb-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {dateRange?.from && dateRange?.to
              ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
              : "Select date range"}
          </p>
        </div>
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
        />
        {hasFilter && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs gap-1 text-muted-foreground"
                onClick={clearFilter}
              >
                <X className="h-3 w-3" />
                Clear date filter
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
