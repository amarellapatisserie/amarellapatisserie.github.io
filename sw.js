/* Service worker Amarella: membuat situs bisa dipasang sebagai aplikasi. Data selalu diambil langsung dari internet
 * (aplikasi butuh online); kalau internet putus, tampil halaman "Tidak ada internet". */
const CACHE = "amarella-shell-v6";
const FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/logo.png", "/tart.webp", "/favicon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
    .catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("/") : undefined))));
});

/* Notifikasi PO dari outlet (push dari server Amarella, tanpa isi): tampil walau aplikasi ditutup / di aplikasi lain. */
self.addEventListener("push", e => {
  e.waitUntil(self.registration.showNotification("PO baru dari outlet", {
    body: "Ada PO masuk dari outlet. Ketuk untuk membuka dan menerima PO.",
    icon: "/icon-192.png", badge: "/favicon.png", tag: "po-outlet", renotify: true, requireInteraction: true,
    vibrate: [600, 200, 600, 200, 600], data: { url: "/" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if (new URL(w.url).origin === self.location.origin && "focus" in w) return w.focus(); }
    return self.clients.openWindow("/");
  }));
});
