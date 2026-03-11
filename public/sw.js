// Norskk Field PWA Service Worker
// Handles offline caching for the field view and offline time entry queue.

const CACHE_NAME = "norskk-field-v1";
const OFFLINE_URL = "/field";

// App shell resources to pre-cache
const PRECACHE_URLS = [
  "/field",
  "/field/dispatch",
  "/field/entry",
  "/field/daily-report",
  "/field/time",
];

// ── Install: Pre-cache app shell ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ── Activate: Clean up old caches ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: Network-first with cache fallback for navigations ──
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // For navigation requests (HTML pages), use network-first strategy
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh response for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images), use cache-first strategy
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }
});

// ── Background Sync: Process queued time entries when back online ──
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-time-entries") {
    event.respondWith?.(syncQueuedEntries());
  }
});

async function syncQueuedEntries() {
  // This is handled client-side via the offline queue hook
  // The sync event serves as a trigger to notify the client
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_OFFLINE_ENTRIES" });
  }
}
