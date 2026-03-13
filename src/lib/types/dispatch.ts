export interface DispatchAssignment {
  id: string;
  date: string;     // start date ISO YYYY-MM-DD
  endDate?: string; // end date ISO YYYY-MM-DD (if multi-day; omit or same as date for single day)
  projectId: string;
  employeeIds: string[];
  equipmentIds: string[];
  attachmentIds: string[];
  toolIds: string[];
  // Per-resource date overrides — if absent the resource covers the full dispatch span.
  // Each resource can have multiple non-contiguous ranges (e.g. Mon–Tue + Thu).
  resourceDates?: Record<string, { start: string; end: string }[]>;
}

export type DispatchView = "day" | "week" | "month";
