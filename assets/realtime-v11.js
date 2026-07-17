(() => {
  "use strict";

  const KEY = "nexus-v11-live-enabled";
  let enabled = localStorage.getItem(KEY) !== "false";
  let catalog = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    await loadCatalog();
    injectSidebar();
    injectDock();
    createPanel();
    window.NEXUS_REALTIME = {
      isEnabled: () => enabled,
      setEnabled,
      open
    };
  }

  async function loadCatalog() {
    try {
      const response = await fetch("/api/realtime", { cache: "no-store" });
      const data = await response.json();
      catalog = Array.isArray(data.services) ? data.services : [];
    } catch {
      catalog = [];
    }
  }

  function injectSidebar() {
    const nav = document.querySelector(".sidebar-primary-nav");
    if (!nav || nav.querySelector('[data-sidebar-action="live-v11"]')) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.sidebarAction = "live-v11";
    button.innerHTML = "<span>⚡</span><b>Live Services</b>";
    button.addEventListener("click", open);
    const studio = nav.querySelector('[data-sidebar-action="v10"]');
    nav.insertBefore(button, studio || nav.querySelector('[data-sidebar-action="more"]') || null);
  }

  function injectDock() {
    const tryInject = () => {
      const dock = document.getElementById("v10Dock");
      if (!dock || document.getElementById("v11LiveButton")) return false;
      const button = document.createElement("button");
      button.id = "v11LiveButton";
      button.type = "button";
      button.className = "v10-chip v11-live-chip";
      button.addEventListener("click", event => {
        if (event.shiftKey) open();
        else setEnabled(!enabled);
      });
      button.addEventListener("contextmenu", event => {
        event.preventDefault();
        open();
      });
      dock.insertBefore(button, dock.querySelector("#v10StudioButton"));
      syncButton(button);
      return true;
    };

    if (!tryInject()) {
      const timer = setInterval(() => {
        if (tryInject()) clearInterval(timer);
      }, 300);
      setTimeout(() => clearInterval(timer), 10000);
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    localStorage.setItem(KEY, String(enabled));
    syncButton(document.getElementById("v11LiveButton"));
    window.NEXUS_APP?.showToast?.(enabled ? "Automatic live services enabled." : "Automatic live services paused.", enabled ? "success" : "info");
  }

  function syncButton(button) {
    if (!button) return;
    button.classList.toggle("active", enabled);
    button.textContent = enabled ? "⚡ Live on" : "⚡ Live off";
    button.title = "Click to toggle automatic live tools. Shift-click or right-click to open Live Services.";
  }

  function createPanel() {
    if (document.getElementById("v11LivePanel")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "v11LivePanel";
    backdrop.className = "v11-live-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="v11-live-panel" role="dialog" aria-modal="true" aria-label="Live Services">
        <header class="v11-live-header">
          <div>
            <strong>⚡ AI NEXUS Live Services V11</strong>
            <small>Real-time public data, research and developer tools</small>
          </div>
          <button id="v11LiveClose" type="button" aria-label="Close">✕</button>
        </header>
        <div class="v11-live-body">
          <section class="v11-live-status">
            <div>
              <b>Automatic tools</b>
              <span id="v11LiveState"></span>
            </div>
            <button id="v11ToggleLive" type="button"></button>
          </section>
          <form id="v11LiveForm" class="v11-live-form">
            <label>
              <span>Service</span>
              <select id="v11Tool"></select>
            </label>
            <label class="v11-live-query">
              <span>Question, location, package or URL</span>
              <textarea id="v11Query" rows="4" placeholder="Examples: weather in Aligarh · 100 USD to INR · latest AI news · npm express · current time in Tokyo"></textarea>
            </label>
            <button class="v11-run" type="submit">Run live service</button>
          </form>
          <div class="v11-quick" id="v11Quick">
            <button data-query="weather in Aligarh" data-tool="weather">🌤 Weather</button>
            <button data-query="100 USD to INR" data-tool="currency">💱 Currency</button>
            <button data-query="latest artificial intelligence news" data-tool="news">📰 News</button>
            <button data-query="research papers about small language models" data-tool="academic">📚 Papers</button>
            <button data-query="GitHub repositories for Cloudflare AI chatbot" data-tool="github">💻 GitHub</button>
            <button data-query="Hacker News top stories" data-tool="hackernews">⚡ Tech</button>
          </div>
          <section id="v11Output" class="v11-output">
            <div class="v11-empty">Choose a service and run a live query.</div>
          </section>
        </div>
      </section>`;
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) close();
    });
    document.body.appendChild(backdrop);

    backdrop.querySelector("#v11LiveClose").addEventListener("click", close);
    backdrop.querySelector("#v11ToggleLive").addEventListener("click", () => setEnabled(!enabled));
    backdrop.querySelector("#v11LiveForm").addEventListener("submit", run);
    backdrop.querySelector("#v11Quick").addEventListener("click", event => {
      const button = event.target.closest("button[data-query]");
      if (!button) return;
      backdrop.querySelector("#v11Tool").value = button.dataset.tool;
      backdrop.querySelector("#v11Query").value = button.dataset.query;
      backdrop.querySelector("#v11LiveForm").requestSubmit();
    });

    renderCatalog();
    renderState();
  }

  function renderCatalog() {
    const select = document.getElementById("v11Tool");
    if (!select) return;
    const fallback = [
      ["auto", "Auto Router"], ["weather", "Weather"], ["time", "World Time"],
      ["currency", "Currency"], ["crypto", "Crypto Price"], ["news", "Live News"],
      ["wikipedia", "Wikipedia"], ["academic", "Research Papers"], ["arxiv", "arXiv"],
      ["github", "GitHub"], ["stackoverflow", "Stack Overflow"], ["npm", "npm"],
      ["pypi", "PyPI"], ["hackernews", "Hacker News"], ["url", "URL Reader"],
      ["rss", "RSS Reader"], ["web", "Open Web Search"]
    ];
    const items = catalog.length ? catalog.map(item => [item.id, `${item.name}${item.free ? " · no key" : " · optional key"}`]) : fallback;
    select.innerHTML = items.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  }

  function renderState() {
    const state = document.getElementById("v11LiveState");
    const button = document.getElementById("v11ToggleLive");
    if (state) state.textContent = enabled ? "Enabled for every chat" : "Paused";
    if (button) {
      button.textContent = enabled ? "Turn off" : "Turn on";
      button.classList.toggle("active", enabled);
    }
    syncButton(document.getElementById("v11LiveButton"));
  }

  function open() {
    const panel = document.getElementById("v11LivePanel");
    if (!panel) return;
    renderState();
    panel.hidden = false;
    document.body.classList.add("v11-modal-open");
  }

  function close() {
    const panel = document.getElementById("v11LivePanel");
    if (panel) panel.hidden = true;
    document.body.classList.remove("v11-modal-open");
  }

  async function run(event) {
    event.preventDefault();
    const tool = document.getElementById("v11Tool").value;
    const query = document.getElementById("v11Query").value.trim();
    const output = document.getElementById("v11Output");
    if (!query) {
      output.innerHTML = '<div class="v11-error">Enter a question, location, package name or URL.</div>';
      return;
    }

    output.innerHTML = '<div class="v11-loading"><span></span> Contacting live service…</div>';

    try {
      const response = await fetch("/api/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, query })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Live service failed.");
      output.innerHTML = renderResult(data);
    } catch (error) {
      output.innerHTML = `<div class="v11-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderResult(data) {
    const body = data.tool === "url" && data.data?.excerpt
      ? `<article class="v11-excerpt">${escapeHtml(data.data.excerpt)}</article>`
      : `<pre>${escapeHtml(JSON.stringify(data.data, null, 2))}</pre>`;
    const sources = (data.sources || []).map(source =>
      `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer"><b>${escapeHtml(source.title)}</b><span>${escapeHtml(source.description || source.url)}</span></a>`
    ).join("");
    return `
      <div class="v11-result-head">
        <div><b>${escapeHtml(data.title || data.tool)}</b><small>${escapeHtml(data.fetchedAt || "")}</small></div>
        <button type="button" id="v11UseInChat">Use in chat</button>
      </div>
      <p class="v11-summary">${escapeHtml(data.summary || "")}</p>
      ${body}
      ${sources ? `<div class="v11-sources"><h4>Sources</h4>${sources}</div>` : ""}`;
  }

  document.addEventListener("click", event => {
    if (event.target?.id !== "v11UseInChat") return;
    const tool = document.getElementById("v11Tool")?.value || "auto";
    const query = document.getElementById("v11Query")?.value || "";
    setEnabled(true);
    window.NEXUS_APP?.setPrompt?.(`Use live external services and answer with sources:\n\n${query}`);
    close();
    window.NEXUS_APP?.sendCurrent?.();
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function escapeAttribute(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? escapeHtml(url.toString()) : "#";
    } catch {
      return "#";
    }
  }
})();
