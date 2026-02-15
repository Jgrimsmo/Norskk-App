"use client";

import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
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
  hasSelection: boolean;
}

export function DayView({
  day,
  dispatches,
  onAssign,
  onRemoveResource,
  hasSelection,
}: DayViewProps) {
  return (
    <div className="p-4 space-y-3">
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

      {dispatches.map((dispatch) => (
        <DispatchCard
          key={dispatch.id}
          dispatch={dispatch}
          onRemoveResource={onRemoveResource}
        />
      ))}

      {/* Available resources */}
      <AvailableResourcesPanel dispatches={dispatches} />
    </div>
  );
}
