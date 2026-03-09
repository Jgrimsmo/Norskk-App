"use client";

import React from "react";
import { format, isToday } from "date-fns";
import { X, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DispatchAssignment } from "@/lib/types/time-tracking";
import type { OnRemoveResource, ResourceType } from "./dispatch-helpers";
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
  weekDispatches: DispatchAssignment[];
  onAssignRange: (startDay: Date, endDay: Date) => void;
  onRemoveResource: OnRemoveResource;
  onRemoveDispatch: (dispatchId: string) => void;
  onResizeDispatch: (dispatchId: string, newEndDate: string) => void;
  onUpdateResourceDates: (dispatchId: string, resourceId: string, rangeIndex: number, start: string, end: string) => void;
  onAddResource: (dispatchId: string, type: ResourceType, resourceId: string) => void;
  onAddResourceToDay: (dispatchId: string, type: ResourceType, resourceId: string, dayStr: string) => void;
  onAssignProjectToDay: (projectId: string, day: Date) => void;
  hasSelection: boolean;
  onExpandDay: (day: Date) => void;
  getDispatchesForDay: (day: Date) => import("@/lib/types/time-tracking").DispatchAssignment[];
}

// ── Row-packing for multi-day spanning cards ──
type PlacedDispatch = {
  dispatch: DispatchAssignment;
  startCol: number; // 0-indexed col
  endCol: number;   // 0-indexed col, inclusive
  row: number;      // 0-indexed visual row
};

function packDispatches(dispatches: DispatchAssignment[], days: Date[]): PlacedDispatch[] {
  const dayStrs = days.map((d) => format(d, "yyyy-MM-dd"));
  const placed: PlacedDispatch[] = [];
  const rows: { start: number; end: number }[][] = [];
  const sorted = [...dispatches].sort((a, b) => a.date.localeCompare(b.date));

  for (const dispatch of sorted) {
    const endDateStr = dispatch.endDate ?? dispatch.date;
    const startCol = dayStrs.findIndex((ds) => ds >= dispatch.date);
    let endCol = -1;
    for (let i = dayStrs.length - 1; i >= 0; i--) {
      if (dayStrs[i] <= endDateStr) { endCol = i; break; }
    }
    if (startCol === -1 || endCol === -1 || startCol > endCol) continue;

    let rowIdx = 0;
    while (rows[rowIdx]?.some((iv) => iv.start <= endCol && iv.end >= startCol)) rowIdx++;
    if (!rows[rowIdx]) rows[rowIdx] = [];
    rows[rowIdx].push({ start: startCol, end: endCol });
    placed.push({ dispatch, startCol, endCol, row: rowIdx });
  }
  return placed;
}

export function WeekView({
  days,
  weekDispatches,
  onAssignRange,
  onRemoveResource,
  onRemoveDispatch,
  onResizeDispatch,
  onUpdateResourceDates,
  onAddResource,
  onAddResourceToDay,
  onAssignProjectToDay,
  hasSelection,
  onExpandDay,
  getDispatchesForDay,
}: WeekViewProps) {
  const { data: employees } = useEmployees();
  const { data: projects } = useProjects();
  const { data: equipment } = useEquipment();
  const { data: attachments } = useAttachments();
  const { data: tools } = useTools();

  const [dragOverCell, setDragOverCell] = React.useState<{ dispatchId: string; dayStr: string } | null>(null);
  const [dragOverDayIdx, setDragOverDayIdx] = React.useState<number | null>(null);
  const [resizingId, setResizingId] = React.useState<string | null>(null);
  const [resizeEndCol, setResizeEndCol] = React.useState(0);
  const resizeMinColRef = React.useRef(0);

  type ChipResize = {
    dispatchId: string; resourceId: string; rangeIndex: number; edge: "start" | "end";
    barStartCol: number; barEndCol: number; cardStartCol: number; cardEndCol: number;
  };
  const [chipResizing, setChipResizing] = React.useState<ChipResize | null>(null);

  // Track whether any drag is in progress so the per-day drop overlay can show above resource bars
  const [isDraggingResource, setIsDraggingResource] = React.useState(false);
  React.useEffect(() => {
    const onStart = () => setIsDraggingResource(true);
    const onEnd = () => { setIsDraggingResource(false); setDragOverCell(null); setDragOverDayIdx(null); };
    window.addEventListener("dragstart", onStart);
    window.addEventListener("dragend", onEnd);
    return () => {
      window.removeEventListener("dragstart", onStart);
      window.removeEventListener("dragend", onEnd);
    };
  }, []);

  const dayStrs = React.useMemo(() => days.map((d) => format(d, "yyyy-MM-dd")), [days]);

  const placed = React.useMemo(
    () => packDispatches(weekDispatches, days),
    [weekDispatches, days]
  );

  // Commit resize / chip-resize on global mouseup
  React.useEffect(() => {
    const handleUp = () => {
      if (resizingId) {
        onResizeDispatch(resizingId, dayStrs[resizeEndCol]);
        setResizingId(null);
      }
      if (chipResizing) {
        const s = dayStrs[chipResizing.cardStartCol + chipResizing.barStartCol];
        const e = dayStrs[chipResizing.cardStartCol + chipResizing.barEndCol];
        onUpdateResourceDates(chipResizing.dispatchId, chipResizing.resourceId, chipResizing.rangeIndex, s, e);
        setChipResizing(null);
      }
    };
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [resizingId, resizeEndCol, dayStrs, onResizeDispatch, chipResizing, onUpdateResourceDates]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Day header row ── */}
      <div className="grid grid-cols-7 border-b border-border shrink-0">
        {days.map((day, idx) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={[
                "p-2 text-center border-r last:border-r-0 border-border select-none transition-colors",
                today ? "bg-primary/15" : "bg-muted/40",
                dragOverDayIdx === idx ? "bg-primary/30 ring-2 ring-inset ring-primary" : "",
                hasSelection ? "cursor-pointer hover:bg-primary/20" : "cursor-pointer hover:bg-muted/70",
              ].join(" ")}
              onClick={() => {
                if (hasSelection) onAssignRange(day, day);
                else onExpandDay(day);
              }}
              onDragOver={(e) => {
                try {
                  e.preventDefault();
                  setDragOverDayIdx(idx);
                } catch {}
              }}
              onDragLeave={() => setDragOverDayIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDayIdx(null);
                try {
                  const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                  if (data.type === "project") {
                    onAssignProjectToDay(data.id, day);
                  } else if (hasSelection) {
                    onAssignRange(day, day);
                  }
                } catch {
                  if (hasSelection) onAssignRange(day, day);
                }
              }}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {format(day, "EEE")}
              </div>
              <div className={`text-base font-bold ${today ? "text-primary" : "text-foreground"}`}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Spanning card grid body ── */}
      <ScrollArea className="flex-1">
        <div className="relative p-2">
          {/* Unified column overlays (card resize OR chip resize) */}
          {(resizingId || chipResizing) && (
            <div className="absolute inset-2 grid grid-cols-7 pointer-events-none z-20">
              {days.map((day, idx) => (
                <div
                  key={day.toISOString()}
                  className="pointer-events-auto"
                  onMouseEnter={() => {
                    if (resizingId) {
                      setResizeEndCol(Math.max(resizeMinColRef.current, idx));
                    } else if (chipResizing) {
                      const rel = idx - chipResizing.cardStartCol;
                      if (chipResizing.edge === "end") {
                        setChipResizing((p) => p ? { ...p, barEndCol: Math.max(p.barStartCol, Math.min(p.cardEndCol - p.cardStartCol, rel)) } : null);
                      } else {
                        setChipResizing((p) => p ? { ...p, barStartCol: Math.max(0, Math.min(p.barEndCol, rel)) } : null);
                      }
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Card grid */}
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "auto" }}
          >
            {placed.map(({ dispatch, startCol, endCol, row }) => {
              const project = projects.find((p) => p.id === dispatch.projectId);
              const color = getProjectColor(dispatch.projectId, projects);

              const isResizing = resizingId === dispatch.id;
              const displayEndCol = isResizing ? resizeEndCol : endCol;

              return (
                <div
                  key={dispatch.id}
                  style={{
                    gridColumn: `${startCol + 1} / span ${displayEndCol - startCol + 1}`,
                    gridRow: row + 1,
                  }}
                  className={[
                    "relative overflow-hidden shadow-sm transition-shadow",
                    isResizing ? "select-none" : "",
                  ].join(" ")}
                >
                  {/* Header */}
                  <div className={`pl-2 pr-1 py-1.5 flex items-center gap-2 border-b border-black/20 ${color.bg}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveDispatch(dispatch.id); }}
                      className={`shrink-0 cursor-pointer opacity-40 hover:opacity-100 transition-all ${color.text}`}
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                      <span className={`text-sm font-bold truncate shrink-0 ${color.text}`}>
                        {project?.name}
                      </span>
                      {(project?.address || project?.city) && (
                        <span className={`text-[10px] opacity-60 truncate ${color.text}`}>
                          {[project.address, project.city].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                    {/* GripVertical in header top-right acts as the card resize handle */}
                    <div
                      className={`shrink-0 p-0.5 cursor-col-resize opacity-40 hover:opacity-100 transition-all ${color.text}`}
                      title="Drag to extend"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        resizeMinColRef.current = startCol;
                        setResizeEndCol(endCol);
                        setResizingId(dispatch.id);
                      }}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Resize handle — right edge */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 bg-black/0 hover:bg-black/20 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      resizeMinColRef.current = startCol;
                      setResizeEndCol(endCol);
                      setResizingId(dispatch.id);
                    }}
                  />

                  {/* Body: column dividers + resource bars */}
                  {(() => {
                    const spanDays = displayEndCol - startCol + 1;
                    type ResourceItem = { id: string; type: "employee" | "equipment" | "attachment" | "tool"; name: string };
                    const resourceGroups: { label: string; items: ResourceItem[] }[] = [
                      { label: "Employees", items: dispatch.employeeIds.map((id) => ({ id, type: "employee" as const, name: employees.find((e) => e.id === id)?.name ?? id })) },
                      { label: "Equipment", items: dispatch.equipmentIds.map((id) => ({ id, type: "equipment" as const, name: equipment.find((e) => e.id === id)?.name ?? id })) },
                      { label: "Attachments", items: dispatch.attachmentIds.map((id) => ({ id, type: "attachment" as const, name: attachments.find((a) => a.id === id)?.name ?? id })) },
                      { label: "Tools", items: dispatch.toolIds.map((id) => ({ id, type: "tool" as const, name: tools.find((t) => t.id === id)?.name ?? id })) },
                    ].filter((g) => g.items.length > 0);
                    const allResources: ResourceItem[] = resourceGroups.flatMap((g) => g.items);

                    return (
                      <div className={`${color.bgBody} relative`}>
                        {/* Always-visible column dividers — pointer-events-none, purely visual */}
                        <div
                          className="absolute inset-0 grid z-0 pointer-events-none"
                          style={{ gridTemplateColumns: `repeat(${spanDays}, 1fr)` }}
                        >
                          {Array.from({ length: spanDays }).map((_, i) => (
                            <div
                              key={i}
                              className={i < spanDays - 1 ? "border-r border-black/20 h-full" : "h-full"}
                            />
                          ))}
                        </div>

                        {/* Per-day drop overlay — only rendered while dragging, sits above resource bars */}
                        {isDraggingResource && (
                          <div
                            className="absolute inset-0 grid z-20"
                            style={{ gridTemplateColumns: `repeat(${spanDays}, 1fr)` }}
                          >
                            {Array.from({ length: spanDays }).map((_, i) => {
                              const colDayStr = dayStrs[startCol + i];
                              return (
                                <div
                                  key={colDayStr}
                                  className={`h-full transition-colors${i < spanDays - 1 ? " border-r border-black/20" : ""}${
                                    dragOverCell?.dispatchId === dispatch.id && dragOverCell.dayStr === colDayStr
                                      ? " bg-white/25"
                                      : " hover:bg-white/15"
                                  }`}
                                  onDragOver={(e) => { e.preventDefault(); setDragOverCell({ dispatchId: dispatch.id, dayStr: colDayStr }); }}
                                  onDragLeave={() => setDragOverCell(null)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDraggingResource(false);
                                    setDragOverCell(null);
                                    try {
                                      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                                      onAddResourceToDay(dispatch.id, data.type, data.id, colDayStr);
                                    } catch {}
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Resource bars — inset by px-1 so bars sit inside column borders */}
                        {allResources.length > 0 ? (
                          <div className="py-0.5 relative z-10">
                            {resourceGroups.map(({ label, items }) => (
                              <React.Fragment key={label}>
                                {/* Section label */}
                                <div className="px-1 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-white/70 select-none">
                                  {label}
                                </div>
                                {items.map(({ id, type, name }) => {
                              // Build ranges: normalize to array (handles legacy single-object format), fall back to full dispatch span
                              const rawRanges = dispatch.resourceDates?.[id];
                              const storedRanges: { start: string; end: string }[] = !rawRanges
                                ? []
                                : Array.isArray(rawRanges)
                                  ? rawRanges
                                  : (rawRanges as { start?: string; end?: string }).start
                                    ? [{ start: (rawRanges as { start: string; end: string }).start, end: (rawRanges as { start: string; end: string }).end }]
                                    : [];
                              const ranges = storedRanges.length > 0
                                ? storedRanges
                                : [{ start: dispatch.date, end: dispatch.endDate ?? dispatch.date }];

                              // Compute bar positions for all ranges
                              const bars = ranges.map((range, rangeIndex) => {
                                const isChipResizingThis = chipResizing?.dispatchId === dispatch.id && chipResizing.resourceId === id && chipResizing.rangeIndex === rangeIndex;
                                const defaultBarStart = Math.max(0, dayStrs.indexOf(range.start) - startCol);
                                const defaultBarEnd = Math.min(spanDays - 1, Math.max(defaultBarStart, dayStrs.indexOf(range.end) - startCol));
                                const barStart = isChipResizingThis ? chipResizing!.barStartCol : defaultBarStart;
                                const barEnd = isChipResizingThis ? chipResizing!.barEndCol : defaultBarEnd;
                                return { rangeIndex, barStart, barEnd, defaultBarStart, defaultBarEnd };
                              }).filter(({ defaultBarStart, defaultBarEnd }) => defaultBarStart <= spanDays - 1 && defaultBarEnd >= 0);

                              if (bars.length === 0) return null;

                              const handleRemove = (rangeIndex: number) => {
                                if (ranges.length <= 1) {
                                  onRemoveResource(dispatch.id, type, id);
                                } else {
                                  onUpdateResourceDates(dispatch.id, id, rangeIndex, "", "");
                                }
                              };

                              return (
                                // One row per resource — all ranges rendered as bars inside the same grid
                                <div
                                  key={id}
                                  className="grid items-center"
                                  style={{ gridTemplateColumns: `repeat(${spanDays}, 1fr)`, minHeight: "1.5rem" }}
                                >
                                  {bars.map(({ rangeIndex, barStart, barEnd }) => {
                                    const barSpan = barEnd - barStart + 1;
                                    return (
                                      <div
                                        key={rangeIndex}
                                        className="relative flex items-center bg-white/20 border border-white/30 mx-1"
                                        style={{ gridColumn: `${barStart + 1} / span ${barSpan}`, gridRow: 1 }}
                                      >
                                        {/* Left resize handle */}
                                        <div
                                          className="shrink-0 self-stretch w-2 cursor-col-resize hover:bg-white/20 transition-colors"
                                          onMouseDown={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            setChipResizing({ dispatchId: dispatch.id, resourceId: id, rangeIndex, edge: "start", barStartCol: barStart, barEndCol: barEnd, cardStartCol: startCol, cardEndCol: displayEndCol });
                                          }}
                                        />
                                        {/* X delete */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleRemove(rangeIndex); }}
                                          className="shrink-0 text-white/50 hover:text-white cursor-pointer"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                        <span className="text-xs text-white truncate px-1.5 leading-snug flex-1">{name}</span>
                                        {/* Right resize handle */}
                                        <GripVertical
                                          className="h-3 w-3 text-white/40 shrink-0 cursor-col-resize hover:text-white/80 transition-colors"
                                          onMouseDown={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            setChipResizing({ dispatchId: dispatch.id, resourceId: id, rangeIndex, edge: "end", barStartCol: barStart, barEndCol: barEnd, cardStartCol: startCol, cardEndCol: displayEndCol });
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="py-2 text-center text-[10px] text-white/40 italic relative z-10 grid"
                            style={{ gridTemplateColumns: `repeat(${spanDays}, 1fr)` }}
                          >
                            {Array.from({ length: spanDays }).map((_, i) => {
                              const colDayStr = dayStrs[startCol + i];
                              return (
                                <div
                                  key={colDayStr}
                                  className="h-full"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    try {
                                      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                                      onAddResourceToDay(dispatch.id, data.type, data.id, colDayStr);
                                    } catch {}
                                  }}
                                >
                                  {i === Math.floor(spanDays / 2) && (
                                    <span>Drop resources here</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {/* Empty placeholder so grid has visible rows even when empty */}
            {placed.length === 0 && (
              <div
                style={{ gridColumn: "1 / span 7", gridRow: 1 }}
                className="py-10 text-center text-sm text-muted-foreground/40"
              >
                {hasSelection
                  ? "Click a day to assign. Then drag the right edge of a card to extend across days."
                  : "Select a project and resources to begin dispatching"}
              </div>
            )}
          </div>

          {/* ── Per-day availability row ── */}
          <div className="grid grid-cols-7 gap-0 border-t border-border/40 mt-2 pt-2">
            {days.map((day) => (
              <div key={day.toISOString()} className="px-1 border-r last:border-r-0 border-border/30">
                <WeekDayAvailability dispatches={getDispatchesForDay(day)} isDraggable={true} dayStr={format(day, "yyyy-MM-dd")} />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
