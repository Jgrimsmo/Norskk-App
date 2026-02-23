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
  onRemoveDispatch: (dispatchId: string) => void;
}

export function DispatchCard({ dispatch, onRemoveResource, onRemoveDispatch }: DispatchCardProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const project = projects.find((p) => p.id === dispatch.projectId);
  const color = getProjectColor(dispatch.projectId, projects);

  return (
    <div className="flex bg-card overflow-hidden shadow-md">
      {/* Project name cell */}
      <div className={`w-48 shrink-0 px-4 py-4 border-r border-border/30 flex items-start justify-between gap-2 ${color.bg}`}>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`text-base font-bold leading-snug shrink-0 ${color.text}`}>
            {project?.name}
          </span>
          {(project?.address || project?.city) && (
            <span className={`text-xs opacity-60 leading-snug truncate ${color.text}`}>
              {[project.address, project.city].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
        <button
          onClick={() => onRemoveDispatch(dispatch.id)}
          className="shrink-0 mt-0.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
          title="Remove project from this day"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      {items.length === 0 ? (
        <span className="text-sm text-muted-foreground/30">—</span>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-1 rounded bg-muted/60 border border-border/40 px-2 py-1">
              <span className="text-base text-foreground truncate">{item.name}</span>
              <button
                onClick={() => onRemove(item.id)}
                className="cursor-pointer shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
