
(() => {
  "use strict";

  const VERSION = "9.3";
  const MIGRATION_KEY = "nexus-stable-migration-v9-3";

  function setAppHeight() {
    const height = Math.round(window.visualViewport?.height || window.innerHeight);
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  }

  function applyLayoutClass() {
    const mobile = window.matchMedia("(max-width: 860px)").matches;
    document.body.classList.toggle("layout-mobile", mobile);
    document.body.classList.toggle("layout-desktop", !mobile);
    if (!mobile) document.getElementById("sidebar")?.classList.remove("open");
  }

  function migrateOldLayoutState() {
    if (localStorage.getItem(MIGRATION_KEY) === "done") return;

    // A saved collapsed state caused the mixed/narrow desktop layout after upgrades.
    localStorage.removeItem("nexus-sidebar-collapsed");
    document.body.classList.remove("sidebar-collapsed");

    const settingsKey = "markzosuf-ai-nexus-settings-v2";
    try {
      const settings = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      if (settings.provider === "github") {
        settings.provider = "auto";
        localStorage.setItem(settingsKey, JSON.stringify(settings));
      }
    } catch {}

    localStorage.setItem(MIGRATION_KEY, "done");
  }

  function closeMobileSidebar(event) {
    if (!window.matchMedia("(max-width: 860px)").matches) return;
    const target = event.target.closest("[data-sidebar-action], .history-item, #newChatButton");
    if (target) document.getElementById("sidebar")?.classList.remove("open");
  }

  function makeCopyFallback() {
    if (!window.NEXUS_SAFE_COPY) {
      window.NEXUS_SAFE_COPY = async text => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          const area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          const copied = document.execCommand("copy");
          area.remove();
          return copied;
        }
      };
    }
  }

  function showConnectionBanner(message, online = false) {
    let banner = document.getElementById("nexusConnectionBanner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "nexusConnectionBanner";
      banner.className = "nexus-connection-banner";
      document.body.appendChild(banner);
    }
    banner.textContent = message;
    banner.classList.toggle("online", online);
    banner.hidden = false;
    clearTimeout(showConnectionBanner.timer);
    showConnectionBanner.timer = setTimeout(() => {
      banner.hidden = true;
    }, online ? 1800 : 5000);
  }

  function bindConnectivity() {
    window.addEventListener("offline", () => {
      showConnectionBanner("Internet connection lost. Saved chats remain available on this device.");
    });
    window.addEventListener("online", () => {
      showConnectionBanner("Internet connection restored.", true);
    });
  }

  function preventBrokenAnchors() {
    document.addEventListener("click", event => {
      const anchor = event.target.closest('a[href="#"], a[href=""]');
      if (anchor) event.preventDefault();
    });
  }

  function exposeDiagnostics() {
    window.NEXUS_DIAGNOSTICS = {
      version: VERSION,
      layout: () => ({
        mobile: window.matchMedia("(max-width: 860px)").matches,
        bodyClasses: [...document.body.classList],
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }),
      clearUiCache: async () => {
        try {
          for (const key of await caches.keys()) await caches.delete(key);
        } catch {}
        location.reload();
      }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.nexusVersion = VERSION;
    setAppHeight();
    applyLayoutClass();
    migrateOldLayoutState();
    makeCopyFallback();
    bindConnectivity();
    preventBrokenAnchors();
    exposeDiagnostics();

    document.addEventListener("click", closeMobileSidebar);

    const media = window.matchMedia("(max-width: 860px)");
    const update = () => {
      setAppHeight();
      applyLayoutClass();
    };

    if (typeof media.addEventListener === "function") media.addEventListener("change", update);
    else media.addListener(update);

    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(update, 120), { passive: true });
    window.visualViewport?.addEventListener("resize", setAppHeight, { passive: true });
  });

  window.addEventListener("error", event => {
    console.error("[AI NEXUS V9.3 runtime]", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", event => {
    console.error("[AI NEXUS V9.3 promise]", event.reason);
  });
})();
