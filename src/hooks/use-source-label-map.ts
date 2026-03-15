import * as React from "react";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";

interface Named { id: string; name: string }
interface Numbered { id: string; name: string; number?: string }

/** Build a source→id→label map used by PDF exports for form fields with data sources. */
export function useSourceLabelMap(
  employees: Named[],
  projects: Named[],
  allEquipment: Numbered[],
  allAttachments: Numbered[],
  allTools: Numbered[],
) {
  return React.useMemo<Record<string, Record<string, string>>>(() => ({
    employees: Object.fromEntries(employees.map((e) => [e.id, e.name])),
    projects: Object.fromEntries(projects.map((p) => [p.id, p.name])),
    equipment: Object.fromEntries(
      allEquipment
        .filter((e) => e.id !== EQUIPMENT_NONE_ID)
        .map((e) => [e.id, e.number ? `${e.name} #${e.number}` : e.name])
    ),
    attachments: Object.fromEntries(
      allAttachments.map((a) => [a.id, a.number ? `${a.name} #${a.number}` : a.name])
    ),
    tools: Object.fromEntries(
      allTools.map((t) => [t.id, t.number ? `${t.name} #${t.number}` : t.name])
    ),
  }), [employees, projects, allEquipment, allAttachments, allTools]);
}
