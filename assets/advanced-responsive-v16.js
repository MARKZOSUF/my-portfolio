(() => {
  "use strict";
  const mq = window.matchMedia("(max-width: 860px)");
  const body = document.body;
  const sidebar = document.getElementById("sidebar");
  const shell = document.querySelector(".app-shell");

  function apply() {
    const mobile = mq.matches;
    body.classList.toggle("layout-mobile", mobile);
    body.classList.toggle("layout-desktop", !mobile);
    if (!mobile) {
      sidebar?.classList.remove("open");
      body.classList.remove("sidebar-open");
      document.querySelector(".sidebar-scrim")?.setAttribute("hidden", "");
    }
  }

  function repairOpenStates() {
    document.querySelectorAll("[hidden]").forEach(el => el.setAttribute("aria-hidden", "true"));
    if (!shell?.classList.contains("panel-open")) {
      document.getElementById("workspacePanel")?.setAttribute("aria-hidden", "true");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.productionBuild = "16.0.0";
    apply();
    repairOpenStates();
    console.info("AI NEXUS advanced responsive layer 16.0.0 loaded");
  });

  if (mq.addEventListener) mq.addEventListener("change", apply);
  else mq.addListener(apply);
})();
