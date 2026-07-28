/* =========================================================
   sw.js — BLVCK TAXI service worker (network-first для кода)
   Код (html/js/css) всегда свежий с сети; кэш — только офлайн.
   При активации вычищает ВСЕ старые кэши и перехватывает
   управление сразу (skipWaiting + clients.claim), чтобы новые
   версии app.js / rto.js / styles.css доходили без ручного сброса.
   ========================================================= */
const CODE_CACHE = 'blvck-code-v9';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const names = await caches.keys();
      // удаляем ЛЮБОЙ старый кэш, кроме текущего — независимо от версии
      await Promise.all(names.filter(n => n !== CODE_CACHE).map(n => caches.delete(n)));
    } catch (e) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // чужие домены (api telegram, render) — не трогаем, пусть идут как есть
  if (url.origin !== self.location.origin) return;

  const path = url.pathname.toLowerCase();
  const isCode = path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')
              || path.endsWith('.json') || path.endsWith('.webmanifest')
              || path === '/' || path.endsWith('/index.html');

  if (isCode) {
    // NETWORK-FIRST: свежее с сети, кэш только как офлайн-fallback
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net && net.ok) {
          const cache = await caches.open(CODE_CACHE);
          cache.put(req, net.clone());
          return net;
        }
        throw 0;
      } catch (e) {
        const cache = await caches.open(CODE_CACHE);
        const cached = await cache.match(req);
        return cached || new Response('offline', { status: 503 });
      }
    })());
    return;
  }

  // прочее (картинки и т.п.) — cache-first
  e.respondWith((async () => {
    const cache = await caches.open(CODE_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && net.ok) cache.put(req, net.clone());
      return net;
    } catch (e) {
      return cached || new Response('offline', { status: 503 });
    }
  })());
});