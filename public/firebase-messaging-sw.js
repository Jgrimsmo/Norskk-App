// Firebase Messaging Service Worker
// This runs in the background to handle push notifications when the app is not in focus.

importScripts("https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js");

// Config is passed via query params when the SW is registered from messaging.ts
const params = new URL(self.location).searchParams;
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Norskk";
  const options = {
    body: payload.notification?.body ?? "",
    icon: "/icon-192",
    badge: "/icon-192",
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});
