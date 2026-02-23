"use client";

import { format } from "date-fns";
import { Plus, Users, Wrench, Paperclip, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DispatchAssignment } from "@/lib/types/time-tracking";
import type { OnRemoveResource } from "./dispatch-helpers";
import { DispatchCard } from "./dispatch-card";
import { AvailableResourcesPanel } from "./available-resources";

interface DayViewProps {
  day: Date;
  dispatches: DispatchAssignment[];
  onAssign: () => void;
  onRemoveResource: OnRemoveResource;
  onRemoveDispatch: (dispatchId: string) => void;
  hasSelection: boolean;
}

export function DayView({
  day,
  dispatches,
  onAssign,
  onRemoveResource,
  onRemoveDispatch,
  hasSelection,
}: DayViewProps) {
  return (
    <div className="p-4 space-y-2">
      {hasSelection && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs cursor-pointer gap-1"
          onClick={onAssign}
        >
          <Plus className="h-3 w-3" />
          Assign selection to {format(day, "MMM d")}
        </Button>
      )}

      {dispatches.length === 0 && !hasSelection && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No dispatches for this day
        </div>
      )}

      {/* Table header */}
      {dispatches.length > 0 && (
        <div className="flex rounded-lg bg-muted/40 border overflow-hidden text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div className="w-48 shrink-0 px-4 py-2 border-r">Project</div>
          <div className="flex-1 grid grid-cols-4 divide-x min-w-0">
            <div className="px-3 py-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Crew</div>
            <div className="px-3 py-2 flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />Equipment</div>
            <div className="px-3 py-2 flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />Attachments</div>
            <div className="px-3 py-2 flex items-center gap-1.5"><Hammer className="h-3.5 w-3.5" />Tools</div>
          </div>
        </div>
      )}

      {dispatches.map((dispatch) => (
        <DispatchCard
          key={dispatch.id}
          dispatch={dispatch}
          onRemoveResource={onRemoveResource}
          onRemoveDispatch={onRemoveDispatch}
        />
      ))}

      {/* Available resources */}
      <AvailableResourcesPanel dispatches={dispatches} />
    </div>
  );
}
