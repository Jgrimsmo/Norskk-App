"use client";

import { Users, Wrench, Paperclip, Hammer, CircleCheck } from "lucide-react";
import type { DispatchAssignment } from "@/lib/types/time-tracking";
import { EQUIPMENT_NONE_ID } from "@/lib/firebase/collections";
import {
  useEmployees,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";
import { getAvailableResources } from "./dispatch-helpers";

// ── Shared resource filtering ──

function useActiveResources() {
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const activeEmployees = employees.filter((e) => e.status === "active");
  const availableEquipment = equipment.filter(
    (e) => e.id !== EQUIPMENT_NONE_ID && e.status !== "retired"
  );
  const availableAttachments = attachments.filter((a) => a.status !== "retired");
  const availableTools = tools.filter(
    (t) => t.status !== "retired" && t.status !== "lost"
  );

  return { activeEmployees, availableEquipment, availableAttachments, availableTools };
}

// ────────────────────────────────────────────────────────
// Week Day Availability (compact, for week view columns)
// ────────────────────────────────────────────────────────
export function WeekDayAvailability({
  dispatches,
}: {
  dispatches: DispatchAssignment[];
}) {
  const { activeEmployees, availableEquipment, availableAttachments, availableTools } =
    useActiveResources();

  const avail = getAvailableResources(
    dispatches,
    activeEmployees,
    availableEquipment,
    availableAttachments,
    availableTools
  );
  const hasAny =
    avail.employees.length > 0 ||
    avail.equipment.length > 0 ||
    avail.attachments.length > 0 ||
    avail.tools.length > 0;

  if (!hasAny) return null;

  return (
    <div className="mt-1 pt-1 border-t border-dashed border-muted-foreground/20">
      <div className="flex items-center gap-1 mb-1">
        <CircleCheck className="h-2.5 w-2.5 text-green-600" />
        <span className="text-[9px] font-medium text-green-700">Available</span>
      </div>
      <div className="space-y-0.5">
        {avail.employees.length > 0 && (
          <div className="flex items-start gap-1">
            <Users className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.employees.map((e) => e.name.split(" ")[0]).join(", ")}
            </span>
          </div>
        )}
        {avail.equipment.length > 0 && (
          <div className="flex items-start gap-1">
            <Wrench className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.equipment.map((e) => e.name).join(", ")}
            </span>
          </div>
        )}
        {avail.attachments.length > 0 && (
          <div className="flex items-start gap-1">
            <Paperclip className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.attachments.map((a) => a.name).join(", ")}
            </span>
          </div>
        )}
        {avail.tools.length > 0 && (
          <div className="flex items-start gap-1">
            <Hammer className="h-2.5 w-2.5 mt-px shrink-0 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground leading-tight">
              {avail.tools.map((t) => t.name).join(", ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Available Resources Panel (expanded, for day view)
// ────────────────────────────────────────────────────────
export function AvailableResourcesPanel({
  dispatches,
}: {
  dispatches: DispatchAssignment[];
}) {
  const { activeEmployees, availableEquipment, availableAttachments, availableTools } =
    useActiveResources();

  const avail = getAvailableResources(
    dispatches,
    activeEmployees,
    availableEquipment,
    availableAttachments,
    availableTools
  );
  const hasAny =
    avail.employees.length > 0 ||
    avail.equipment.length > 0 ||
    avail.attachments.length > 0 ||
    avail.tools.length > 0;

  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-dashed border-green-300 bg-green-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CircleCheck className="h-4 w-4 text-green-600" />
        <span className="text-xs font-semibold text-green-800">Available Resources</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {avail.employees.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              Employees ({avail.employees.length})
            </div>
            <div className="space-y-0.5">
              {avail.employees.map((emp) => (
                <div key={emp.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {emp.name} <span className="text-[10px] text-muted-foreground">· {emp.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {avail.equipment.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Wrench className="h-3 w-3" />
              Equipment ({avail.equipment.length})
            </div>
            <div className="space-y-0.5">
              {avail.equipment.map((eq) => (
                <div key={eq.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {eq.name} <span className="text-[10px] text-muted-foreground">· {eq.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {avail.attachments.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Paperclip className="h-3 w-3" />
              Attachments ({avail.attachments.length})
            </div>
            <div className="space-y-0.5">
              {avail.attachments.map((att) => (
                <div key={att.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {att.name} <span className="text-[10px] text-muted-foreground">· {att.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {avail.tools.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
              <Hammer className="h-3 w-3" />
              Tools ({avail.tools.length})
            </div>
            <div className="space-y-0.5">
              {avail.tools.map((tl) => (
                <div key={tl.id} className="text-xs text-foreground px-1.5 py-0.5">
                  {tl.name} <span className="text-[10px] text-muted-foreground">· {tl.number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
