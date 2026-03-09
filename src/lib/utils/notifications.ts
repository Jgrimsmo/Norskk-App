"use client";

import { create } from "@/lib/firebase/firestore";
import { Collections } from "@/lib/firebase/collections";
import { format } from "date-fns";
import type { DispatchAssignment, AppNotification } from "@/lib/types/time-tracking";

// ── Helpers ──────────────────────────────────────────────

/** Normalise the per-resource date overrides to an array. */
function getResourceRanges(
  dispatch: DispatchAssignment,
  resourceId: string,
): { start: string; end: string }[] {
  const raw = dispatch.resourceDates?.[resourceId];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const obj = raw as { start?: string; end?: string };
  if (obj.start && obj.end) return [{ start: obj.start, end: obj.end }];
  return [];
}

/**
 * Build a human-readable date label for an *employee* within a dispatch.
 * Uses their `resourceDates` overrides if present, otherwise falls back to
 * the full dispatch span.
 */
function employeeDateLabel(dispatch: DispatchAssignment, empId: string): string {
  const ranges = getResourceRanges(dispatch, empId);
  if (ranges.length > 0) {
    return ranges
      .map((r) => (r.start === r.end ? r.start : `${r.start} – ${r.end}`))
      .join(", ");
  }
  // Fallback: full dispatch span
  if (dispatch.endDate && dispatch.endDate !== dispatch.date) {
    return `${dispatch.date} – ${dispatch.endDate}`;
  }
  return dispatch.date;
}

/** Return true if the employee's dates on this dispatch include today or later. */
function employeeIsTodayOrFuture(dispatch: DispatchAssignment, empId: string): boolean {
  const today = format(new Date(), "yyyy-MM-dd");
  const ranges = getResourceRanges(dispatch, empId);
  if (ranges.length > 0) {
    return ranges.some((r) => r.end >= today);
  }
  const endDate = dispatch.endDate ?? dispatch.date;
  return endDate >= today;
}

// ── Main ─────────────────────────────────────────────────

/**
 * Compare two snapshots of dispatch state and write notification
 * documents for employees who were newly assigned, moved to a
 * different project, or removed from a dispatch.
 */
export async function createDispatchNotifications(
  prev: DispatchAssignment[],
  next: DispatchAssignment[],
  projectLookup: (id: string) => string,
) {
  const notifications: Omit<AppNotification, "id">[] = [];
  const now = new Date().toISOString();

  const prevMap = new Map(prev.map((d) => [d.id, d]));
  const nextMap = new Map(next.map((d) => [d.id, d]));

  // 1. Detect new dispatches and newly-added employees
  for (const dispatch of next) {
    const old = prevMap.get(dispatch.id);
    const projectName = projectLookup(dispatch.projectId);

    if (!old) {
      // Entirely new dispatch — notify all assigned employees
      for (const empId of dispatch.employeeIds) {
        if (!employeeIsTodayOrFuture(dispatch, empId)) continue;
        const dateLabel = employeeDateLabel(dispatch, empId);
        notifications.push({
          recipientId: empId,
          type: "dispatch-assigned",
          title: "New Dispatch Assignment",
          body: `You've been dispatched to ${projectName} on ${dateLabel}.`,
          dispatchId: dispatch.id,
          projectId: dispatch.projectId,
          date: dispatch.date,
          read: false,
          createdAt: now,
        });
      }
    } else {
      // Existing dispatch — check each employee
      const oldEmployeeSet = new Set(old.employeeIds);
      const newEmployeeSet = new Set(dispatch.employeeIds);

      for (const empId of dispatch.employeeIds) {
        if (!oldEmployeeSet.has(empId)) {
          // Newly-added employee
          if (!employeeIsTodayOrFuture(dispatch, empId)) continue;
          const dateLabel = employeeDateLabel(dispatch, empId);
          notifications.push({
            recipientId: empId,
            type: "dispatch-assigned",
            title: "New Dispatch Assignment",
            body: `You've been dispatched to ${projectName} on ${dateLabel}.`,
            dispatchId: dispatch.id,
            projectId: dispatch.projectId,
            date: dispatch.date,
            read: false,
            createdAt: now,
          });
        } else {
          // Existing employee — check if their schedule (resourceDates) changed
          const oldLabel = employeeDateLabel(old, empId);
          const newLabel = employeeDateLabel(dispatch, empId);
          if (oldLabel !== newLabel && employeeIsTodayOrFuture(dispatch, empId)) {
            notifications.push({
              recipientId: empId,
              type: "dispatch-changed",
              title: "Schedule Updated",
              body: `Your dates at ${projectName} changed from ${oldLabel} to ${newLabel}.`,
              dispatchId: dispatch.id,
              projectId: dispatch.projectId,
              date: dispatch.date,
              read: false,
              createdAt: now,
            });
          }
        }
      }

      // Check for project change (same dispatch ID, different project)
      if (old.projectId !== dispatch.projectId) {
        const oldProjectName = projectLookup(old.projectId);
        for (const empId of dispatch.employeeIds) {
          if (!employeeIsTodayOrFuture(dispatch, empId)) continue;
          const dateLabel = employeeDateLabel(dispatch, empId);
          notifications.push({
            recipientId: empId,
            type: "dispatch-changed",
            title: "Dispatch Updated",
            body: `Your assignment changed from ${oldProjectName} to ${projectName} (${dateLabel}).`,
            dispatchId: dispatch.id,
            projectId: dispatch.projectId,
            date: dispatch.date,
            read: false,
            createdAt: now,
          });
        }
      }

      // Removed employees
      for (const empId of old.employeeIds) {
        if (newEmployeeSet.has(empId)) continue;
        if (!employeeIsTodayOrFuture(old, empId)) continue;
        const dateLabel = employeeDateLabel(old, empId);
        notifications.push({
          recipientId: empId,
          type: "dispatch-removed",
          title: "Dispatch Removed",
          body: `You've been removed from ${projectName} (${dateLabel}).`,
          dispatchId: dispatch.id,
          projectId: dispatch.projectId,
          date: dispatch.date,
          read: false,
          createdAt: now,
        });
      }
    }
  }

  // 2. Detect fully deleted dispatches → notify all previously assigned employees
  for (const old of prev) {
    if (nextMap.has(old.id)) continue;
    const projectName = projectLookup(old.projectId);
    for (const empId of old.employeeIds) {
      if (!employeeIsTodayOrFuture(old, empId)) continue;
      const dateLabel = employeeDateLabel(old, empId);
      notifications.push({
        recipientId: empId,
        type: "dispatch-removed",
        title: "Dispatch Cancelled",
        body: `Your assignment to ${projectName} (${dateLabel}) has been cancelled.`,
        dispatchId: old.id,
        projectId: old.projectId,
        date: old.date,
        read: false,
        createdAt: now,
      });
    }
  }

  // Write all notifications to Firestore
  if (notifications.length === 0) return;

  const results = await Promise.allSettled(
    notifications.map((n) => {
      const id = `notif-${crypto.randomUUID().slice(0, 12)}`;
      return create<AppNotification>(Collections.NOTIFICATIONS, { ...n, id });
    })
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("[Notifications] Failed to write notifications:", failed);
  }
}
