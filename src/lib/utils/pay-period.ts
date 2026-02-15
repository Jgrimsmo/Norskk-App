import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  differenceInWeeks,
  parseISO,
  format,
  isBefore,
  isAfter,
} from "date-fns";
import type { PayPeriodType } from "@/lib/types/time-tracking";

export interface PayPeriod {
  /** ISO date string for the first day of the period */
  start: string;
  /** ISO date string for the last day of the period */
  end: string;
  /** Human-readable label */
  label: string;
}

// ────────────────────────────────────────────
// Core: compute the pay period that contains `refDate`
// ────────────────────────────────────────────

export function getPayPeriod(
  refDate: Date,
  periodType: PayPeriodType,
  anchorDateISO: string
): PayPeriod {
  switch (periodType) {
    case "weekly":
      return getWeeklyPeriod(refDate, anchorDateISO);
    case "bi-weekly":
      return getBiWeeklyPeriod(refDate, anchorDateISO);
    case "semi-monthly":
      return getSemiMonthlyPeriod(refDate);
    case "monthly":
      return getMonthlyPeriod(refDate);
  }
}

export function getNextPayPeriod(
  current: PayPeriod,
  periodType: PayPeriodType,
  anchorDateISO: string
): PayPeriod {
  const dayAfterEnd = addDays(parseISO(current.end), 1);
  return getPayPeriod(dayAfterEnd, periodType, anchorDateISO);
}

export function getPreviousPayPeriod(
  current: PayPeriod,
  periodType: PayPeriodType,
  anchorDateISO: string
): PayPeriod {
  const dayBeforeStart = addDays(parseISO(current.start), -1);
  return getPayPeriod(dayBeforeStart, periodType, anchorDateISO);
}

// ────────────────────────────────────────────
// Weekly
// ────────────────────────────────────────────

function getWeeklyPeriod(refDate: Date, anchorDateISO: string): PayPeriod {
  const anchor = anchorDateISO ? parseISO(anchorDateISO) : startOfWeek(refDate, { weekStartsOn: 1 });
  const anchorDay = anchor.getDay();
  // Find the most recent anchor weekday on or before refDate
  let start = new Date(refDate);
  while (start.getDay() !== anchorDay) {
    start = addDays(start, -1);
  }
  // If refDate is before anchor and we went forward, adjust
  if (isAfter(start, refDate)) {
    start = addDays(start, -7);
  }
  const end = addDays(start, 6);
  return makePeriod(start, end);
}

// ────────────────────────────────────────────
// Bi-Weekly
// ────────────────────────────────────────────

function getBiWeeklyPeriod(refDate: Date, anchorDateISO: string): PayPeriod {
  const anchor = anchorDateISO ? parseISO(anchorDateISO) : startOfWeek(refDate, { weekStartsOn: 1 });
  // Number of weeks since anchor
  const weeksDiff = differenceInWeeks(refDate, anchor);
  // Round down to nearest even number of weeks
  const periodIndex = Math.floor(weeksDiff / 2);
  const start = addWeeks(anchor, periodIndex * 2);
  // If start is after refDate (rounding issue), go back one period
  if (isAfter(start, refDate)) {
    const adjustedStart = addWeeks(start, -2);
    const end = addDays(adjustedStart, 13);
    return makePeriod(adjustedStart, end);
  }
  const end = addDays(start, 13);
  return makePeriod(start, end);
}

// ────────────────────────────────────────────
// Semi-Monthly (1st–15th, 16th–end)
// ────────────────────────────────────────────

function getSemiMonthlyPeriod(refDate: Date): PayPeriod {
  const day = refDate.getDate();
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  if (day <= 15) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return makePeriod(start, end);
  } else {
    const start = new Date(year, month, 16);
    const end = endOfMonth(refDate);
    return makePeriod(start, end);
  }
}

// ────────────────────────────────────────────
// Monthly (1st–end)
// ────────────────────────────────────────────

function getMonthlyPeriod(refDate: Date): PayPeriod {
  const start = startOfMonth(refDate);
  const end = endOfMonth(refDate);
  return makePeriod(start, end);
}

// ────────────────────────────────────────────
// Shared
// ────────────────────────────────────────────

function makePeriod(start: Date, end: Date): PayPeriod {
  const s = format(start, "yyyy-MM-dd");
  const e = format(end, "yyyy-MM-dd");
  const label = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  return { start: s, end: e, label };
}

// ────────────────────────────────────────────
// Month navigation (independent of pay period type)
// ────────────────────────────────────────────

export function getMonthRange(refDate: Date): PayPeriod {
  const start = startOfMonth(refDate);
  const end = endOfMonth(refDate);
  const label = format(start, "MMMM yyyy");
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd"), label };
}

export function getNextMonth(current: PayPeriod): PayPeriod {
  return getMonthRange(addMonths(parseISO(current.start), 1));
}

export function getPreviousMonth(current: PayPeriod): PayPeriod {
  return getMonthRange(subMonths(parseISO(current.start), 1));
}
