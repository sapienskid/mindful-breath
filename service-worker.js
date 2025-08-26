// Improved service worker with immediate activation and network-first navigation handling
const CACHE_NAME = 'mindful-breath-timer-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/dist/style.css',
  '/scripts/app.js',
  '/public/vendor/d3.min.js'
];

self.addEventListener('install', (event) => {
  // Activate this worker immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => {
        // If asset caching fails, still allow install to complete
        console.warn('SW install: asset caching failed', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Take control of uncontrolled clients as soon as activated
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // only handle GET

  const request = event.request;

  // Treat navigation requests with network-first strategy so users get latest HTML
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If we got a valid response, update the cache and return it
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html')) // fallback to cached shell
    );
    return;
  }

  // For other GET requests, use cache-first but update cache in the background
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          // Only cache successful (status 200) responses from same-origin or CORS-allowed
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              try { cache.put(request, copy); } catch (e) { /* ignore put errors for opaque responses */ }
            });
          }
          return response;
        })
        .catch(() => null);

      // Return cached response if present, otherwise wait for network
      return cached || networkFetch;
    })
  );
});
