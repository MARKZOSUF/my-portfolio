/*
 * ZOSUF service worker — Cloudflare Pages friendly, API-free.
 *
 * BUILD_ID is stamped at build time by scripts/ensure-pages-fallback.mjs from a
 * hash of the emitted assets. A new deploy therefore always produces a byte-
 * different sw.js, which is what forces browsers to install a fresh worker and
 * drop the previous cache. This is the fix for "stale page after reload".
 */
const BUILD_ID = '__ZOSUF_BUILD_ID__';
const CACHE = `zosuf-shell-${BUILD_ID}`;
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache:'reload' bypasses the HTTP cache so the shell is never precached stale.
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isHashedAsset(url) {
  return url.pathname.startsWith('/assets/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only ever touch our own origin. Cross-origin goes straight to the network.
  if (url.origin !== self.location.origin) return;

  // SPA deep links (/qr-scanner, /prank-qr, /image-to-qr, /p?d=...) are
  // network-first so a fresh index.html always wins, with the cached shell as
  // the offline fallback. Cloudflare Pages rewrites these to /index.html via
  // the _redirects file, so the response is a 200, not a 404.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put('/index.html', copy)));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || Response.error()))
    );
    return;
  }

  // Never cache anything carrying a query string: prank payloads (/p?d=…) and
  // cache-busted requests must not be served from a previous visitor's data.
  if (url.search) return;

  // Content-hashed bundles are immutable, so cache-first is safe and fast.
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok && response.type === 'basic') {
              const copy = response.clone();
              event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
            }
            return response;
          })
      )
    );
    return;
  }

  // Everything else (icons, manifest, sitemap, robots) is stale-while-revalidate:
  // instant from cache, refreshed in the background, so it can never pin an
  // outdated file across deploys.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok && response.type === 'basic') {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
