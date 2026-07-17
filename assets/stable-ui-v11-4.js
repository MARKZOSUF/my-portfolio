(() => {
  "use strict";

  function setViewportHeight() {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--v114-height", `${Math.round(height)}px`);
  }

  function revealLayout() {
    const mobile = window.matchMedia("(max-width: 860px)").matches;
    document.body.classList.toggle("layout-mobile", mobile);
    document.body.classList.toggle("layout-desktop", !mobile);
    document.documentElement.dataset.stableUi = "11.4";
  }

  function improveExistingCodeBlocks(root = document) {
    root.querySelectorAll(".code-block").forEach(wrapper => {
      const code = wrapper.querySelector("pre code");
      const pre = wrapper.querySelector("pre");
      if (!code || !pre) return;

      const languageClass = [...code.classList].find(name => name.startsWith("language-"));
      wrapper.dataset.language = languageClass ? languageClass.slice(9) : "code";

      if (code.textContent.length > 1500 && !wrapper.querySelector(".code-expand-button")) {
        wrapper.classList.add("is-collapsed");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "code-expand-button";
        button.textContent = "Expand";
        button.addEventListener("click", () => {
          const expanded = wrapper.classList.toggle("is-expanded");
          wrapper.classList.toggle("is-collapsed", !expanded);
          button.textContent = expanded ? "Collapse" : "Expand";
        });
        wrapper.appendChild(button);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setViewportHeight();
    revealLayout();
    improveExistingCodeBlocks();

    const messages = document.getElementById("messages");
    if (messages) {
      new MutationObserver(() => improveExistingCodeBlocks(messages))
        .observe(messages, { childList: true, subtree: true });
    }

    document.getElementById("promptInput")?.addEventListener("focus", () => {
      setViewportHeight();
      setTimeout(() => {
        const container = document.getElementById("messages");
        if (container) container.scrollTop = container.scrollHeight;
      }, 180);
    });
  });

  window.addEventListener("resize", () => {
    setViewportHeight();
    revealLayout();
  }, { passive: true });

  window.visualViewport?.addEventListener("resize", setViewportHeight, { passive: true });
})();
