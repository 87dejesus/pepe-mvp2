// ─── The Steady One — Service Worker v3 ──────────────────────────────────────
//
// Caching rules:
//   /_next/*          → NEVER intercepted. Next.js sets Cache-Control:immutable
//                        on static chunks. Let the browser + CDN handle them.
//                        Intercepting them caused ChunkLoadError 404s after deploys
//                        because stale cached HTML referenced old chunk hashes.
//
//   navigations       → Network-first. Always fetch fresh HTML so the page shell
//                        has the correct chunk URLs for the current deployment.
//                        Fall back to cache only when offline.
//
//   /api/*            → Never intercepted (dynamic, auth-sensitive).
//
//   /brand/* images   → Cache-first. Immutable brand assets change rarely.
//
// Bumping CACHE_NAME forces all existing clients (v1, v2) to drop their stale
// caches on the next visit, eliminating any leftover broken chunk references.

const CACHE_NAME = 'steady-one-v3';

// Only precache truly static assets that never change between deploys.
// App-shell HTML routes are intentionally excluded — they must be fetched
// fresh so their embedded chunk URLs match the current deployment.
const PRECACHE_URLS = [
  '/manifest.json',
  '/brand/steady-one-white.png',
  '/brand/steady-one-blue.png',
  '/brand/heed-mascot.png',
  '/brand/icon-192x192.png',
  '/brand/icon-512x512.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Never intercept API routes
  if (url.pathname.startsWith('/api/')) return;

  // ── Critical: never intercept Next.js built assets ──────────────────────────
  // /_next/static/ chunks are content-hashed and served with Cache-Control:immutable.
  // Intercepting them caused stale cached chunks (old hash) to be served after
  // deploys, resulting in ChunkLoadError 404s. Let the browser handle these.
  if (url.pathname.startsWith('/_next/')) return;

  // ── HTML navigations — network-first ────────────────────────────────────────
  // Always try the network first so the HTML shell contains the chunk URLs for
  // the current deployment. Fall back to cache only when completely offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? caches.match('/'))
        )
    );
    return;
  }

  // ── Static brand assets — cache-first ───────────────────────────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
