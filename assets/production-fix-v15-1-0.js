(() => {
  "use strict";

  const mobileQuery = window.matchMedia("(max-width: 860px)");
  let resizeFrame = 0;

  function updateViewport() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const height = Math.max(1, Math.round(viewport?.height || window.innerHeight));
      const value = `${height}px`;
      const root = document.documentElement;
      root.style.setProperty("--nexus-vh", value);
      root.style.setProperty("--app-height", value);
      root.style.setProperty("--v114-height", value);
      root.style.setProperty("--v115-height", value);
      resizeFrame = 0;
    });
  }

  function applyLayout() {
    const mobile = mobileQuery.matches;
    document.body.classList.toggle("layout-mobile", mobile);
    document.body.classList.toggle("layout-desktop", !mobile);
    if (!mobile) closeSidebar();
  }

  function syncSidebarState() {
    const open = mobileQuery.matches && document.getElementById("sidebar")?.classList.contains("open");
    document.body.classList.toggle("sidebar-open", Boolean(open));
    document.querySelector(".sidebar-scrim")?.toggleAttribute("hidden", !open);
  }

  function closeSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    syncSidebarState();
  }

  function installSidebarScrim() {
    if (document.querySelector(".sidebar-scrim")) return;
    const scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sidebar-scrim";
    scrim.hidden = true;
    scrim.tabIndex = -1;
    scrim.setAttribute("aria-label", "Close navigation");
    scrim.addEventListener("click", closeSidebar);
    document.body.appendChild(scrim);

    const sidebar = document.getElementById("sidebar");
    if (sidebar) new MutationObserver(syncSidebarState).observe(sidebar, { attributes: true, attributeFilter: ["class"] });
  }

  function keepDialogsAccessible() {
    const update = element => {
      const hidden = element.hasAttribute("hidden");
      element.setAttribute("aria-hidden", hidden ? "true" : "false");
    };
    const observer = new MutationObserver(records => {
      for (const record of records) update(record.target);
    });
    document.querySelectorAll(".modal-backdrop, .nexus-hub-backdrop, .pro-backdrop, .v10-studio-backdrop, .v11-live-backdrop, .create-menu-backdrop")
      .forEach(element => {
        update(element);
        observer.observe(element, { attributes: true, attributeFilter: ["hidden"] });
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.productionBuild = "15.1.0";
    updateViewport();
    applyLayout();
    installSidebarScrim();
    keepDialogsAccessible();

    document.getElementById("openSidebarButton")?.addEventListener("click", syncSidebarState);
    document.getElementById("closeSidebarButton")?.addEventListener("click", closeSidebar);
    document.addEventListener("click", event => {
      if (event.target.closest("[data-sidebar-action], .history-item")) closeSidebar();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeSidebar();
    });

    console.info("AI NEXUS production fixes 15.1.0 loaded");
  });

  if (typeof mobileQuery.addEventListener === "function") mobileQuery.addEventListener("change", applyLayout);
  else mobileQuery.addListener(applyLayout);

  window.addEventListener("resize", updateViewport, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(updateViewport, 120), { passive: true });
  window.addEventListener("pageshow", updateViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", updateViewport, { passive: true });
  window.visualViewport?.addEventListener("scroll", updateViewport, { passive: true });
})();
