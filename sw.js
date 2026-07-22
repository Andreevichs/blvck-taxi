const CACHE_NAME = 'blvck-taxi-v1';
const STATIC_ASSETS = [
  '/blvck-taxi/',
  '/blvck-taxi/index.html',
  '/blvck-taxi/app.js',
  '/blvck-taxi/manifest.json',
  '/blvck-taxi/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .catch(() => caches.match('/blvck-taxi/offline.html'));
      })
  );
});