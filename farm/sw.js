// Network-first service worker: always tries the network, falls back to the cache when offline.
const CACHE = "tinyvalley-v21";
const FILES = ["./", "index.html", "main.js", "data.js", "world.js", "audio.js", "sprites.js", "px.js", "art.js", "art2.js", "touch.js", "pack.js", "art3.js", "art4.js", "art5.js", "art6.js", "events.js", "builder.js", "view.js", "fx.js", "intro.js", "i18n.js", "hu.js", "settings.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res;
  }).catch(() => caches.match(e.request)));
});
