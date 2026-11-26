// Service worker de 22Fit: la app abre sin internet y se actualiza sola cuando hay conexión.
const VERSION = "rf-1795730237787";
const FONTS = "rf-fonts";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./brand/logo-22fit-v2.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" baja cada archivo del servidor, no de la caché del navegador, para no guardar uno viejo.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fuentes de Google: se guardan la primera vez y luego salen de la caché.
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // La página: siempre se pregunta al servidor por la versión nueva; sin internet, la copia guardada.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req.url, { cache: "no-cache" })
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Íconos, logos y demás archivos: primero la caché; lo nuevo se guarda al descargarlo.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
