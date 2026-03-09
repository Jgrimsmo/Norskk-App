"use client";

import { Users, Wrench, Paperclip, Hammer, CircleCheck, GripVertical, ChevronDown } from "lucide-react";
import React from "react";
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
  isDraggable = false,
  dayStr,
}: {
  dispatches: DispatchAssignment[];
  isDraggable?: boolean;
  dayStr?: string;
}) {
  const { activeEmployees, availableEquipment, availableAttachments, availableTools } =
    useActiveResources();

  const avail = getAvailableResources(
    dispatches,
    activeEmployees,
    availableEquipment,
    availableAttachments,
    availableTools,
    dayStr
  );
  const hasAny =
    avail.employees.length > 0 ||
    avail.equipment.length > 0 ||
    avail.attachments.length > 0 ||
    avail.tools.length > 0;

  const [empOpen, setEmpOpen] = React.useState(false);
  const [eqOpen, setEqOpen] = React.useState(false);
  const [attOpen, setAttOpen] = React.useState(false);
  const [tlOpen, setTlOpen] = React.useState(false);

  if (!hasAny) return null;

  return (
    <div className="mt-1.5 rounded-xl overflow-hidden shadow-sm border border-border bg-card border-l-4 border-l-emerald-500">
      {/* Header */}
      <div className="px-2 pt-2 pb-1.5 text-sm font-bold text-emerald-700 border-b border-border/50 flex items-center gap-1">
        <CircleCheck className="h-3 w-3 shrink-0" />
        Available
      </div>

      {/* Resource sections */}
      <div className="px-1.5 py-1 space-y-1.5">
        {avail.employees.length > 0 && (
          <div>
            <button
              onClick={() => setEmpOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground mb-1 w-full hover:text-foreground/70 transition-colors"
            >
              <Users className="h-2.5 w-2.5" /> Crew
              {!empOpen && <span className="ml-1 text-[10px] font-normal text-muted-foreground normal-case tracking-normal">{avail.employees.length}</span>}
              <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${empOpen ? "" : "-rotate-90"}`} />
            </button>
            {empOpen && (
              <div className="flex flex-col gap-0.5">
              {avail.employees.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center gap-1 rounded bg-background/60 border border-border/40 px-1.5 py-0.5 text-sm text-foreground leading-tight transition-colors${isDraggable ? " cursor-grab active:cursor-grabbing hover:bg-background" : ""}`}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? (ev) => { ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "employee", id: e.id })); ev.dataTransfer.effectAllowed = "copy"; } : undefined}
                >
                  {isDraggable && <GripVertical className="h-3 w-3 shrink-0 opacity-30" />}
                  <span className="truncate">{e.name}</span>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
        {avail.equipment.length > 0 && (
          <div>
            <button
              onClick={() => setEqOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground mb-1 w-full hover:text-foreground/70 transition-colors"
            >
              <Wrench className="h-2.5 w-2.5" /> Equipment
              {!eqOpen && <span className="ml-1 text-[10px] font-normal text-muted-foreground normal-case tracking-normal">{avail.equipment.length}</span>}
              <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${eqOpen ? "" : "-rotate-90"}`} />
            </button>
            {eqOpen && (
              <div className="flex flex-col gap-0.5">
              {avail.equipment.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center gap-1 rounded bg-background/60 border border-border/40 px-1.5 py-0.5 text-sm text-foreground leading-tight transition-colors${isDraggable ? " cursor-grab active:cursor-grabbing hover:bg-background" : ""}`}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? (ev) => { ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "equipment", id: e.id })); ev.dataTransfer.effectAllowed = "copy"; } : undefined}
                >
                  {isDraggable && <GripVertical className="h-3 w-3 shrink-0 opacity-30" />}
                  <span className="truncate">{e.name}</span>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
        {avail.attachments.length > 0 && (
          <div>
            <button
              onClick={() => setAttOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground mb-1 w-full hover:text-foreground/70 transition-colors"
            >
              <Paperclip className="h-2.5 w-2.5" /> Attachments
              {!attOpen && <span className="ml-1 text-[10px] font-normal text-muted-foreground normal-case tracking-normal">{avail.attachments.length}</span>}
              <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${attOpen ? "" : "-rotate-90"}`} />
            </button>
            {attOpen && (
              <div className="flex flex-col gap-0.5">
              {avail.attachments.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-1 rounded bg-background/60 border border-border/40 px-1.5 py-0.5 text-sm text-foreground leading-tight transition-colors${isDraggable ? " cursor-grab active:cursor-grabbing hover:bg-background" : ""}`}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? (ev) => { ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "attachment", id: a.id })); ev.dataTransfer.effectAllowed = "copy"; } : undefined}
                >
                  {isDraggable && <GripVertical className="h-3 w-3 shrink-0 opacity-30" />}
                  <span className="truncate">{a.name}</span>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
        {avail.tools.length > 0 && (
          <div>
            <button
              onClick={() => setTlOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground mb-1 w-full hover:text-foreground/70 transition-colors"
            >
              <Hammer className="h-2.5 w-2.5" /> Tools
              {!tlOpen && <span className="ml-1 text-[10px] font-normal text-muted-foreground normal-case tracking-normal">{avail.tools.length}</span>}
              <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${tlOpen ? "" : "-rotate-90"}`} />
            </button>
            {tlOpen && (
              <div className="flex flex-col gap-0.5">
              {avail.tools.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-1 rounded bg-background/60 border border-border/40 px-1.5 py-0.5 text-sm text-foreground leading-tight transition-colors${isDraggable ? " cursor-grab active:cursor-grabbing hover:bg-background" : ""}`}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? (ev) => { ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "tool", id: t.id })); ev.dataTransfer.effectAllowed = "copy"; } : undefined}
                >
                  {isDraggable && <GripVertical className="h-3 w-3 shrink-0 opacity-30" />}
                  <span className="truncate">{t.name}</span>
                </div>
              ))}
            </div>
            )}
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
  dayStr,
}: {
  dispatches: DispatchAssignment[];
  dayStr?: string;
}) {
  const { activeEmployees, availableEquipment, availableAttachments, availableTools } =
    useActiveResources();

  const avail = getAvailableResources(
    dispatches,
    activeEmployees,
    availableEquipment,
    availableAttachments,
    availableTools,
    dayStr
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
            <div key={emp.id} className="rounded bg-muted/60 border border-border/40 px-2 py-1 text-sm text-foreground truncate">
              {emp.name}
            </div>
          ))}
        </AvailCell>
        <AvailCell icon={<Wrench className="h-3.5 w-3.5" />} label="Equipment">
          {avail.equipment.map((eq) => (
            <div key={eq.id} className="rounded bg-muted/60 border border-border/40 px-2 py-1 text-sm text-foreground truncate">{eq.name}</div>
          ))}
        </AvailCell>
        <AvailCell icon={<Paperclip className="h-3.5 w-3.5" />} label="Attachments">
          {avail.attachments.map((att) => (
            <div key={att.id} className="rounded bg-muted/60 border border-border/40 px-2 py-1 text-sm text-foreground truncate">{att.name}</div>
          ))}
        </AvailCell>
        <AvailCell icon={<Hammer className="h-3.5 w-3.5" />} label="Tools">
          {avail.tools.map((tl) => (
            <div key={tl.id} className="rounded bg-muted/60 border border-border/40 px-2 py-1 text-sm text-foreground truncate">{tl.name}</div>
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
