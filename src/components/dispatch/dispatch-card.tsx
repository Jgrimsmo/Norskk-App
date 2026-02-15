"use client";

import { X, Users, Wrench, Paperclip, Hammer } from "lucide-react";
import type { DispatchAssignment } from "@/lib/types/time-tracking";
import type { OnRemoveResource } from "./dispatch-helpers";
import { getProjectColor } from "./dispatch-helpers";
import {
  useEmployees,
  useProjects,
  useEquipment,
  useAttachments,
  useTools,
} from "@/hooks/use-firestore";

interface DispatchCardProps {
  dispatch: DispatchAssignment;
  onRemoveResource: OnRemoveResource;
}

export function DispatchCard({ dispatch, onRemoveResource }: DispatchCardProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const project = projects.find((p) => p.id === dispatch.projectId);
  const color = getProjectColor(dispatch.projectId, projects);

  return (
    <div className={`rounded-lg border-2 ${color.border} ${color.bg} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
        <span className={`text-sm font-semibold ${color.text}`}>
          {project?.name}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Employees */}
        {dispatch.employeeIds.length > 0 && (
          <ResourceGroup
            icon={<Users className="h-3 w-3" />}
            label="Employees"
            count={dispatch.employeeIds.length}
            items={dispatch.employeeIds.map((id) => ({
              id,
              name: employees.find((e) => e.id === id)?.name ?? id,
            }))}
            onRemove={(id) => onRemoveResource(dispatch.id, "employee", id)}
          />
        )}

        {/* Equipment */}
        {dispatch.equipmentIds.length > 0 && (
          <ResourceGroup
            icon={<Wrench className="h-3 w-3" />}
            label="Equipment"
            count={dispatch.equipmentIds.length}
            items={dispatch.equipmentIds.map((id) => ({
              id,
              name: equipment.find((e) => e.id === id)?.name ?? id,
            }))}
            onRemove={(id) => onRemoveResource(dispatch.id, "equipment", id)}
          />
        )}

        {/* Attachments */}
        {dispatch.attachmentIds.length > 0 && (
          <ResourceGroup
            icon={<Paperclip className="h-3 w-3" />}
            label="Attachments"
            count={dispatch.attachmentIds.length}
            items={dispatch.attachmentIds.map((id) => ({
              id,
              name: attachments.find((a) => a.id === id)?.name ?? id,
            }))}
            onRemove={(id) => onRemoveResource(dispatch.id, "attachment", id)}
          />
        )}

        {/* Tools */}
        {dispatch.toolIds.length > 0 && (
          <ResourceGroup
            icon={<Hammer className="h-3 w-3" />}
            label="Tools"
            count={dispatch.toolIds.length}
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
}

// ── Extracted repeated resource list pattern ──
function ResourceGroup({
  icon,
  label,
  count,
  items,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  items: { id: string; name: string }[];
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
        {icon}
        {label} ({count})
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-white/60 border text-xs group"
          >
            <span className="truncate">{item.name}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
