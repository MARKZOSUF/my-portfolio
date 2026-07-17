
(() => {
  "use strict";

  const CANVAS_KEY = "nexus-v8-3-canvas";
  let activeCanvasMode = "document";
  let menuView = "main";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    createMenu();
    createDriveDialog();
    createMediaStudio();
    createCanvasStudio();
    bindSpecializedInputs();
    document.getElementById("createMenuButton")?.addEventListener("click", openMenu);
  }

  function bindSpecializedInputs() {
    ["cameraInput", "photoInput", "pdfInput", "codeInput"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (file) await window.NEXUS_APP?.handleFile?.(file);
        event.target.value = "";
        closeMenu();
      });
    });
  }

  function createMenu() {
    const backdrop = document.createElement("div");
    backdrop.id = "createMenuBackdrop";
    backdrop.className = "create-menu-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="create-menu" id="createMenu" role="dialog" aria-modal="true" aria-label="Create and upload menu">
        <header class="create-menu-header">
          <button class="create-menu-close" id="createMenuClose" aria-label="Close">✕</button>
          <div class="create-menu-title">
            <strong id="createMenuHeading">Ask AI NEXUS</strong>
            <small id="createMenuSubtitle">Create, upload and build</small>
          </div>
          <img class="create-menu-logo" src="/assets/logo-icon.png?v=15.1.0" alt="">
        </header>

        <div class="create-menu-body">
          <div class="create-main-menu" id="createMainMenu">
            <div class="create-menu-list">
              ${menuItem("drive", "♧", "Add from Drive", "Import a public Google Drive file")}
              ${menuItem("uploads", "•••", "More uploads", "Photos, camera, PDF, code and files", true)}
              <div class="create-menu-divider"></div>
              ${menuItem("image", "▧", "Create image", "Generate and edit images", false, "New")}
              ${menuItem("video", "▰", "Create video", "Storyboard, prompts and optional rendering")}
              ${menuItem("music", "♫", "Create music", "Track plan and optional rendering", false, "New")}
              ${menuItem("canvas", "▣", "Canvas", "Code, write or make slide outlines")}
              ${menuItem("tools", "•••", "More tools", "Guided learning, bots, files and code", true)}
            </div>
          </div>

          <div class="create-submenu" id="uploadSubmenu">
            ${submenuHeader("Uploads")}
            <div class="create-menu-list">
              ${menuItem("photos", "🖼", "Photos", "Choose a photo from this device")}
              ${menuItem("camera", "📷", "Camera", "Take a new photo")}
              ${menuItem("pdf", "PDF", "PDF document", "Study, summarize or ask questions")}
              ${menuItem("codefile", "⌘", "Code file", "JavaScript, Python, C++, HTML and more")}
              ${menuItem("files", "📄", "Any supported file", "Text, data, documents and images")}
              ${menuItem("cloudfiles", "☁", "Cloud file library", "Open saved R2 and local files")}
            </div>
          </div>

          <div class="create-submenu" id="toolsSubmenu">
            ${submenuHeader("More tools")}
            <div class="create-menu-list">
              ${menuItem("guided", "📖", "Guided Learning", "Step-by-step tutoring")}
              ${menuItem("avatar", "◌", "Avatar Studio", "Generate a profile avatar")}
              ${menuItem("bots", "🤖", "Custom Bots", "Create specialist assistants")}
              ${menuItem("codestudio", "⌘", "Code Studio", "Run HTML, CSS, JavaScript and Python")}
              ${menuItem("memory", "🧠", "Personal Intelligence", "Memory and personalization", false, "Labs")}
              ${menuItem("promptlibrary", "✨", "Prompt Library", "Reusable professional prompts")}
              ${menuItem("nexushub", "◈", "Nexus Hub", "Open every advanced feature")}
            </div>
          </div>
        </div>
      </section>
    `;

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeMenu();
    });

    document.body.appendChild(backdrop);
    document.getElementById("createMenuClose").onclick = closeMenu;

    backdrop.querySelectorAll("[data-create-action]").forEach(button => {
      button.addEventListener("click", () => runAction(button.dataset.createAction));
    });
  }

  function menuItem(action, icon, title, subtitle, arrow = false, badge = "") {
    return `<button class="create-menu-item" data-create-action="${action}">
      <span class="create-menu-icon">${icon}</span>
      <span class="create-menu-copy"><strong>${title}</strong><small>${subtitle}</small></span>
      ${badge ? `<span class="${badge === "Labs" ? "create-lab-badge" : "create-new-badge"}">${badge}</span>` : arrow ? '<span class="create-menu-arrow">›</span>' : ""}
    </button>`;
  }

  function submenuHeader(title) {
    return `<button class="create-menu-item" data-create-action="back">
      <span class="create-menu-icon">‹</span>
      <span class="create-menu-copy"><strong>${title}</strong><small>Back to create menu</small></span>
    </button><div class="create-menu-divider"></div>`;
  }

  function openMenu() {
    menuView = "main";
    updateMenuView();

    const backdrop = document.getElementById("createMenuBackdrop");
    const menu = document.getElementById("createMenu");
    const button = document.getElementById("createMenuButton");

    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    if (window.innerWidth > 860 && button) {
      const rect = button.getBoundingClientRect();
      const width = 318;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left - 4));
      const bottom = Math.max(12, window.innerHeight - rect.top + 9);
      menu.style.left = `${left}px`;
      menu.style.bottom = `${bottom}px`;
      menu.style.top = "auto";
      menu.style.right = "auto";
    } else {
      menu.removeAttribute("style");
    }
  }

  function closeMenu() {
    document.getElementById("createMenuBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  function updateMenuView() {
    document.getElementById("createMainMenu").classList.toggle("hidden", menuView !== "main");
    document.getElementById("uploadSubmenu").classList.toggle("active", menuView === "uploads");
    document.getElementById("toolsSubmenu").classList.toggle("active", menuView === "tools");

    document.getElementById("createMenuHeading").textContent =
      menuView === "uploads" ? "More uploads" :
      menuView === "tools" ? "More tools" :
      "Ask AI NEXUS";

    document.getElementById("createMenuSubtitle").textContent =
      menuView === "uploads" ? "Choose an upload source" :
      menuView === "tools" ? "Open an AI workspace" :
      "Create, upload and build";
  }

  function runAction(action) {
    switch (action) {
      case "back":
        menuView = "main";
        updateMenuView();
        break;
      case "uploads":
      case "tools":
        menuView = action;
        updateMenuView();
        break;
      case "drive":
        closeMenu();
        openDriveDialog();
        break;
      case "photos":
        document.getElementById("photoInput")?.click();
        break;
      case "camera":
        document.getElementById("cameraInput")?.click();
        break;
      case "pdf":
        document.getElementById("pdfInput")?.click();
        break;
      case "codefile":
        document.getElementById("codeInput")?.click();
        break;
      case "files":
        document.getElementById("fileInput")?.click();
        break;
      case "cloudfiles":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("files");
        break;
      case "image":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("image");
        break;
      case "avatar":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("image");
        setTimeout(() => {
          const field = document.getElementById("imagePrompt");
          if (field) {
            field.value = "Create a polished futuristic profile avatar for MARK ZOSUF, AI and machine learning developer, neon cyan blue purple and pink, clean dark background, centered portrait, premium app-profile style.";
            field.focus();
          }
        }, 140);
        break;
      case "video":
      case "music":
        closeMenu();
        openMediaStudio(action);
        break;
      case "canvas":
        closeMenu();
        openCanvasStudio("document");
        break;
      case "guided":
        closeMenu();
        window.NEXUS_APP?.selectTool?.("study-tutor");
        window.NEXUS_APP?.setPrompt?.("Start Guided Learning for this topic. First ask one question to check my level. Then teach step by step with examples, mini exercises, feedback and a final revision quiz:\n\n");
        break;
      case "bots":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("bots");
        break;
      case "codestudio":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("code");
        break;
      case "memory":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("memory");
        break;
      case "promptlibrary":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("prompts");
        break;
      case "nexushub":
        closeMenu();
        window.NEXUS_ADVANCED?.open?.("home");
        break;
    }
  }

  function createDriveDialog() {
    const backdrop = document.createElement("div");
    backdrop.id = "driveDialogBackdrop";
    backdrop.className = "nexus-dialog-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="nexus-dialog" role="dialog" aria-modal="true" aria-labelledby="driveDialogTitle">
        <header class="nexus-dialog-header">
          <div><h2 id="driveDialogTitle">Add from Google Drive</h2><p>Public links only. Private Drive access requires Google OAuth.</p></div>
          <button class="nexus-dialog-close" id="driveDialogClose">✕</button>
        </header>
        <div class="nexus-dialog-body">
          <form class="nexus-form-stack" id="driveImportForm">
            <label class="nexus-form-field"><span>Google Drive share link</span><input id="driveUrlInput" type="url" required placeholder="https://drive.google.com/file/d/.../view"></label>
            <div class="nexus-dialog-actions">
              <button class="nexus-dialog-primary">Import public file</button>
              <button class="nexus-dialog-secondary" type="button" id="openCloudLibrary">Open cloud library</button>
            </div>
          </form>
          <div id="driveImportResult" style="margin-top:13px"></div>
        </div>
      </section>
    `;
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeDriveDialog();
    });
    document.body.appendChild(backdrop);
    document.getElementById("driveDialogClose").onclick = closeDriveDialog;
    document.getElementById("openCloudLibrary").onclick = () => {
      closeDriveDialog();
      window.NEXUS_ADVANCED?.open?.("files");
    };
    document.getElementById("driveImportForm").onsubmit = importDriveFile;
  }

  function openDriveDialog() {
    document.getElementById("driveDialogBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("driveUrlInput")?.focus(), 30);
  }

  function closeDriveDialog() {
    document.getElementById("driveDialogBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  async function importDriveFile(event) {
    event.preventDefault();
    const result = document.getElementById("driveImportResult");
    const url = document.getElementById("driveUrlInput").value.trim();
    result.innerHTML = '<div class="nexus-dialog-status">Importing public Drive file…</div>';
    try {
      const response = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Drive import failed.");
      const bytes = Uint8Array.from(atob(data.base64), char => char.charCodeAt(0));
      const file = new File([bytes], data.name || "drive-file", { type: data.mime || "application/octet-stream" });
      await window.NEXUS_APP?.handleFile?.(file);
      result.innerHTML = `<div class="nexus-dialog-status ok">${escapeHtml(data.name)} imported and attached.</div>`;
      setTimeout(closeDriveDialog, 700);
    } catch (error) {
      result.innerHTML = `<div class="nexus-dialog-status error">${escapeHtml(error.message)}</div>`;
    }
  }

  function createMediaStudio() {
    const backdrop = document.createElement("div");
    backdrop.id = "mediaStudioBackdrop";
    backdrop.className = "media-studio-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="media-studio" role="dialog" aria-modal="true" aria-labelledby="mediaStudioTitle">
        <header class="media-studio-header">
          <div><h2 id="mediaStudioTitle">AI Media Studio</h2><p id="mediaStudioSubtitle">Create a production plan or render with a configured provider.</p></div>
          <button class="media-studio-close" id="mediaStudioClose">✕</button>
        </header>
        <div class="media-mode-tabs">
          <button class="media-mode-tab active" data-media-mode="video">Video</button>
          <button class="media-mode-tab" data-media-mode="music">Music</button>
        </div>
        <div class="media-studio-body">
          <form class="nexus-form-stack" id="mediaStudioForm">
            <label class="nexus-form-field"><span>Idea or prompt</span><textarea id="mediaPrompt" rows="5" required maxlength="4000" placeholder="Describe the video or music you want to create…"></textarea></label>
            <div class="nexus-form-row" id="videoOptions">
              <label class="nexus-form-field"><span>Aspect ratio</span><select id="videoAspect"><option value="16:9">16:9 Landscape</option><option value="9:16">9:16 Short/Reel</option><option value="1:1">1:1 Square</option></select></label>
              <label class="nexus-form-field"><span>Duration</span><select id="videoDuration"><option value="8">8 seconds</option><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label>
            </div>
            <div class="nexus-form-row" id="musicOptions" hidden>
              <label class="nexus-form-field"><span>Genre</span><input id="musicGenre" placeholder="Lo-fi, cinematic, hip-hop…"></label>
              <label class="nexus-form-field"><span>Duration</span><select id="musicDuration"><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="120">2 minutes</option><option value="180">3 minutes</option></select></label>
            </div>
            <label class="nexus-form-field"><span>Style</span><input id="mediaStyle" placeholder="Neon cinematic, realistic, energetic…"></label>
            <div class="nexus-dialog-actions">
              <button class="nexus-dialog-primary" id="mediaGenerateButton">Create</button>
              <button class="nexus-dialog-secondary" type="button" id="mediaUseChat">Build in chat</button>
            </div>
          </form>
          <div class="media-result" id="mediaResult"></div>
        </div>
      </section>
    `;
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeMediaStudio();
    });
    document.body.appendChild(backdrop);
    document.getElementById("mediaStudioClose").onclick = closeMediaStudio;
    document.getElementById("mediaStudioForm").onsubmit = generateMedia;
    document.getElementById("mediaUseChat").onclick = buildMediaInChat;
    backdrop.querySelectorAll("[data-media-mode]").forEach(button => {
      button.onclick = () => setMediaMode(button.dataset.mediaMode);
    });
  }

  function openMediaStudio(mode) {
    setMediaMode(mode);
    document.getElementById("mediaStudioBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("mediaPrompt")?.focus(), 30);
  }

  function closeMediaStudio() {
    document.getElementById("mediaStudioBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  function setMediaMode(mode) {
    document.getElementById("mediaStudioBackdrop").dataset.mode = mode;
    document.querySelectorAll("[data-media-mode]").forEach(button => button.classList.toggle("active", button.dataset.mediaMode === mode));
    document.getElementById("videoOptions").hidden = mode !== "video";
    document.getElementById("musicOptions").hidden = mode !== "music";
    document.getElementById("mediaStudioTitle").textContent = mode === "video" ? "Create video" : "Create music";
    document.getElementById("mediaStudioSubtitle").textContent = mode === "video" ? "Generate a storyboard and optional provider-rendered video." : "Generate a music production plan and optional provider-rendered track.";
    document.getElementById("mediaGenerateButton").textContent = mode === "video" ? "Create video" : "Create music";
    document.getElementById("mediaResult").innerHTML = "";
  }

  async function generateMedia(event) {
    event.preventDefault();
    const mode = document.getElementById("mediaStudioBackdrop").dataset.mode || "video";
    const result = document.getElementById("mediaResult");
    result.innerHTML = `<div class="nexus-dialog-status">Creating ${mode}…</div>`;
    const payload = {
      type: mode,
      prompt: document.getElementById("mediaPrompt").value.trim(),
      style: document.getElementById("mediaStyle").value.trim(),
      aspectRatio: document.getElementById("videoAspect").value,
      duration: Number(mode === "video" ? document.getElementById("videoDuration").value : document.getElementById("musicDuration").value),
      genre: document.getElementById("musicGenre").value.trim()
    };
    try {
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `${mode} creation failed.`);
      if (data.url && mode === "video") {
        result.innerHTML = `<div class="nexus-dialog-status ok">Rendered by configured provider.</div><video controls src="${escapeHtml(data.url)}"></video>`;
      } else if (data.url && mode === "music") {
        result.innerHTML = `<div class="nexus-dialog-status ok">Rendered by configured provider.</div><audio controls src="${escapeHtml(data.url)}"></audio>`;
      } else {
        result.innerHTML = `<div class="nexus-dialog-status ok">${data.mode === "plan" ? "A production plan was created. Configure a media provider to render the final file." : "Media request completed."}</div><div class="media-plan-output">${escapeHtml(data.result || JSON.stringify(data, null, 2))}</div>`;
      }
    } catch (error) {
      result.innerHTML = `<div class="nexus-dialog-status error">${escapeHtml(error.message)}</div>`;
    }
  }

  function buildMediaInChat() {
    const mode = document.getElementById("mediaStudioBackdrop").dataset.mode || "video";
    const prompt = document.getElementById("mediaPrompt").value.trim();
    const style = document.getElementById("mediaStyle").value.trim();
    const instruction = mode === "video"
      ? `Create a complete AI video production package for this idea. Include hook, scenes, shot list, camera movement, narration, on-screen text, sound design, aspect ratio ${document.getElementById("videoAspect").value}, duration ${document.getElementById("videoDuration").value} seconds, style ${style || "best fit"}, and final video-generation prompts:\n\n${prompt}`
      : `Create a complete AI music production package for this idea. Include genre ${document.getElementById("musicGenre").value || "best fit"}, duration ${document.getElementById("musicDuration").value} seconds, style ${style || "best fit"}, tempo, instruments, structure, vocal direction, safe original lyric concept and final music-generation prompt:\n\n${prompt}`;
    closeMediaStudio();
    window.NEXUS_APP?.selectTool?.("project-builder");
    window.NEXUS_APP?.setPrompt?.(instruction);
  }

  function createCanvasStudio() {
    const backdrop = document.createElement("div");
    backdrop.id = "canvasStudioBackdrop";
    backdrop.className = "canvas-studio-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="canvas-studio" role="dialog" aria-modal="true" aria-labelledby="canvasStudioTitle">
        <header class="canvas-studio-header"><div><h2 id="canvasStudioTitle">AI NEXUS Canvas</h2><p>Write, code and build slide outlines</p></div><button class="canvas-studio-close" id="canvasStudioClose">✕</button></header>
        <div class="canvas-tabs"><button class="canvas-tab active" data-canvas-mode="document">Document</button><button class="canvas-tab" data-canvas-mode="code">Code</button><button class="canvas-tab" data-canvas-mode="slides">Slides</button></div>
        <div class="canvas-editor-panel"><textarea class="canvas-editor" id="canvasEditor" placeholder="Start creating…"></textarea></div>
        <footer class="canvas-studio-footer"><div><button class="canvas-action primary" id="canvasAskAI">✦ Improve with AI</button><button class="canvas-action" id="canvasCodeStudio">⌘ Code Studio</button></div><div><button class="canvas-action" id="canvasDownload">⇩ Download</button><button class="canvas-action" id="canvasClear">Clear</button></div></footer>
      </section>
    `;
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeCanvasStudio();
    });
    document.body.appendChild(backdrop);
    document.getElementById("canvasStudioClose").onclick = closeCanvasStudio;
    document.getElementById("canvasClear").onclick = clearCanvas;
    document.getElementById("canvasDownload").onclick = downloadCanvas;
    document.getElementById("canvasAskAI").onclick = improveCanvas;
    document.getElementById("canvasCodeStudio").onclick = () => {
      closeCanvasStudio();
      window.NEXUS_ADVANCED?.open?.("code");
    };
    backdrop.querySelectorAll("[data-canvas-mode]").forEach(button => {
      button.onclick = () => setCanvasMode(button.dataset.canvasMode);
    });
    document.getElementById("canvasEditor").addEventListener("input", debounce(saveCanvas, 250));
  }

  function openCanvasStudio(mode = "document") {
    setCanvasMode(mode);
    document.getElementById("canvasStudioBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("canvasEditor")?.focus(), 30);
  }

  function closeCanvasStudio() {
    document.getElementById("canvasStudioBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  function setCanvasMode(mode) {
    saveCanvas();
    activeCanvasMode = mode;
    document.querySelectorAll("[data-canvas-mode]").forEach(button => button.classList.toggle("active", button.dataset.canvasMode === mode));
    const data = loadCanvas();
    const editor = document.getElementById("canvasEditor");
    if (editor) editor.value = data[mode] || defaultCanvas(mode);
  }

  function defaultCanvas(mode) {
    if (mode === "slides") return "# Presentation title\n\n## Slide 1 — Introduction\n- Main point\n- Supporting detail\n\n## Slide 2 — Key idea\n- Main point\n- Example";
    if (mode === "code") return "// Write or describe your code here.\n";
    return "# New document\n\nStart writing here…";
  }

  function loadCanvas() {
    try { return JSON.parse(localStorage.getItem(CANVAS_KEY)) || {}; }
    catch { return {}; }
  }

  function saveCanvas() {
    const editor = document.getElementById("canvasEditor");
    if (!editor) return;
    const data = loadCanvas();
    data[activeCanvasMode] = editor.value;
    localStorage.setItem(CANVAS_KEY, JSON.stringify(data));
  }

  function clearCanvas() {
    if (!confirm("Clear this Canvas?")) return;
    document.getElementById("canvasEditor").value = "";
    saveCanvas();
  }

  function improveCanvas() {
    saveCanvas();
    const text = document.getElementById("canvasEditor").value;
    const instruction = activeCanvasMode === "slides"
      ? "Turn this into a polished slide-deck outline with concise slide titles, bullets, visual suggestions and speaker notes:"
      : activeCanvasMode === "code"
        ? "Improve this code or coding plan. Explain important changes and return production-quality code:"
        : "Improve this document for clarity, structure, grammar and impact while preserving its meaning:";
    closeCanvasStudio();
    window.NEXUS_APP?.setPrompt?.(`${instruction}\n\n${text}`);
  }

  function downloadCanvas() {
    saveCanvas();
    const content = document.getElementById("canvasEditor").value;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus-canvas-${activeCanvasMode}.${activeCanvasMode === "code" ? "txt" : "md"}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }
})();
