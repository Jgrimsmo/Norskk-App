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

export const PROJECT_COLORS = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800", dot: "bg-cyan-500" },
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
