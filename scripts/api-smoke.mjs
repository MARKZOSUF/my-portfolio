import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const functionFiles = walk(join(root, "functions")).filter(path => extname(path) === ".js");
for (const file of functionFiles) await import(pathToFileURL(file));

const [{ onRequestGet: config }, { onRequestGet: health }, { onRequestGet: me }, chat, middleware, security, auth] = await Promise.all([
  import("../functions/api/config.js"),
  import("../functions/api/health.js"),
  import("../functions/api/auth/me.js"),
  import("../functions/api/chat.js"),
  import("../functions/_middleware.js"),
  import("../functions/_shared/security.js"),
  import("../functions/_shared/auth.js")
]);

async function responseJson(response, expectedStatus = 200) {
  assert.equal(response.status, expectedStatus);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/);
  return response.json();
}

const request = new Request("https://nexus.example/api/test", {
  headers: { "CF-Connecting-IP": "203.0.113.10", "User-Agent": "api-smoke" }
});

const configData = await responseJson(await config({ env: {} }));
assert.equal(configData.features.ai, false);
assert.equal(configData.features.guestAi, true);
assert.equal(configData.providers.cloudflare, false);
assert.equal(configData.cloudflareModel, "@cf/meta/llama-3.1-8b-instruct-fast");

const healthData = await responseJson(await health({ env: {} }));
assert.equal(healthData.ok, false);
assert.equal(healthData.version, "15.1.0");
assert.equal(healthData.checks.database, false);

const meData = await responseJson(await me({ request, env: {} }));
assert.equal(meData.authenticated, false);

const greetingResponse = await chat.onRequest({
  request: new Request("https://nexus.example/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.11" },
    body: JSON.stringify({ input: "Namaste", language: "hinglish" })
  }),
  env: {}
});
const greetingData = await responseJson(greetingResponse);
assert.equal(greetingData.provider, "local");
assert.match(greetingData.result, /AI NEXUS/);

const methodResponse = await chat.onRequest({ request: new Request("https://nexus.example/api/chat"), env: {} });
await responseJson(methodResponse, 405);

const invalidJsonResponse = await chat.onRequest({
  request: new Request("https://nexus.example/api/chat", {
    method: "POST",
    headers: { "CF-Connecting-IP": "203.0.113.12" },
    body: "not-json"
  }),
  env: {}
});
await responseJson(invalidJsonResponse, 400);

const wrapped = await middleware.onRequest({
  request,
  env: {},
  next: async () => new Response("ok", { headers: { "Content-Type": "text/plain" } })
});
assert.equal(wrapped.status, 200);
assert.equal(await wrapped.text(), "ok");
assert.ok(wrapped.headers.get("x-request-id"));
assert.equal(wrapped.headers.get("x-content-type-options"), "nosniff");

const originalConsoleError = console.error;
console.error = () => {};
let failed;
try {
  failed = await middleware.onRequest({
    request,
    env: {},
    next: async () => {
      const error = new Error("Expected smoke failure");
      error.status = 400;
      throw error;
    }
  });
} finally {
  console.error = originalConsoleError;
}
const failedData = await responseJson(failed, 400);
assert.equal(failedData.error, "Expected smoke failure");
assert.ok(failedData.requestId);

const token = auth.randomHex(32);
assert.match(token, /^[a-f0-9]{64}$/);
assert.match(await auth.sha256("nexus"), /^[a-f0-9]{64}$/);
assert.equal(auth.getCookie(new Request("https://nexus.example", { headers: { Cookie: "a=1; nexus_session=hello%20world" } }), "nexus_session"), "hello world");

const scope = `smoke-${Date.now()}`;
await security.enforceRateLimit(request, {}, scope, 2, 60);
await security.enforceRateLimit(request, {}, scope, 2, 60);
await assert.rejects(
  () => security.enforceRateLimit(request, {}, scope, 2, 60),
  error => error?.status === 429
);

console.log(`API smoke passed: ${functionFiles.length} Function modules imported and core responses verified.`);
