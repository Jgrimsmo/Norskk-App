"use client";

import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";
import type { TimeEntry } from "@/lib/types/time-tracking";

const QUEUE_KEY = "norskk-offline-time-entries";

function getQueue(): TimeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(entries: TimeEntry[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

/**
 * Hook that manages an offline queue for time entries.
 * Entries are saved to localStorage when offline and
 * automatically synced when connectivity returns.
 */
export function useOfflineQueue(
  addEntry: (entry: TimeEntry) => Promise<void>
) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Load initial count
  useEffect(() => {
    setPendingCount(getQueue().length);
  }, []);

  // Queue an entry for later sync
  const enqueue = useCallback((entry: TimeEntry) => {
    const queue = getQueue();
    queue.push(entry);
    setQueue(queue);
    setPendingCount(queue.length);
  }, []);

  // Process the queue
  const syncQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0 || syncing) return;

    setSyncing(true);
    const failed: TimeEntry[] = [];

    for (const entry of queue) {
      try {
        await addEntry(entry);
      } catch {
        failed.push(entry);
      }
    }

    setQueue(failed);
    setPendingCount(failed.length);
    setSyncing(false);

    const synced = queue.length - failed.length;
    if (synced > 0) {
      toast.success(`Synced ${synced} offline time ${synced === 1 ? "entry" : "entries"}`);
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} ${failed.length === 1 ? "entry" : "entries"} failed to sync`);
    }
  }, [addEntry, syncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };

    // Listen for SW sync messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_OFFLINE_ENTRIES") {
        syncQueue();
      }
    };

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Also try to sync on mount if online
    if (navigator.onLine && getQueue().length > 0) {
      syncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [syncQueue]);

  return { enqueue, syncQueue, pendingCount, syncing };
}
