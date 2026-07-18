(() => {
  "use strict";
  const LEGACY_DRAFT = "nexus-v8-draft";
  document.addEventListener("DOMContentLoaded", () => {
    try { localStorage.removeItem(LEGACY_DRAFT); } catch {}
    const input = document.getElementById("promptInput");
    if (input) {
      input.value = "";
      input.removeAttribute("style");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    document.getElementById("v10Dock")?.remove();
    document.querySelectorAll(".v10-dock").forEach(el => el.remove());
    document.body.classList.remove("sidebar-open", "modal-open", "v11-modal-open");
    // Recalculate layout after fonts and deferred scripts finish.
    const refresh = () => {
      const h = Math.round(window.visualViewport?.height || window.innerHeight);
      document.documentElement.style.setProperty("--app-height", `${h}px`);
      document.documentElement.style.setProperty("--v115-height", `${h}px`);
    };
    refresh();
    setTimeout(refresh, 250);
    setTimeout(refresh, 1000);
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) location.reload();
  });
})();
