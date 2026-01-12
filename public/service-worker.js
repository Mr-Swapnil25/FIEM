/**
 * EventEase Service Worker
 * Version: 1.0.0
 * 
 * Caching Strategies:
 * - Cache-First: App shell (HTML, manifest)
 * - Cache-First with background update: CDN libraries (esm.sh, cdn.tailwindcss.com)
 * - Stale-While-Revalidate: ESM imports
 * - Network-First with cache fallback: Images (picsum.photos)
 * - Network-Only: API calls (localStorage-based)
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Maximum items in dynamic cache
const MAX_DYNAMIC_CACHE_ITEMS = 50;

// Files to cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg'
];

// CDN patterns for cache-first with background update
const CDN_PATTERNS = [
  'esm.sh',
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net'
];

// Image patterns for network-first
const IMAGE_PATTERNS = [
  'picsum.photos',
  'images.unsplash.com'
];

/**
 * Logging utility for cache operations
 */
const log = {
  info: (message, ...args) => console.log(`[SW ${CACHE_VERSION}] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[SW ${CACHE_VERSION}] ${message}`, ...args),
  error: (message, ...args) => console.error(`[SW ${CACHE_VERSION}] ${message}`, ...args)
};

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
  log.info('Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        log.info('Caching static assets:', STATIC_ASSETS);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        log.info('Static assets cached successfully');
        // Skip waiting to activate immediately (silent update)
        return self.skipWaiting();
      })
      .catch((error) => {
        log.error('Failed to cache static assets:', error);
        throw error;
      })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  log.info('Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
        const cachesToDelete = cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
        
        if (cachesToDelete.length > 0) {
          log.info('Deleting old caches:', cachesToDelete);
        }
        
        return Promise.all(
          cachesToDelete.map((cacheName) => {
            log.info(`Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        log.info('Old caches cleaned up, claiming clients...');
        return self.clients.claim();
      })
      .then(() => {
        log.info('Service worker activated successfully');
      })
  );
});

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const itemsToDelete = keys.length - maxItems;
    log.info(`Cache ${cacheName} exceeded limit. Removing ${itemsToDelete} oldest items.`);
    
    // Delete oldest entries (first in the list)
    for (let i = 0; i < itemsToDelete; i++) {
      await cache.delete(keys[i]);
      log.info(`Removed from cache: ${keys[i].url}`);
    }
  }
}

/**
 * Cache-First Strategy
 * Used for: App shell (HTML, manifest)
 */
async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    log.info('Cache hit (cache-first):', request.url);
    return cachedResponse;
  }
  
  log.info('Cache miss (cache-first), fetching:', request.url);
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Cache-First with Background Update Strategy
 * Used for: CDN libraries (esm.sh, tailwindcss)
 */
async function cacheFirstWithBackgroundUpdate(request) {
  const cachedResponse = await caches.match(request);
  
  // Start background fetch regardless of cache status
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
        await limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
        log.info('Background update completed:', request.url);
      }
      return networkResponse;
    })
    .catch((error) => {
      log.warn('Background update failed:', request.url, error);
      return null;
    });
  
  if (cachedResponse) {
    log.info('Cache hit (cache-first-bg-update):', request.url);
    return cachedResponse;
  }
  
  log.info('Cache miss (cache-first-bg-update), waiting for network:', request.url);
  return fetchPromise;
}

/**
 * Stale-While-Revalidate Strategy
 * Used for: ESM imports
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
        await limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
        log.info('Revalidation completed:', request.url);
      }
      return networkResponse;
    })
    .catch((error) => {
      log.warn('Revalidation failed:', request.url, error);
      return null;
    });
  
  if (cachedResponse) {
    log.info('Returning stale response:', request.url);
    return cachedResponse;
  }
  
  log.info('No cached version, waiting for network:', request.url);
  return fetchPromise;
}

/**
 * Network-First with Cache Fallback Strategy
 * Used for: Images (picsum.photos)
 */
async function networkFirst(request) {
  try {
    log.info('Trying network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(IMAGE_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
      log.info('Network success, cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    log.warn('Network failed, checking cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      log.info('Cache fallback:', request.url);
      return cachedResponse;
    }
    
    log.error('No cache available:', request.url);
    throw error;
  }
}

/**
 * Check if URL matches any pattern in the list
 */
function matchesPattern(url, patterns) {
  return patterns.some((pattern) => url.includes(pattern));
}

/**
 * Check if request is for navigation (HTML page)
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          request.headers.get('accept')?.includes('text/html'));
}

/**
 * Fetch event - Route requests to appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests (API mutations)
  if (request.method !== 'GET') {
    log.info('Skipping non-GET request:', request.url);
    return;
  }
  
  // Skip chrome-extension and other non-http(s) protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (isNavigationRequest(request)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE)
        .catch(async () => {
          log.warn('Navigation failed, serving offline page');
          const offlineResponse = await caches.match('/offline.html');
          return offlineResponse || new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        })
    );
    return;
  }
  
  // Handle CDN resources (cache-first with background update)
  if (matchesPattern(request.url, CDN_PATTERNS)) {
    event.respondWith(
      cacheFirstWithBackgroundUpdate(request)
        .catch((error) => {
          log.error('CDN request failed:', request.url, error);
          return new Response('CDN unavailable', { status: 503 });
        })
    );
    return;
  }
  
  // Handle images (network-first with cache fallback)
  if (matchesPattern(request.url, IMAGE_PATTERNS)) {
    event.respondWith(
      networkFirst(request)
        .catch((error) => {
          log.error('Image request failed:', request.url, error);
          // Return a placeholder or error response for images
          return new Response('', { status: 404 });
        })
    );
    return;
  }
  
  // Handle manifest and icons (cache-first)
  if (request.url.includes('manifest.json') || 
      request.url.includes('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Handle ESM imports (stale-while-revalidate)
  if (url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.mjs') ||
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.tsx')) {
    event.respondWith(
      staleWhileRevalidate(request)
        .catch((error) => {
          log.error('JS request failed:', request.url, error);
          return new Response('Script unavailable', { status: 503 });
        })
    );
    return;
  }
  
  // Handle CSS (stale-while-revalidate)
  if (url.pathname.endsWith('.css')) {
    event.respondWith(
      staleWhileRevalidate(request)
        .catch((error) => {
          log.error('CSS request failed:', request.url, error);
          return new Response('/* CSS unavailable */', { 
            status: 503,
            headers: { 'Content-Type': 'text/css' }
          });
        })
    );
    return;
  }
  
  // Default: Stale-while-revalidate for other assets
  event.respondWith(
    staleWhileRevalidate(request)
      .catch((error) => {
        log.error('Request failed:', request.url, error);
        return new Response('Resource unavailable', { status: 503 });
      })
  );
});

/**
 * Message event - Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    log.info('Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    log.info('Cache clear requested');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      log.info('All caches cleared');
      event.ports[0].postMessage({ success: true });
    });
  }
});

log.info('Service worker script loaded');
