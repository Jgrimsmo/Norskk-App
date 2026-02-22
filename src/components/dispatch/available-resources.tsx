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
    <div className="mt-1.5 rounded border bg-card border-l-4 border-l-green-500 overflow-hidden">
      {/* Header */}
      <div className="px-1.5 pt-1.5 pb-1 text-[11px] font-bold text-green-700 truncate border-b border-border/50 flex items-center gap-1">
        <CircleCheck className="h-3 w-3 shrink-0" />
        Available
      </div>

      {/* Resource sections */}
      <div className="px-1.5 py-1 space-y-1.5">
        {avail.employees.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground mb-0.5">
              <Users className="h-2.5 w-2.5" /> Crew
            </div>
            <div className="space-y-0.5">
              {avail.employees.map((e) => (
                <div key={e.id} className="text-[11px] text-foreground leading-tight truncate">{e.name}</div>
              ))}
            </div>
          </div>
        )}
        {avail.equipment.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground mb-0.5">
              <Wrench className="h-2.5 w-2.5" /> Equipment
            </div>
            <div className="space-y-0.5">
              {avail.equipment.map((e) => (
                <div key={e.id} className="text-[11px] text-foreground leading-tight truncate">{e.name}</div>
              ))}
            </div>
          </div>
        )}
        {avail.attachments.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground mb-0.5">
              <Paperclip className="h-2.5 w-2.5" /> Attachments
            </div>
            <div className="space-y-0.5">
              {avail.attachments.map((a) => (
                <div key={a.id} className="text-[11px] text-foreground leading-tight truncate">{a.name}</div>
              ))}
            </div>
          </div>
        )}
        {avail.tools.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground mb-0.5">
              <Hammer className="h-2.5 w-2.5" /> Tools
            </div>
            <div className="space-y-0.5">
              {avail.tools.map((t) => (
                <div key={t.id} className="text-[11px] text-foreground leading-tight truncate">{t.name}</div>
              ))}
            </div>
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
    <div className="flex rounded-lg border bg-card overflow-hidden border-l-4 border-l-green-500">
      {/* Label cell */}
      <div className="w-48 shrink-0 px-4 py-4 border-r flex items-start gap-2">
        <CircleCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <span className="text-sm font-bold text-green-700">Available</span>
      </div>

      {/* Resource columns */}
      <div className="flex-1 grid grid-cols-4 divide-x min-w-0">
        <AvailCell icon={<Users className="h-3.5 w-3.5" />} label="Crew">
          {avail.employees.map((emp) => (
            <div key={emp.id} className="text-sm text-foreground">
              {emp.name}
            </div>
          ))}
        </AvailCell>
        <AvailCell icon={<Wrench className="h-3.5 w-3.5" />} label="Equipment">
          {avail.equipment.map((eq) => (
            <div key={eq.id} className="text-sm text-foreground">{eq.name}</div>
          ))}
        </AvailCell>
        <AvailCell icon={<Paperclip className="h-3.5 w-3.5" />} label="Attachments">
          {avail.attachments.map((att) => (
            <div key={att.id} className="text-sm text-foreground">{att.name}</div>
          ))}
        </AvailCell>
        <AvailCell icon={<Hammer className="h-3.5 w-3.5" />} label="Tools">
          {avail.tools.map((tl) => (
            <div key={tl.id} className="text-sm text-foreground">{tl.name}</div>
          ))}
        </AvailCell>
      </div>
    </div>
  );
}

function AvailCell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const kids = Array.isArray(children) ? children : [children];
  const hasContent = kids.some(Boolean);
  return (
    <div className="px-3 py-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className="space-y-1.5">
        {hasContent ? children : <span className="text-xs text-muted-foreground/30">—</span>}
      </div>
    </div>
  );
}
