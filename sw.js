const CACHE_NAME = "markzosuf-ai-nexus-v20-0-0-final";
const CORE = [
  "/",
  "/index.html",
  "/404.html",
  "/privacy.html",
  "/terms.html",
  "/manifest.webmanifest",
  "/assets/logo-icon.png?v=20.0.0",
  "/assets/vendor/highlight-github-dark-11.11.1.min.css?v=20.0.0",
  "/assets/styles.css?v=20.0.0",
  "/assets/advanced.css?v=20.0.0",
  "/assets/create-suite.css?v=20.0.0",
  "/assets/auth-ui.css?v=20.0.0",
  "/assets/pro-suite.css?v=20.0.0",
  "/assets/vendor/marked-15.0.7.min.js?v=20.0.0",
  "/assets/vendor/dompurify-3.2.4.min.js?v=20.0.0",
  "/assets/vendor/highlight-11.11.1.min.js?v=20.0.0",
  "/assets/app.js?v=20.0.0",
  "/assets/advanced.js?v=20.0.0",
  "/assets/create-suite.js?v=20.0.0",
  "/assets/auth-ui.js?v=20.0.0",
  "/assets/pro-suite.js?v=20.0.0",
  "/assets/nexus-command-v17.css?v=20.0.0",
  "/assets/stable-clean-v19.css?v=20.0.0",
  "/assets/auth-startup-v9-1-final.css?v=20.0.0",
  "/assets/final-ui-v20.css?v=20.0.0",
  "/assets/logo-full.png?v=20.0.0",
  "/assets/nexus-command-v17.js?v=20.0.0",
  "/assets/stable-runtime-v19.js?v=20.0.0",
  "/assets/plus-suite.css?v=20.0.0",
  "/assets/plus-suite.js?v=20.0.0",
  "/assets/realtime-v11.css?v=20.0.0",
  "/assets/realtime-v11.js?v=20.0.0",
  "/assets/nexus-v10.css?v=20.0.0",
  "/assets/nexus-v10.js?v=20.0.0",
  "/assets/production-fix-v15-1-0.css?v=20.0.0",
  "/assets/production-fix-v15-1-0.js?v=20.0.0",
  "/assets/advanced-responsive-v16.css?v=20.0.0",
  "/assets/advanced-responsive-v16.js?v=20.0.0",
  "/assets/final-layout-v18.css?v=20.0.0",
  "/assets/final-runtime-v18.js?v=20.0.0",
  "/assets/final-runtime-v20.js?v=20.0.0"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.all(CORE.map(async asset => { const response = await fetch(asset, { cache: "no-store" }); if (response.ok) await cache.put(asset, response.clone()); }))).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request, {cache:"no-store"}).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request,response.clone()));
    return response;
  }).catch(async () => { const cache = await caches.open(CACHE_NAME); return (await cache.match(request,{ignoreSearch:true})) || (request.mode === "navigate" ? cache.match("/index.html") : new Response("Offline",{status:503})); }));
});
