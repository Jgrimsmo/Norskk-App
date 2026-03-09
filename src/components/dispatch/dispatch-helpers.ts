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
  { bg: "bg-teal-700",  bgBody: "bg-teal-600",  border: "border-teal-800",  text: "text-white", dot: "bg-teal-300",  accent: "border-l-teal-500"  },
  { bg: "bg-zinc-700",  bgBody: "bg-zinc-600",  border: "border-zinc-800",  text: "text-white", dot: "bg-zinc-300",  accent: "border-l-zinc-500"  },
  { bg: "bg-neutral-800", bgBody: "bg-neutral-700", border: "border-neutral-900", text: "text-white", dot: "bg-neutral-400", accent: "border-l-neutral-500" },
  { bg: "bg-stone-700", bgBody: "bg-stone-600", border: "border-stone-800", text: "text-white", dot: "bg-stone-300", accent: "border-l-stone-500" },
  { bg: "bg-teal-800",  bgBody: "bg-teal-700",  border: "border-teal-900",  text: "text-white", dot: "bg-teal-200",  accent: "border-l-teal-600"  },
  { bg: "bg-zinc-600",  bgBody: "bg-zinc-500",  border: "border-zinc-700",  text: "text-white", dot: "bg-zinc-200",  accent: "border-l-zinc-400"  },
  { bg: "bg-slate-700", bgBody: "bg-slate-600", border: "border-slate-800", text: "text-white", dot: "bg-slate-300", accent: "border-l-slate-500" },
  { bg: "bg-teal-600",  bgBody: "bg-teal-500",  border: "border-teal-700",  text: "text-white", dot: "bg-teal-100",  accent: "border-l-teal-400"  },
];

export function getProjectColor(projectId: string, projectsList: Project[]) {
  // Hash the project ID so color is stable regardless of list order
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

// ── Availability calculation ──

// Returns true if a resource is actually active on this day, respecting resourceDates ranges.
function isResourceActiveOnDay(
  d: DispatchAssignment,
  resourceId: string,
  dayStr: string
): boolean {
  const ranges = d.resourceDates?.[resourceId];
  if (!ranges) return true; // no pin — covers full dispatch span
  const arr: { start: string; end: string }[] = Array.isArray(ranges)
    ? ranges
    : (ranges as { start?: string; end?: string }).start
      ? [ranges as { start: string; end: string }]
      : [];
  if (arr.length === 0) return true;
  return arr.some((r) => dayStr >= r.start && dayStr <= r.end);
}

export function getAvailableResources(
  dayDispatches: DispatchAssignment[],
  activeEmps: Employee[],
  availEq: Equipment[],
  availAtt: Attachment[],
  availTl: Tool[],
  dayStr?: string // if provided, respects per-resource date pins
) {
  const usedEmpIds = new Set(dayDispatches.flatMap((d) =>
    d.employeeIds.filter((id) => !dayStr || isResourceActiveOnDay(d, id, dayStr))
  ));
  const usedEqIds = new Set(dayDispatches.flatMap((d) =>
    d.equipmentIds.filter((id) => !dayStr || isResourceActiveOnDay(d, id, dayStr))
  ));
  const usedAttIds = new Set(dayDispatches.flatMap((d) =>
    d.attachmentIds.filter((id) => !dayStr || isResourceActiveOnDay(d, id, dayStr))
  ));
  const usedTlIds = new Set(dayDispatches.flatMap((d) =>
    d.toolIds.filter((id) => !dayStr || isResourceActiveOnDay(d, id, dayStr))
  ));

  return {
    employees: activeEmps.filter((e) => !usedEmpIds.has(e.id)),
    equipment: availEq.filter((e) => !usedEqIds.has(e.id)),
    attachments: availAtt.filter((a) => !usedAttIds.has(a.id)),
    tools: availTl.filter((t) => !usedTlIds.has(t.id)),
  };
}
