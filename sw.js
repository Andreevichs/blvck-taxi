/* Service Worker — код всегда свежий при наличии сети, офлайн из кеша.
   Стратегия для кода (html/js/css/manifest/svg/json и навигация) = network-first:
   при наличии сети берётся свежий файл с сервера (и кладётся в кеш),
   без сети — отдаётся последний закешенный. Остальное (напр. TG SDK) = cache-first.
   Поэтому после перезаливки app.js на Netlify новое подтянется сразу,
   а офлайн-режим по-прежнему работает. */
const CACHE = "blvck-taxi-v2";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
      .then(()=>self.clients.matchAll({type:"window"}).then(cs=>cs.forEach(c=>{ try{ c.navigate(c.url); }catch(_){} })))
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  const sameOrigin = url.origin === self.location.origin;
  const isAsset = sameOrigin && (req.mode === "navigate" || /\.(js|css|html|webmanifest|svg|json)$/i.test(url.pathname));

  if(isAsset){
    // network-first: свежий код при сети, кеш при офлайне
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
    );
    return;
  }

  // cache-first для остального (например telegram-web-app.js)
  e.respondWith(
    caches.match(req).then(hit => {
      if(hit) return hit;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match("./index.html"));
    })
  );
});