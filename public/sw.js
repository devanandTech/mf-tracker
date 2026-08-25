const CACHE_NAME = 'mf-pulse-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Install Event: Pre-cache core shell safely
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching offline app shell');
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('[SW] Skipped missing asset during install:', asset);
        }
      }
    })
  );
});

// Activate Event: Delete ALL older caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Deleting stale cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. External API Requests (api.mfapi.in): Network-First, fallback to Cache
  if (url.hostname.includes('api.mfapi.in')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          console.log('[SW] Serving API from cache storage for', url.pathname);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response(
            JSON.stringify({
              status: 'SUCCESS',
              meta: { scheme_name: 'Cached Scheme (Offline)', fund_house: 'Offline Cache' },
              data: [],
              isOfflineFallback: true
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 2. HTML Navigation (Page load / PWA Launch): Network-First with Cache Fallback!
  // Prevents blank screen stuck state when new code is deployed!
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', copy.clone());
              cache.put('/', copy);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, serve cached index.html
          const cachedHtml = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedHtml) return cachedHtml;
          return new Response('<h1>Offline</h1><p>Please connect to internet.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // 3. Static Assets (JS/CSS/Images): Stale-While-Revalidate with error resilience
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
