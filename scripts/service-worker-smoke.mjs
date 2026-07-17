import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "sw.js"), "utf8");
const origin = "https://nexus.example";
const handlers = new Map();
const stores = new Map();
let online = true;

const keyFor = input => new URL(typeof input === "string" ? input : input.url, origin).href;
const cache = {
  async put(input, response) { stores.set(keyFor(input), response.clone()); },
  async match(input, options = {}) {
    const direct = stores.get(keyFor(input));
    if (direct) return direct.clone();
    if (!options.ignoreSearch) return undefined;
    const requested = new URL(keyFor(input));
    for (const [key, response] of stores) {
      const candidate = new URL(key);
      if (candidate.origin === requested.origin && candidate.pathname === requested.pathname) return response.clone();
    }
    return undefined;
  }
};

const caches = {
  async open() { return cache; },
  async keys() { return ["old-cache", "markzosuf-ai-nexus-v15-1-0-production"]; },
  async delete(key) { return key === "old-cache"; }
};

const self = {
  location: { origin },
  clients: { async claim() {} },
  async skipWaiting() {},
  addEventListener(type, handler) { handlers.set(type, handler); }
};

async function fetchMock(input) {
  if (!online) throw new Error("offline");
  return new Response(`asset:${keyFor(input)}`, { status: 200, headers: { "Content-Type": "text/plain" } });
}

vm.runInNewContext(source, {
  self,
  caches,
  fetch: fetchMock,
  Response,
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  console
}, { filename: "sw.js" });

assert.ok(handlers.has("install"));
assert.ok(handlers.has("activate"));
assert.ok(handlers.has("fetch"));

let installPromise;
handlers.get("install")({ waitUntil(promise) { installPromise = promise; } });
await installPromise;
assert.ok(stores.size >= 40, `Expected at least 40 cached assets, received ${stores.size}.`);

let activatePromise;
handlers.get("activate")({ waitUntil(promise) { activatePromise = promise; } });
await activatePromise;

let apiIntercepted = false;
handlers.get("fetch")({
  request: { method: "GET", mode: "cors", url: `${origin}/api/health` },
  respondWith() { apiIntercepted = true; }
});
assert.equal(apiIntercepted, false);

online = false;
let navigationPromise;
handlers.get("fetch")({
  request: { method: "GET", mode: "navigate", url: `${origin}/offline-route` },
  respondWith(promise) { navigationPromise = promise; }
});
const offlineNavigation = await navigationPromise;
assert.equal(offlineNavigation.status, 200);
assert.match(await offlineNavigation.text(), /asset:/);

console.log(`Service-worker smoke passed: ${stores.size} assets cached and offline navigation recovered.`);
