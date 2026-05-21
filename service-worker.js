const CACHE_NAME = "formuapp-pwa-v10";


const archivosAguardar = [

  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./compounds.js",
  "./manifest.json",
  "./icono-192.png",
  "./icono-512.png"

];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(archivosAguardar);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      if (respuestaCache) {
        return respuestaCache;
      }

      return fetch(event.request)
        .then((respuestaRed) => {
          if (!respuestaRed || respuestaRed.status !== 200 || respuestaRed.type !== "basic") {
            return respuestaRed;
          }

          const copiaRespuesta = respuestaRed.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copiaRespuesta);
          });

          return respuestaRed;
        })
        .catch(() => {
          return caches.match("./index.html");
        });
    })
  );
});