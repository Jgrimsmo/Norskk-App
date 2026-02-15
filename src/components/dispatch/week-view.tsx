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
              className={`p-2 border-b text-center shrink-0 ${
                today ? "bg-primary/10" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-base font-semibold ${
                  today ? "text-primary" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </div>
            </div>

            {/* Day body */}
            <ScrollArea className="flex-1 p-1.5">
              <div className="space-y-2">
                {dayDispatches.map((dispatch) => {
                  const project = projects.find(
                    (p) => p.id === dispatch.projectId
                  );
                  const color = getProjectColor(dispatch.projectId, projects);

                  return (
                    <div
                      key={dispatch.id}
                      className={`rounded-md px-2 py-2 border ${color.bg} ${color.border}`}
                    >
                      {/* Project header */}
                      <div className={`text-xs font-semibold ${color.text} truncate mb-1.5`}>
                        {project?.name}
                      </div>

                      {/* Resource lists */}
                      <div className="space-y-1">
                        {dispatch.employeeIds.length > 0 && (
                          <ResourceList
                            icon={<Users className={`h-3 w-3 shrink-0 ${color.text} opacity-60`} />}
                            items={dispatch.employeeIds.map((id) => ({
                              id,
                              name: employees.find((e) => e.id === id)?.name ?? id,
                            }))}
                            color={color.text}
                            onRemove={(id) => {
                              onRemoveResource(dispatch.id, "employee", id);
                            }}
                          />
                        )}
                        {dispatch.equipmentIds.length > 0 && (
                          <ResourceList
                            icon={<Wrench className={`h-3 w-3 shrink-0 ${color.text} opacity-60`} />}
                            items={dispatch.equipmentIds.map((id) => ({
                              id,
                              name: equipment.find((e) => e.id === id)?.name ?? id,
                            }))}
                            color={color.text}
                            onRemove={(id) => {
                              onRemoveResource(dispatch.id, "equipment", id);
                            }}
                          />
                        )}
                        {dispatch.attachmentIds.length > 0 && (
                          <ResourceList
                            icon={<Paperclip className={`h-3 w-3 shrink-0 ${color.text} opacity-60`} />}
                            items={dispatch.attachmentIds.map((id) => ({
                              id,
                              name: attachments.find((a) => a.id === id)?.name ?? id,
                            }))}
                            color={color.text}
                            onRemove={(id) => {
                              onRemoveResource(dispatch.id, "attachment", id);
                            }}
                          />
                        )}
                        {dispatch.toolIds.length > 0 && (
                          <ResourceList
                            icon={<Hammer className={`h-3 w-3 shrink-0 ${color.text} opacity-60`} />}
                            items={dispatch.toolIds.map((id) => ({
                              id,
                              name: tools.find((t) => t.id === id)?.name ?? id,
                            }))}
                            color={color.text}
                            onRemove={(id) => {
                              onRemoveResource(dispatch.id, "tool", id);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayDispatches.length === 0 && (
                  <div className="text-center py-4">
                    <div className="text-xs text-muted-foreground/50">—</div>
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

// ── Inline resource list with per-item delete ──
function ResourceList({
  icon,
  items,
  color,
  onRemove,
}: {
  icon: React.ReactNode;
  items: { id: string; name: string }[];
  color: string;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-1 group">
          {icon}
          <span className={`text-[11px] ${color} leading-tight truncate`}>
            {item.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
    </div>
  );
}
