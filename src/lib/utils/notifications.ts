"use client";

import { create, getAll } from "@/lib/firebase/firestore";
import { Collections } from "@/lib/firebase/collections";
import { format } from "date-fns";
import { auth } from "@/lib/firebase/config";
import type { DispatchAssignment, AppNotification, Employee } from "@/lib/types/time-tracking";

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

  // Send push notifications via FCM
  await sendPushForNotifications(notifications);
}

/**
 * Look up FCM tokens for notification recipients and send push via the API route.
 */
async function sendPushForNotifications(
  notifications: Omit<AppNotification, "id">[],
) {
  try {
    // Get the current user's auth token to call our API
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const idToken = await currentUser.getIdToken();

    // Get all employees to look up FCM tokens
    const employees = await getAll<Employee>(Collections.EMPLOYEES);
    const tokenMap = new Map<string, string>();
    for (const emp of employees) {
      if (emp.fcmToken) tokenMap.set(emp.id, emp.fcmToken);
    }

    // Group notifications by recipient to batch messages
    const byRecipient = new Map<string, Omit<AppNotification, "id">[]>();
    for (const n of notifications) {
      const existing = byRecipient.get(n.recipientId) ?? [];
      existing.push(n);
      byRecipient.set(n.recipientId, existing);
    }

    // Send push for each recipient that has a token
    const pushPromises: Promise<Response>[] = [];
    for (const [recipientId, notifs] of byRecipient) {
      const token = tokenMap.get(recipientId);
      if (!token) continue;

      // Send the first notification as the push (or combine if multiple)
      const first = notifs[0];
      const title = notifs.length === 1
        ? first.title
        : `${notifs.length} dispatch updates`;
      const body = notifs.length === 1
        ? first.body
        : notifs.map((n) => n.body).join("\n");

      pushPromises.push(
        fetch("/api/admin/send-push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            tokens: [token],
            title,
            body,
            data: { type: first.type },
          }),
        })
      );
    }

    if (pushPromises.length > 0) {
      const pushResults = await Promise.allSettled(pushPromises);
      const pushFailed = pushResults.filter((r) => r.status === "rejected");
      if (pushFailed.length > 0) {
        console.error("[Push] Some push notifications failed:", pushFailed);
      }
    }
  } catch (err) {
    // Push failure should never block the main notification flow
    console.error("[Push] Failed to send push notifications:", err);
  }
}
