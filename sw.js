const CACHE_NAME = "markzosuf-ai-nexus-v19-0-0-clean";
const CORE = [
  "/",
  "/index.html",
  "/404.html",
  "/privacy.html",
  "/terms.html",
  "/manifest.webmanifest",
  "/assets/logo-icon.png?v=19.0.0",
  "/assets/vendor/highlight-github-dark-11.11.1.min.css?v=19.0.0",
  "/assets/styles.css?v=19.0.0",
  "/assets/advanced.css?v=19.0.0",
  "/assets/create-suite.css?v=19.0.0",
  "/assets/auth-ui.css?v=19.0.0",
  "/assets/pro-suite.css?v=19.0.0",
  "/assets/vendor/marked-15.0.7.min.js?v=19.0.0",
  "/assets/vendor/dompurify-3.2.4.min.js?v=19.0.0",
  "/assets/vendor/highlight-11.11.1.min.js?v=19.0.0",
  "/assets/app.js?v=19.0.0",
  "/assets/advanced.js?v=19.0.0",
  "/assets/create-suite.js?v=19.0.0",
  "/assets/auth-ui.js?v=19.0.0",
  "/assets/pro-suite.js?v=19.0.0",
  "/assets/nexus-command-v17.css?v=19.0.0",
  "/assets/stable-clean-v19.css?v=19.0.0",
  "/assets/logo-full.png?v=19.0.0",
  "/assets/nexus-command-v17.js?v=19.0.0",
  "/assets/stable-runtime-v19.js?v=19.0.0"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request, {cache:"no-store"}).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request,response.clone()));
    return response;
  }).catch(async () => (await caches.match(request,{ignoreSearch:true})) || (request.mode === "navigate" ? caches.match("/index.html") : new Response("Offline",{status:503}))));
});
