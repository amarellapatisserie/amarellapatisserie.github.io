/* Service worker Amarella: membuat situs bisa dipasang sebagai aplikasi. Data selalu diambil langsung dari internet
 * (aplikasi butuh online); kalau internet putus, tampil halaman "Tidak ada internet". */
const CACHE = "amarella-shell-v7";
const FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/logo.png", "/tart.webp", "/favicon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
    .catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("/") : undefined))));
});

/* Notifikasi PO dari outlet (push dari server Amarella): tampil walau aplikasi ditutup / sedang di aplikasi lain.
 * Teks diambil dari server (outlet, nomor PO, jumlah barang) memakai alamat push device ini sebagai kunci. */
const APP_URL = "https://script.google.com/macros/s/AKfycbz87NXrHetM_HHVDJYlCePGfeHrLp0s1o-NY0Ij77QEhhIimOij5jVe_wwH0wp_XFr3/exec";
async function poRingkas() {
  try {
    const sub = await self.registration.pushManager.getSubscription(); if (!sub) return null;
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(APP_URL + "?po=baru&ep=" + encodeURIComponent(sub.endpoint.slice(-40)) + "&t=" + Date.now(), { signal: ctl.signal });
    clearTimeout(t); const j = await r.json(); return j && j.po;
  } catch (e) { return null; }
}
self.addEventListener("push", e => {
  e.waitUntil((async () => {
    const po = await poRingkas();
    let title = "\u{1F514} ORDER OUTLET MASUK", body = "Ada PO baru dari outlet. Ketuk untuk membuka dan menerima PO.";
    if (po && po.length) {
      const outs = [...new Set(po.map(x => x.outlet))];
      title = "\u{1F514} ORDER " + outs.join(" + ").toUpperCase();
      body = po.map(x => x.noPO + " \u00b7 " + x.n + " barang" + (x.oleh ? " \u00b7 " + x.oleh : "")).join("\n") + "\nKetuk untuk menerima PO.";
    }
    await self.registration.showNotification(title, {
      body, icon: "/icon-192.png", badge: "/favicon.png", tag: "po-outlet", renotify: true, requireInteraction: true,
      vibrate: [800, 250, 800, 250, 800, 250, 800], data: { url: "/" }
    });
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if (new URL(w.url).origin === self.location.origin && "focus" in w) return w.focus(); }
    return self.clients.openWindow("/");
  }));
});
