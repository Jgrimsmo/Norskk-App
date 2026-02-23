import type {
  DispatchAssignment,
  Employee,
  Project,
  Equipment,
  Attachment,
  Tool,
} from "@/lib/types/time-tracking";

// ── Shared types ──

export type ResourceType = "employee" | "equipment" | "attachment" | "tool";

export type OnRemoveResource = (
  dispatchId: string,
  type: ResourceType,
  resourceId: string
) => void;

// ── ID generator ──

export function nextDispatchId(): string {
  return `dsp-${crypto.randomUUID().slice(0, 8)}`;
}

// ── Color palette per project ──

// All project cards share the same unified color (Wright Plan style)
const UNIFIED_COLOR = { bg: "bg-teal-700", bgBody: "bg-teal-600", border: "border-teal-800", text: "text-white", dot: "bg-teal-300", accent: "border-l-teal-500" };

export const PROJECT_COLORS = [
  UNIFIED_COLOR,
  UNIFIED_COLOR,
  UNIFIED_COLOR,
  UNIFIED_COLOR,
  UNIFIED_COLOR,
  UNIFIED_COLOR,
];

export function getProjectColor(projectId: string, projectsList: Project[]) {
  const idx = projectsList.findIndex((p) => p.id === projectId);
  if (idx < 0) return PROJECT_COLORS[0];
  return PROJECT_COLORS[idx % PROJECT_COLORS.length];
}

// ── Availability calculation ──

export function getAvailableResources(
  dayDispatches: DispatchAssignment[],
  activeEmps: Employee[],
  availEq: Equipment[],
  availAtt: Attachment[],
  availTl: Tool[]
) {
  const usedEmpIds = new Set(dayDispatches.flatMap((d) => d.employeeIds));
  const usedEqIds = new Set(dayDispatches.flatMap((d) => d.equipmentIds));
  const usedAttIds = new Set(dayDispatches.flatMap((d) => d.attachmentIds));
  const usedTlIds = new Set(dayDispatches.flatMap((d) => d.toolIds));

  return {
    employees: activeEmps.filter((e) => !usedEmpIds.has(e.id)),
    equipment: availEq.filter((e) => !usedEqIds.has(e.id)),
    attachments: availAtt.filter((a) => !usedAttIds.has(a.id)),
    tools: availTl.filter((t) => !usedTlIds.has(t.id)),
  };
}
