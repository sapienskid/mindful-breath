// A more robust service worker with a clear caching strategy for offline support.

// --- CONFIGURATION ---

// Cache name: Increment this version number when you update assets.
const CACHE_NAME = 'mindful-breath-timer-v7'; 

// App Shell: List of essential files for your app to work offline.
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/dist/style.css',
  '/scripts/app.js',
  '/favicon.png',
  '/icon.svg',
  '/public/manifest.webmanifest',
  '/public/robots.txt',
  '/public/sitemap.xml',
  '/public/vendor/d3.min.js'
  // Add paths to other assets like fonts, icons, or manifest.json here.
];

// --- SERVICE WORKER LIFECYCLE ---

/**
 * Install Event
 * This event is triggered when the service worker is first installed.
 * We open a cache and add all the essential app shell assets to it.
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // Ensures the new service worker activates immediately once installed.
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell');
        // addAll is atomic - if one file fails, the whole cache operation fails.
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .catch(err => {
        console.error('[Service Worker] Installation failed:', err);
      })
  );
});

/**
 * Activate Event
 * This event is triggered after installation. It's the perfect place
 * to clean up old caches and ensure the new service worker takes control.
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // Ensures the activated service worker takes control of all open tabs/clients.
  self.clients.claim(); 
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Delete any caches that are not our current CACHE_NAME.
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// --- FETCH EVENT & CACHING STRATEGIES ---

/**
 * Fetch Event
 * This event intercepts every network request made by the application.
 * We can decide how to respond: from the cache, from the network, or a combination.
 */
self.addEventListener('fetch', (event) => {
  // We only handle GET requests. Other requests (POST, etc.) should pass through.
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Strategy 1: Stale-While-Revalidate for CSS, JS, and other static assets.
  // This strategy serves assets from the cache first for speed, then updates
  // the cache in the background with a fresh version from the network.
  if (APP_SHELL_ASSETS.includes(url.pathname) || url.pathname.startsWith('/public/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Strategy 2: Network-First for HTML/Navigation requests.
  // This ensures users always get the latest version of the page if they are online,
  // but falls back to the cached version if they are offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Default: For any other requests not handled above, use stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(event.request));
});


// --- CACHING STRATEGY IMPLEMENTATIONS ---

/**
 * Stale-While-Revalidate Strategy
 * Responds from cache immediately if available.
 * Then, fetches a fresh version from the network to update the cache for next time.
 * @param {Request} request The request to handle.
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    // Check for a valid response to cache
    if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(err => {
      console.warn(`[Service Worker] Network request for ${request.url} failed.`, err);
      // Optionally return a fallback asset here if needed.
  });

  // Return the cached response immediately if it exists, otherwise wait for the network.
  return cachedResponse || await fetchPromise;
}

/**
 * Network-First Strategy
 * Tries to fetch from the network first.
 * If the network fails (e.g., offline), it falls back to the cache.
 * @param {Request} request The request to handle.
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
    try {
        // Try to fetch a fresh response from the network.
        const networkResponse = await fetch(request);
        
        // If successful, update the cache with the new response.
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log(`[Service Worker] Network failed for ${request.url}, falling back to cache.`);
        // If the network fails, try to get the response from the cache.
        const cachedResponse = await caches.match(request);
        // Fallback to the main index.html for any navigation request.
        return cachedResponse || await caches.match('/');
    }
}
