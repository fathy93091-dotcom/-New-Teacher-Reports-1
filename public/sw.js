// GoStars Assistant Service Worker
const CACHE_NAME = 'gostars-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Continue even if some individual assets fail
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Pass through non-GET, API, Firebase, Vite internal & dev source files
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('/@vite/') ||
    url.includes('/@fs/') ||
    url.includes('/@id/') ||
    url.includes('/node_modules/') ||
    url.includes('/src/') ||
    url.includes('.tsx') ||
    url.includes('.ts') ||
    url.includes('?t=') ||
    url.includes('?v=')
  ) {
    return;
  }

  // For static icons and manifest only, cache-first with network fallback
  if (url.endsWith('.svg') || url.endsWith('.png') || url.endsWith('.json')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // Network-first for other requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
