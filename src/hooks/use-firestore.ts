"use client";

import { useCollection } from "@/hooks/use-collection";
import { Collections } from "@/lib/firebase/collections";
import type {
  Employee,
  Project,
  CostCode,
  Equipment,
  Attachment,
  Tool,
  TimeEntry,
  SafetyForm,
  DispatchAssignment,
  DailyReport,
  RolePermissions,
} from "@/lib/types/time-tracking";

// ── Core entities ───────────────────────────

export function useEmployees() {
  return useCollection<Employee>(Collections.EMPLOYEES);
}

export function useProjects() {
  return useCollection<Project>(Collections.PROJECTS);
}

export function useCostCodes() {
  return useCollection<CostCode>(Collections.COST_CODES);
}

export function useEquipment() {
  return useCollection<Equipment>(Collections.EQUIPMENT);
}

export function useAttachments() {
  return useCollection<Attachment>(Collections.ATTACHMENTS);
}

export function useTools() {
  return useCollection<Tool>(Collections.TOOLS);
}

// ── Operations ──────────────────────────────

export function useTimeEntries() {
  return useCollection<TimeEntry>(Collections.TIME_ENTRIES);
}

export function useSafetyForms() {
  return useCollection<SafetyForm>(Collections.SAFETY_FORMS);
}

export function useDispatches() {
  return useCollection<DispatchAssignment>(Collections.DISPATCHES);
}

export function useDailyReports() {
  return useCollection<DailyReport>(Collections.DAILY_REPORTS);
}

export function useRolePermissions() {
  return useCollection<RolePermissions>(Collections.ROLE_PERMISSIONS);
}
