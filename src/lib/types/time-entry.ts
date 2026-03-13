import type { ApprovalStatus } from "./common";

export type WorkType = "lump-sum" | "tm";

export interface TimeEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  employeeId: string;
  projectId: string;
  costCodeId: string;
  equipmentId: string;
  attachmentId: string;
  toolId: string;
  workType: WorkType;
  hours: number;
  notes: string;
  approval: ApprovalStatus;
}
