// Network-Only Strategy: لا تخزين مؤقت على الإطلاق للبيانات الحيوية
// هذا يضمن ظهور أي تغيير يجريه المشرف فوراً دون تأخير

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing - Network Only Mode');
  // لا نقوم بتخزين أي شيء هنا
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating - Network Only Mode');
  event.waitUntil(
    // حذف جميع الـ Caches القديمة
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[Service Worker] Deleting cache:', cacheName);
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
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-Only: جلب من الإنترنت فقط، بدون تخزين مؤقت
  event.respondWith(
    fetch(request)
      .then((response) => {
        console.log('[Service Worker] Fetched from network:', request.url);
        return response;
      })
      .catch((error) => {
        console.error('[Service Worker] Network request failed:', request.url, error);
        // إذا فشل الاتصال بالإنترنت، عرّف رسالة خطأ
        return new Response(
          JSON.stringify({
            error: 'لا يوجد اتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.'
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          }
        );
      })
  );
});

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
