"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { DateRangePicker } from "@/components/time-tracking/date-range-picker";
import {
  getPayPeriod,
  getNextPayPeriod,
  getPreviousPayPeriod,
  getMonthRange,
  getNextMonth,
  getPreviousMonth,
  type PayPeriod,
} from "@/lib/utils/pay-period";

type FilterMode = "month" | "pay-period" | "custom";

interface PayPeriodPickerProps {
  period: PayPeriod | null;
  onPeriodChange: (period: PayPeriod | null) => void;
}

export function PayPeriodPicker({ period, onPeriodChange }: PayPeriodPickerProps) {
  const { profile, loading } = useCompanyProfile();
  const [mode, setMode] = React.useState<FilterMode>("pay-period");
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(undefined);

  const periodType = profile?.payPeriodType ?? "bi-weekly";
  const anchorDate = profile?.payPeriodStartDate ?? "";

  // Initialise to current pay period once profile loads
  React.useEffect(() => {
    if (!loading && !period) {
      const current = getPayPeriod(new Date(), periodType, anchorDate);
      onPeriodChange(current);
    }
  }, [loading, period, periodType, anchorDate, onPeriodChange]);

  // When custom date range changes, update the period
  React.useEffect(() => {
    if (mode !== "custom") return;
    if (customRange?.from && customRange?.to) {
      const label = `${format(customRange.from, "MMM d, yyyy")} – ${format(customRange.to, "MMM d, yyyy")}`;
      onPeriodChange({
        start: format(customRange.from, "yyyy-MM-dd"),
        end: format(customRange.to, "yyyy-MM-dd"),
        label,
      });
    }
  }, [customRange, mode, onPeriodChange]);

  const switchMode = (newMode: FilterMode) => {
    setMode(newMode);
    if (newMode === "month") {
      onPeriodChange(getMonthRange(new Date()));
    } else if (newMode === "pay-period") {
      onPeriodChange(getPayPeriod(new Date(), periodType, anchorDate));
    }
    // custom: keep current until user picks dates
  };

  if (loading || !period) return null;

  const goToPrevious = () => {
    if (mode === "month") {
      onPeriodChange(getPreviousMonth(period));
    } else if (mode === "pay-period") {
      onPeriodChange(getPreviousPayPeriod(period, periodType, anchorDate));
    }
  };

  const goToNext = () => {
    if (mode === "month") {
      onPeriodChange(getNextMonth(period));
    } else if (mode === "pay-period") {
      onPeriodChange(getNextPayPeriod(period, periodType, anchorDate));
    }
  };

  const goToCurrent = () => {
    if (mode === "month") {
      onPeriodChange(getMonthRange(new Date()));
    } else if (mode === "pay-period") {
      onPeriodChange(getPayPeriod(new Date(), periodType, anchorDate));
    }
  };

  // Determine if we're on the "current" period
  const currentPeriod =
    mode === "month"
      ? getMonthRange(new Date())
      : getPayPeriod(new Date(), periodType, anchorDate);
  const isCurrentPeriod =
    mode !== "custom" &&
    period.start === currentPeriod.start &&
    period.end === currentPeriod.end;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Mode toggle */}
      <div className="flex items-center rounded-lg border bg-card shadow-sm overflow-hidden">
        {(["month", "pay-period", "custom"] as FilterMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {m === "month" ? "Month" : m === "pay-period" ? "Pay Period" : "Custom"}
          </button>
        ))}
      </div>

      {/* Navigator (month / pay-period modes) */}
      {mode !== "custom" && (
        <>
          <div className="flex items-center gap-1 rounded-lg border bg-card px-1 py-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-2 min-w-[200px] justify-center">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">
                {period.label}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isCurrentPeriod && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs cursor-pointer"
              onClick={goToCurrent}
            >
              Current
            </Button>
          )}
        </>
      )}

      {/* Custom date range picker */}
      {mode === "custom" && (
        <DateRangePicker
          dateRange={customRange}
          onDateRangeChange={setCustomRange}
        />
      )}
    </div>
  );
}
