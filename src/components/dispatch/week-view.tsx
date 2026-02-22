"use client";

import { format, isToday } from "date-fns";
import { Users, Wrench, Paperclip, Hammer, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DispatchAssignment } from "@/lib/types/time-tracking";
import type { OnRemoveResource } from "./dispatch-helpers";
import { getProjectColor } from "./dispatch-helpers";
import { WeekDayAvailability } from "./available-resources";
import {
  useEmployees,
  useProjects,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";

interface WeekViewProps {
  days: Date[];
  getDispatches: (day: Date) => DispatchAssignment[];
  onAssign: (day: Date) => void;
  onRemoveResource: OnRemoveResource;
  hasSelection: boolean;
  onExpandDay: (day: Date) => void;
}

export function WeekView({
  days,
  getDispatches,
  onAssign,
  onRemoveResource,
  hasSelection,
  onExpandDay,
}: WeekViewProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  return (
    <div className="grid grid-cols-7 h-full divide-x">
      {days.map((day) => {
        const dayDispatches = getDispatches(day);
        const today = isToday(day);

        return (
          <div
            key={day.toISOString()}
            className={`flex flex-col min-h-0 ${
              hasSelection
                ? "cursor-pointer hover:bg-primary/5 transition-colors"
                : ""
            }`}
            onClick={() => hasSelection && onAssign(day)}
          >
            {/* Day header */}
            <div
              className={`p-2 border-b text-center shrink-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                today ? "bg-primary/10" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onExpandDay(day);
              }}
            >
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-base font-bold ${
                  today ? "text-primary" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </div>
            </div>

            {/* Day body */}
            <ScrollArea className="flex-1 p-1.5">
              <div className="space-y-1.5">
                {dayDispatches.map((dispatch) => {
                  const project = projects.find(
                    (p) => p.id === dispatch.projectId
                  );
                  const color = getProjectColor(dispatch.projectId, projects);

                  return (
                    <div
                      key={dispatch.id}
                      className={`rounded border bg-card border-l-4 ${color.accent} overflow-hidden`}
                    >
                      {/* Project name */}
                      <div className="px-1.5 pt-1.5 pb-1 text-[11px] font-bold text-foreground truncate border-b border-border/50">
                        {project?.name}
                      </div>

                      {/* Resource sections */}
                      <div className="px-1.5 py-1 space-y-1.5">
                        {dispatch.employeeIds.length > 0 && (
                          <ResourceSection
                            label="Crew"
                            icon={<Users className="h-2.5 w-2.5" />}
                            items={dispatch.employeeIds.map((id) => ({
                              id,
                              name: employees.find((e) => e.id === id)?.name ?? id,
                            }))}
                            onRemove={(id) => onRemoveResource(dispatch.id, "employee", id)}
                          />
                        )}
                        {dispatch.equipmentIds.length > 0 && (
                          <ResourceSection
                            label="Equipment"
                            icon={<Wrench className="h-2.5 w-2.5" />}
                            items={dispatch.equipmentIds.map((id) => ({
                              id,
                              name: equipment.find((e) => e.id === id)?.name ?? id,
                            }))}
                            onRemove={(id) => onRemoveResource(dispatch.id, "equipment", id)}
                          />
                        )}
                        {dispatch.attachmentIds.length > 0 && (
                          <ResourceSection
                            label="Attachments"
                            icon={<Paperclip className="h-2.5 w-2.5" />}
                            items={dispatch.attachmentIds.map((id) => ({
                              id,
                              name: attachments.find((a) => a.id === id)?.name ?? id,
                            }))}
                            onRemove={(id) => onRemoveResource(dispatch.id, "attachment", id)}
                          />
                        )}
                        {dispatch.toolIds.length > 0 && (
                          <ResourceSection
                            label="Tools"
                            icon={<Hammer className="h-2.5 w-2.5" />}
                            items={dispatch.toolIds.map((id) => ({
                              id,
                              name: tools.find((t) => t.id === id)?.name ?? id,
                            }))}
                            onRemove={(id) => onRemoveResource(dispatch.id, "tool", id)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayDispatches.length === 0 && (
                  <div className="text-center py-4">
                    <div className="text-xs text-muted-foreground/40">—</div>
                  </div>
                )}

                {/* Available resources summary */}
                <WeekDayAvailability dispatches={dayDispatches} />
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

// ── Titled resource section with list below ──
function ResourceSection({
  label,
  icon,
  items,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  items: { id: string; name: string }[];
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-foreground mb-0.5">
        {icon}
        {label}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-1 group">
            <span className="text-[11px] text-foreground leading-tight truncate">
              {item.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
