"use client";

import * as React from "react";
import { Bell, BellRing, Truck, X, Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications, useEmployees } from "@/hooks/use-firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import type { AppNotification } from "@/lib/types/time-tracking";

const typeIcons: Record<AppNotification["type"], typeof Truck> = {
  "dispatch-assigned": Truck,
  "dispatch-changed": Truck,
  "dispatch-removed": Truck,
};

const typeColors: Record<AppNotification["type"], string> = {
  "dispatch-assigned": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "dispatch-changed": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "dispatch-removed": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: employees } = useEmployees();
  const { data: allNotifications, update: updateNotification, remove: removeNotification } = useNotifications();
  const { enabled: pushEnabled, loading: pushLoading, enablePush } = usePushNotifications();

  // Match current user to employee
  const currentEmployee = React.useMemo(() => {
    if (!user) return null;
    return (
      employees.find((e) => e.id === user.uid || e.uid === user.uid) ||
      employees.find((e) => e.email?.toLowerCase() === user.email?.toLowerCase()) ||
      null
    );
  }, [employees, user]);

  // Filter notifications for current employee, sorted newest first
  const myNotifications = React.useMemo(() => {
    if (!currentEmployee) return [];
    return allNotifications
      .filter((n) => n.recipientId === currentEmployee.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }, [allNotifications, currentEmployee]);

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markRead = async (id: string) => {
    await updateNotification(id, { read: true });
  };

  const markAllRead = async () => {
    await Promise.allSettled(
      myNotifications.filter((n) => !n.read).map((n) => updateNotification(n.id, { read: true }))
    );
  };

  const clearAll = async () => {
    await Promise.allSettled(
      myNotifications.map((n) => removeNotification(n.id))
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 cursor-pointer"
                  onClick={markAllRead}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              {myNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 cursor-pointer text-destructive hover:text-destructive"
                  onClick={clearAll}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={() => setOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Push notification enable prompt */}
          {!pushEnabled && (
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
              <BellRing className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-[10px] text-muted-foreground flex-1">Get push notifications</p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 cursor-pointer"
                disabled={pushLoading}
                onClick={enablePush}
              >
                {pushLoading ? "…" : "Enable"}
              </Button>
            </div>
          )}

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {myNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              myNotifications.map((notif) => {
                const Icon = typeIcons[notif.type];
                return (
                  <button
                    key={notif.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0 cursor-pointer ${
                      !notif.read ? "bg-muted/30" : ""
                    }`}
                    onClick={() => {
                      if (!notif.read) markRead(notif.id);
                    }}
                  >
                    <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${typeColors[notif.type]}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <Badge variant="default" className="h-4 px-1 text-[9px] rounded-full">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
