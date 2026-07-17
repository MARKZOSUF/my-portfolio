(() => {
  "use strict";
  const once = new Set();
  function notify(message, type = "error") {
    const text = String(message || "").trim();
    if (!text || once.has(text)) return;
    once.add(text);
    setTimeout(() => once.delete(text), 8000);
    window.NEXUS_APP?.showToast?.(text, type);
  }
  window.addEventListener("error", event => {
    const message = event?.error?.message || event?.message || "";
    if (/ResizeObserver loop/i.test(message)) return;
    console.error("AI NEXUS runtime error", event?.error || event);
    notify("A page feature recovered from an error. Reload once if it repeats.");
  });
  window.addEventListener("unhandledrejection", event => {
    const reason = event?.reason;
    const message = reason?.message || String(reason || "");
    if (/AbortError|aborted|cancelled/i.test(message)) return;
    console.error("AI NEXUS promise error", reason);
    notify("A background feature could not finish. Core chat is still available.");
  });
  function refreshViewport() {
    const height = Math.round(window.visualViewport?.height || window.innerHeight);
    document.documentElement.style.setProperty("--v115-height", `${height}px`);
  }
  function closeMobileSidebarAfterAction(event) {
    if (!window.matchMedia("(max-width: 860px)").matches) return;
    if (!event.target.closest("[data-sidebar-action], .history-item")) return;
    document.getElementById("sidebar")?.classList.remove("open");
  }
  document.addEventListener("DOMContentLoaded", () => {
    refreshViewport();
    document.documentElement.dataset.productionBuild = "11.5";
    document.addEventListener("click", closeMobileSidebarAfterAction);
    if (window.matchMedia("(max-width: 860px)").matches) document.body.classList.remove("sidebar-collapsed");
    console.info("AI NEXUS production build 11.5 loaded");
  });
  window.addEventListener("pageshow", refreshViewport, { passive: true });
  window.addEventListener("resize", refreshViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", refreshViewport, { passive: true });
})();
