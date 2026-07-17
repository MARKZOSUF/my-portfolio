const CACHE_NAME = "markzosuf-ai-nexus-v17-0-0-command";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/404.html",
  "/privacy.html",
  "/terms.html",
  "/manifest.webmanifest",
  "/assets/styles.css?v=17.0.0",
  "/assets/advanced.css?v=17.0.0",
  "/assets/create-suite.css?v=17.0.0",
  "/assets/auth-ui.css?v=17.0.0",
  "/assets/pro-suite.css?v=17.0.0",
  "/assets/layout-fix-v9-1.css?v=17.0.0",
  "/assets/auth-startup-v9-1-final.css?v=17.0.0",
  "/assets/desktop-clean-v9-2.css?v=17.0.0",
  "/assets/nexus-v10.css?v=17.0.0",
  "/assets/realtime-v11.css?v=17.0.0",
  "/assets/stable-ui-v11-4.css?v=17.0.0",
  "/assets/stability-v11-5.css?v=17.0.0",
  "/assets/production-fix-v15-1-0.css?v=17.0.0",
  "/assets/advanced-responsive-v16.css?v=17.0.0",
  "/assets/nexus-command-v17.css?v=17.0.0",
  "/assets/vendor/highlight-github-dark-11.11.1.min.css?v=17.0.0",
  "/assets/app.js?v=17.0.0",
  "/assets/advanced.js?v=17.0.0",
  "/assets/create-suite.js?v=17.0.0",
  "/assets/auth-ui.js?v=17.0.0",
  "/assets/pro-suite.js?v=17.0.0",
  "/assets/layout-fix-v9-1.js?v=17.0.0",
  "/assets/desktop-clean-v9-2.js?v=17.0.0",
  "/assets/nexus-v10.js?v=17.0.0",
  "/assets/realtime-v11.js?v=17.0.0",
  "/assets/stable-ui-v11-4.js?v=17.0.0",
  "/assets/stability-v11-5.js?v=17.0.0",
  "/assets/production-fix-v15-1-0.js?v=17.0.0",
  "/assets/advanced-responsive-v16.js?v=17.0.0",
  "/assets/nexus-command-v17.js?v=17.0.0",
  "/assets/vendor/marked-15.0.7.min.js?v=17.0.0",
  "/assets/vendor/dompurify-3.2.4.min.js?v=17.0.0",
  "/assets/vendor/highlight-11.11.1.min.js?v=17.0.0",
  "/assets/vendor/pdf-4.10.38.min.mjs?v=17.0.0",
  "/assets/vendor/pdf-worker-4.10.38.min.mjs?v=17.0.0",
  "/assets/icon.svg?v=17.0.0",
  "/assets/logo-icon.png?v=17.0.0",
  "/assets/logo-full.png?v=17.0.0"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.all(STATIC_ASSETS.map(async asset => {
      const response = await fetch(asset, { cache: "reload" });
      if (!response.ok) throw new Error(`Could not cache ${asset} (${response.status}).`);
      await cache.put(asset, response);
      return asset;
    }));
    if (results.length !== STATIC_ASSETS.length) throw new Error("Static cache was incomplete.");
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirstAsset(request));
});

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const cached = await cache.match(request) || await cache.match(url.pathname, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return await cache.match(request)
      || await cache.match("/index.html")
      || await cache.match("/")
      || new Response("AI NEXUS is offline and has not been cached yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
  } finally {
    clearTimeout(timeout);
  }
}
