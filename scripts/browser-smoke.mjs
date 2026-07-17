import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const edgeCandidates = [
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean);

const browserExecutable = edgeCandidates.find(path => {
  try { return statSync(path).isFile(); } catch { return false; }
});

if (!browserExecutable) {
  console.error("Browser smoke test needs Microsoft Edge or Google Chrome. Set EDGE_PATH to the executable.");
  process.exit(1);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const apiMocks = {
  "/api/config": {
    appName: "MARKZOSUF AI NEXUS",
    turnstileSiteKey: "",
    googleClientId: "",
    providers: { cloudflare: true },
    features: { webSearch: false, integrations: false, realtime: true }
  },
  "/api/auth/me": { authenticated: false, user: null },
  "/api/realtime": { services: [] },
  "/api/health": { ok: true, service: "browser-smoke" }
};

function json(response, value, status = 200) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(value));
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  if (apiMocks[url.pathname]) return json(response, apiMocks[url.pathname]);
  if (url.pathname.startsWith("/api/")) return json(response, { error: "Not available in browser smoke test." }, 503);

  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = resolve(root, normalize(requested));
  if (filePath !== root && !filePath.startsWith(`${root}\\`) && !filePath.startsWith(`${root}/`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const body = readFileSync(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

await new Promise((resolvePromise, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolvePromise);
});

const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const profile = mkdtempSync(join(tmpdir(), "nexus-browser-smoke-"));
const debugPort = 9333 + Math.floor(Math.random() * 300);
const browserProcess = spawn(browserExecutable, [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-features=Translate,MediaRouter",
  "--disable-sync",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore", windowsHide: true });

function delay(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

async function waitForJson(url, attempts = 80) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

class CdpSession {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolvePromise, reject) => {
      this.socket.addEventListener("open", resolvePromise, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    const result = new Promise((resolvePromise, reject) => this.pending.set(id, { resolve: resolvePromise, reject }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  once(method, timeout = 10000) {
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      const listener = params => {
        clearTimeout(timer);
        const listeners = this.listeners.get(method) || [];
        this.listeners.set(method, listeners.filter(value => value !== listener));
        resolvePromise(params);
      };
      this.on(method, listener);
    });
  }

  close() {
    this.socket.close();
  }
}

async function openSession() {
  await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${origin}/`)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create browser page (${response.status}).`);
  const target = await response.json();
  return new CdpSession(target.webSocketDebuggerUrl);
}

function remoteValue(value) {
  return value?.value ?? value?.description ?? "";
}

async function evaluate(session, expression) {
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed.");
  return result.result?.value;
}

async function runViewport(session, viewport) {
  const issues = [];
  const failedRequests = [];
  const badResponses = [];

  session.on("Runtime.exceptionThrown", event => {
    issues.push(`Uncaught: ${event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || "unknown error"}`);
  });
  session.on("Runtime.consoleAPICalled", event => {
    if (event.type === "error" || event.type === "assert") {
      issues.push(`Console ${event.type}: ${(event.args || []).map(remoteValue).join(" ")}`);
    }
  });
  session.on("Network.loadingFailed", event => {
    if (!event.canceled) failedRequests.push(`${event.errorText}: ${event.requestId}`);
  });
  session.on("Network.responseReceived", event => {
    const response = event.response || {};
    if (response.status >= 400 && response.url?.startsWith(origin)) badResponses.push(`${response.status} ${response.url}`);
  });

  await Promise.all([
    session.send("Page.enable"),
    session.send("Runtime.enable"),
    session.send("Network.enable"),
    session.send("Log.enable")
  ]);
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await session.send("Page.addScriptToEvaluateOnNewDocument", {
    source: 'try { localStorage.setItem("nexus-auth-guest-dismissed", "true"); } catch {}'
  });

  const loaded = session.once("Page.loadEventFired", 15000);
  await session.send("Page.navigate", { url: `${origin}/?browser-smoke=${viewport.name}` });
  await loaded;
  await delay(2200);

  const state = await evaluate(session, `(() => {
    const visible = element => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && !element.hidden && rect.width > 0 && rect.height > 0;
    };
    const overflow = [...document.body.querySelectorAll("*")].filter(element => {
      const style = getComputedStyle(element);
      if (style.position === "fixed" && !visible(element)) return false;
      const rect = element.getBoundingClientRect();
      return visible(element) && (rect.right > innerWidth + 2 || rect.left < -2);
    }).slice(0, 12).map(element => ({
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: String(element.className || "").slice(0, 120),
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right)
    }));
    return {
      readyState: document.readyState,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      appReady: Boolean(window.NEXUS_APP && window.NEXUS_ADVANCED && window.NEXUS_PRO),
      critical: {
        workspace: visible(document.querySelector(".workspace")),
        messages: visible(document.getElementById("messages")),
        composer: visible(document.getElementById("composerForm")),
        prompt: visible(document.getElementById("promptInput")),
        sidebar: visible(document.getElementById("sidebar")),
        openSidebarButton: visible(document.getElementById("openSidebarButton"))
      },
      cssSheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => ({ href: link.href, loaded: Boolean(link.sheet) })),
      images: [...document.images].map(image => ({ src: image.currentSrc || image.src, width: image.naturalWidth, complete: image.complete })),
      overflow
    };
  })()`);

  if (!state.appReady) issues.push("Application APIs did not finish initialization.");
  for (const [name, value] of Object.entries(state.critical)) {
    const expected = name === "sidebar" ? !viewport.mobile : name === "openSidebarButton" ? viewport.mobile : true;
    if (value !== expected) issues.push(`${name} visibility was ${value}; expected ${expected}.`);
  }
  if (state.documentWidth > state.viewport.width + 2) issues.push(`Document overflows horizontally: ${state.documentWidth}px > ${state.viewport.width}px.`);
  if (state.overflow.length) issues.push(`Overflowing elements: ${JSON.stringify(state.overflow)}`);
  for (const sheet of state.cssSheets) if (!sheet.loaded) issues.push(`Stylesheet did not load: ${sheet.href}`);
  for (const image of state.images) if (image.complete && image.width === 0) issues.push(`Image did not load: ${image.src}`);

  const interaction = await evaluate(session, `(() => {
    const click = id => document.getElementById(id)?.click();
    if (${viewport.mobile}) click("openSidebarButton");
    click("toolsButton");
    const toolsOpen = !document.getElementById("toolsModal")?.hidden;
    document.querySelector('[data-close-modal="toolsModal"]')?.click();
    click("createMenuButton");
    const createOpen = !document.getElementById("createMenuBackdrop")?.hidden;
    document.getElementById("createMenuClose")?.click();
    click("workspacePanelButton");
    const panelOpen = document.getElementById("workspacePanel")?.classList.contains("open") || document.body.classList.contains("panel-open");
    click("closeWorkspacePanelButton");
    const sidebarOpen = document.getElementById("sidebar")?.classList.contains("open");
    document.getElementById("closeSidebarButton")?.click();
    return { toolsOpen, createOpen, panelOpen, sidebarOpen };
  })()`);
  if (!interaction.toolsOpen) issues.push("Tools dialog did not open.");
  if (!interaction.createOpen) issues.push("Create menu did not open.");
  if (!interaction.panelOpen) issues.push("Workspace panel did not open.");
  if (viewport.mobile && !interaction.sidebarOpen) issues.push("Mobile sidebar did not open.");

  const screenshot = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(join(root, `.browser-smoke-${viewport.name}.png`), Buffer.from(screenshot.data, "base64"));

  return { name: viewport.name, state, interaction, failedRequests, badResponses, issues };
}

let session;
try {
  session = await openSession();
  const results = [];
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900, mobile: false },
    { name: "tablet", width: 768, height: 1024, mobile: true },
    { name: "mobile", width: 390, height: 844, mobile: true }
  ]) {
    results.push(await runViewport(session, viewport));
  }
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.issues.length || result.badResponses.length)) process.exitCode = 1;
} finally {
  session?.close();
  browserProcess.kill();
  await new Promise(resolvePromise => server.close(resolvePromise));
  await delay(250);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
