const CACHE_NAME = 'iscae-cache';
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS).catch((err) => {
        console.warn('[Service Worker] Cache addAll error:', err);
        return Promise.resolve();
      });
    }).then(() => {
      console.log('[Service Worker] Installation complete');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network First strategy for HTML/JSON, Cache First for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  
  // Network First strategy for HTML and JSON (content that changes frequently)
  if (request.headers.get('accept')?.includes('text/html') || 
      url.pathname.endsWith('.json') || 
      url.pathname === '/' ||
      url.pathname.endsWith('.html')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Update cache with new version
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
            console.log('[Service Worker] Updated cache for:', url.pathname);
          });
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          console.log('[Service Worker] Network failed, using cache for:', url.pathname);
          return caches.match(request);
        })
    );
  } 
  // Cache First strategy for assets (images, fonts, etc.)
  else {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            console.log('[Service Worker] Serving from cache:', url.pathname);
            return response;
          }
          
          return fetch(request).then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return response;
          });
        })
        .catch(() => {
          console.log('[Service Worker] Failed to fetch:', url.pathname);
          return caches.match(request);
        })
    );
  }
});

// Handle messages from clients for update notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skipping waiting and activating new version');
    self.skipWaiting();
  }
});
