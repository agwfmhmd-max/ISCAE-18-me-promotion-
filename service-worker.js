// Network-Only Strategy: لا تخزين مؤقت للبيانات الحيوية
// كل طلب يذهب مباشرة للإنترنت

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (request.method !== 'GET') {
    return;
  }

  // Network-Only: جلب من الإنترنت فقط
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        // في حالة فشل الاتصال، نعود للـ cache إن وجد
        return caches.match(request);
      })
  );
});
