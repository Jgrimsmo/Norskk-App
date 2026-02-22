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
    <div className={`flex rounded-lg border bg-card overflow-hidden border-l-4 ${color.accent}`}>
      {/* Project name cell */}
      <div className="w-48 shrink-0 px-4 py-4 border-r flex items-start">
        <span className="text-sm font-bold text-foreground leading-snug">
          {project?.name}
        </span>
      </div>

      {/* Resource columns */}
      <div className="flex-1 grid grid-cols-4 divide-x min-w-0">
        <ResourceCell
          icon={<Users className="h-3.5 w-3.5" />}
          label="Crew"
          items={dispatch.employeeIds.map((id) => ({
            id,
            name: employees.find((e) => e.id === id)?.name ?? id,
          }))}
          onRemove={(id) => onRemoveResource(dispatch.id, "employee", id)}
        />
        <ResourceCell
          icon={<Wrench className="h-3.5 w-3.5" />}
          label="Equipment"
          items={dispatch.equipmentIds.map((id) => ({
            id,
            name: equipment.find((e) => e.id === id)?.name ?? id,
          }))}
          onRemove={(id) => onRemoveResource(dispatch.id, "equipment", id)}
        />
        <ResourceCell
          icon={<Paperclip className="h-3.5 w-3.5" />}
          label="Attachments"
          items={dispatch.attachmentIds.map((id) => ({
            id,
            name: attachments.find((a) => a.id === id)?.name ?? id,
          }))}
          onRemove={(id) => onRemoveResource(dispatch.id, "attachment", id)}
        />
        <ResourceCell
          icon={<Hammer className="h-3.5 w-3.5" />}
          label="Tools"
          items={dispatch.toolIds.map((id) => ({
            id,
            name: tools.find((t) => t.id === id)?.name ?? id,
          }))}
          onRemove={(id) => onRemoveResource(dispatch.id, "tool", id)}
        />
      </div>
    </div>
  );
}

// ── Resource column cell ──
function ResourceCell({
  icon,
  label,
  items,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  items: { id: string; name: string }[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="px-3 py-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      {items.length === 0 ? (
        <span className="text-xs text-muted-foreground/30">—</span>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-1 group">
              <span className="text-sm text-foreground truncate">{item.name}</span>
              <button
                onClick={() => onRemove(item.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
