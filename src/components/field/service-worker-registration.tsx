"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker for offline caching.
 * Renders nothing — just handles SW registration on mount.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Register after page load to not block initial rendering
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
    });
  }, []);

  return null;
}
