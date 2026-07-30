/* ISCAE PWA service worker — يجعل الموقع قابلاً للتثبيت ويعمل بشكل أسرع.
   لا يغيّر أي وظيفة من وظائف الموقع: الصفحات تُجلب من الشبكة أولاً،
   وطلبات Supabase/الـ API لا تُخزَّن إطلاقاً. */
const CACHE = "iscae-pwa-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // لا تتدخل في نداءات قواعد البيانات / المصادقة / أي واجهات برمجية
  if (/supabase|\/auth\/|\/rest\/|\/realtime\//i.test(url.href)) return;

  // التنقل بين الصفحات: الشبكة أولاً مع رجوع للنسخة المخزنة عند انقطاع الإنترنت
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || Response.error()))
    );
    return;
  }

  // الملفات الثابتة: من الذاكرة أولاً ثم تحديثها بالخلفية
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && (url.origin === self.location.origin || res.type === "cors")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
