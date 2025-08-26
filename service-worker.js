// Improved service worker with immediate activation and better caching strategy
const CACHE_NAME = 'mindful-breath-timer-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/dist/style.css',
  '/scripts/app.js',
  '/public/vendor/d3.min.js'
];

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache critical assets first
        const criticalAssets = ['/', '/index.html', '/dist/style.css'];
        return cache.addAll(criticalAssets)
          .then(() => {
            // Cache non-critical assets (like D3) separately
            const nonCriticalAssets = ['/scripts/app.js', '/public/vendor/d3.min.js'];
            return Promise.allSettled(
              nonCriticalAssets.map(asset => 
                fetch(asset).then(response => {
                  if (response.ok) {
                    return cache.put(asset, response);
                  }
                }).catch(() => console.log(`Failed to cache: ${asset}`))
              )
            );
          });
      })
      .catch(err => console.warn('SW install failed:', err))
  );
});

// Activate event - clean old caches and take control
self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
           .map(key => caches.delete(key))
      )
    )
  );
});

// Fetch event - optimized caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const request = event.request;
  const url = new URL(request.url);
  
  // Handle navigation requests (HTML)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      // Try network first for HTML to get latest content
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached HTML
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Handle static assets (CSS, JS, images)
  if (url.pathname.includes('.css') || url.pathname.includes('.js') || url.pathname.includes('/public/')) {
    event.respondWith(
      // Cache first for static assets
      caches.match(request)
        .then(cached => {
          if (cached) {
            // Update cache in background
            fetch(request)
              .then(response => {
                if (response && response.ok) {
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, response.clone()))
                    .catch(() => {});
                }
              })
              .catch(() => {});
            return cached;
          }
          
          // Not in cache, fetch from network
          return fetch(request)
            .then(response => {
              if (response && response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(request, copy))
                  .catch(() => {});
              }
              return response;
            });
        })
    );
    return;
  }
  
  // For other requests, just try network then cache
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});