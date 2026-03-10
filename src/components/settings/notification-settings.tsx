"use client";

import { Bell, BellOff, BellRing, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationSettings() {
  const { enabled, loading, enablePush, disablePush } = usePushNotifications();

  const browserSupported =
    typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

  const permissionDenied =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "denied";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Manage how you receive notifications from Norskk.
        </p>
      </div>

      {/* Push notifications */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Push Notifications</h3>
              {enabled ? (
                <Badge variant="default" className="text-[10px] px-1.5">Enabled</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5">Disabled</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Receive browser push notifications for dispatch assignments, schedule changes, and removals — even when the app is in the background.
            </p>
          </div>
        </div>

        {!browserSupported ? (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Push notifications are not supported in this browser.
            </p>
          </div>
        ) : permissionDenied ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
            <BellOff className="h-4 w-4 text-destructive" />
            <p className="text-xs text-destructive">
              Notifications are blocked. Please enable them in your browser settings for this site.
            </p>
          </div>
        ) : enabled ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BellRing className="h-3.5 w-3.5" />
              You&apos;ll receive push notifications on this device.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer"
              disabled={loading}
              onClick={disablePush}
            >
              <BellOff className="h-3.5 w-3.5 mr-1.5" />
              Disable
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="text-xs cursor-pointer"
            disabled={loading}
            onClick={enablePush}
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {loading ? "Enabling…" : "Enable Push Notifications"}
          </Button>
        )}
      </div>

      {/* In-app notifications info */}
      <div className="rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">In-App Notifications</h3>
            <p className="text-xs text-muted-foreground">
              In-app notifications are always on. You&apos;ll see dispatch updates in the notification bell in the top bar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
