(() => {
  "use strict";
  const RELEASE = "19.0.0";
  const RELEASE_KEY = "nexus-release-cleanup";

  function setViewportHeight() {
    const height = Math.round(window.visualViewport?.height || window.innerHeight);
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  }

  async function clearOldRuntimeCachesOnce() {
    let previous = "";
    try { previous = localStorage.getItem(RELEASE_KEY) || ""; } catch {}
    if (previous === RELEASE) return;
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      localStorage.removeItem("nexus-v8-draft");
      sessionStorage.clear();
      localStorage.setItem(RELEASE_KEY, RELEASE);
    } catch {}
  }

  function cleanLegacyUI() {
    document.querySelectorAll("#v10Dock,.v10-dock,.realtime-dock,.floating-search-dock").forEach(el => el.remove());
    document.body.classList.remove("sidebar-open", "modal-open", "v11-modal-open");
    const input = document.getElementById("promptInput");
    if (input) {
      input.value = "";
      input.style.height = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  clearOldRuntimeCachesOnce();
  document.addEventListener("DOMContentLoaded", () => {
    setViewportHeight();
    cleanLegacyUI();
    setTimeout(cleanLegacyUI, 300);
    setTimeout(cleanLegacyUI, 1200);
  });
  window.addEventListener("resize", setViewportHeight, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(setViewportHeight, 150), { passive: true });
  window.visualViewport?.addEventListener("resize", setViewportHeight, { passive: true });
})();
