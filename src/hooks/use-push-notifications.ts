"use client";

import { useEffect, useCallback, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { update } from "@/lib/firebase/firestore";
import { Collections } from "@/lib/firebase/collections";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase/messaging";
import { toast } from "sonner";

/**
 * Manages FCM push notification lifecycle:
 * - Requests permission + token
 * - Stores token on the employee doc in Firestore
 * - Listens for foreground messages and shows toasts
 *
 * Returns helpers for manual enable/disable.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check current permission state on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setEnabled(Notification.permission === "granted");
    }
  }, []);

  // Listen for foreground messages when enabled
  useEffect(() => {
    if (!enabled) return;
    const unsub = onForegroundMessage((msg) => {
      toast(msg.title ?? "Notification", {
        description: msg.body,
      });
    });
    return unsub;
  }, [enabled]);

  /** Request permission, get token, store it on the employee doc */
  const enablePush = useCallback(async () => {
    if (!user) return false;
    setLoading(true);
    try {
      const token = await requestFCMToken();
      if (!token) {
        toast.error("Notifications blocked", {
          description: "Please allow notifications in your browser settings.",
        });
        setEnabled(false);
        return false;
      }

      // Save token to the employee's Firestore doc
      await update(Collections.EMPLOYEES, user.uid, {
        fcmToken: token,
      });

      setEnabled(true);
      return true;
    } catch (err) {
      console.error("[Push] Failed to enable:", err);
      toast.error("Failed to enable notifications");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** Clear the stored token */
  const disablePush = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await update(Collections.EMPLOYEES, user.uid, {
        fcmToken: "",
      });
      setEnabled(false);
    } catch (err) {
      console.error("[Push] Failed to disable:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { enabled, loading, enablePush, disablePush };
}
