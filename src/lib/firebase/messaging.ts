"use client";

import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { app } from "@/lib/firebase/config";

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
}

/** Build SW URL with Firebase config as query params */
function getSwUrl(): string {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
  const params = new URLSearchParams(config);
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

/**
 * Request notification permission and return the FCM token.
 * Returns `null` if the user denies permission or the browser doesn't support it.
 */
export async function requestFCMToken(): Promise<string | null> {
  const m = getMessagingInstance();
  if (!m) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.error("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set");
    return null;
  }

  const swRegistration = await navigator.serviceWorker.register(getSwUrl());

  // Wait for the service worker to become active before subscribing
  if (!swRegistration.active) {
    await new Promise<void>((resolve) => {
      const sw = swRegistration.installing ?? swRegistration.waiting;
      if (!sw) { resolve(); return; }
      sw.addEventListener("statechange", () => {
        if (sw.state === "activated") resolve();
      });
    });
  }

  const token = await getToken(m, {
    vapidKey,
    serviceWorkerRegistration: swRegistration,
  });

  return token;
}

/**
 * Listen for foreground messages. Returns an unsubscribe function.
 */
export function onForegroundMessage(callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void) {
  const m = getMessagingInstance();
  if (!m) return () => {};

  return onMessage(m, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });
  });
}
