const CACHE = "towcalc-cache-v110";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./sw.js",
  "./default-data.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

const APP_SHELL = new Set([
  self.location.origin + "/",
  self.location.origin + "/index.html",
  self.location.origin + "/styles.css",
  self.location.origin + "/app.js",
  self.location.origin + "/manifest.json",
  self.location.origin + "/sw.js",
  self.location.origin + "/default-data.json"
]);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Network-first for app shell so new builds update without clearing site data/localStorage.
  if (url.origin === self.location.origin && (
      APP_SHELL.has(url.href) ||
      url.pathname === "/" ||
      url.pathname.endsWith("/index.html") ||
      url.pathname.endsWith("/styles.css") ||
      url.pathname.endsWith("/app.js") ||
      url.pathname.endsWith("/manifest.json") ||
      url.pathname.endsWith("/sw.js") ||
      url.pathname.endsWith("/default-data.json")
    )) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets/images/icons, with network fallback.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      })
    )
  );
});
