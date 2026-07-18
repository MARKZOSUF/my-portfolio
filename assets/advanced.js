(() => {
  "use strict";

  const KEYS = {
    prompts: "nexus-v8-prompts",
    bots: "nexus-v8-bots",
    memories: "nexus-v8-memories",
    favorites: "nexus-v8-favorites",
    draft: "nexus-v8-draft",
    activeBot: "nexus-v8-active-bot"
  };

  const DEFAULT_PROMPTS = [
    ["Code review", "Review this code for bugs, security, performance, readability, and return an improved version:\n\n"],
    ["Research brief", "Research this topic using current web sources. Give key facts, disagreements, and numbered sources:\n\n"],
    ["Study notes", "Turn this topic into exam-ready notes with examples, common mistakes, and quick revision:\n\n"],
    ["Project architect", "Design this project completely: features, architecture, database, APIs, folder structure, milestones, testing, and deployment:\n\n"],
    ["Resume upgrade", "Improve this resume honestly. Do not invent achievements. Return stronger bullet points:\n\n"],
    ["Interview practice", "Act as an interviewer. Ask one question at a time and increase difficulty for:\n\n"]
  ];

  const DEFAULT_BOTS = [
    { id: "coding-mentor", icon: "⌘", name: "Coding Mentor", instructions: "Act as a patient senior software engineer. Explain in simple Hinglish and provide safe production-quality code." },
    { id: "study-coach", icon: "📚", name: "Study Coach", instructions: "Act as a supportive study coach. Use examples, revision questions, and realistic study plans." },
    { id: "researcher", icon: "🔎", name: "Researcher", instructions: "Separate sourced facts, inference, and uncertainty. Use numbered citations when web context is available." }
  ];

  const state = {
    config: {},
    installPrompt: null,
    turnstileToken: "",
    turnstileWidget: null,
    activeBotId: localStorage.getItem(KEYS.activeBot) || "",
    pyodide: null,
    account: null
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    injectLaunchers();
    createHub();
    clearLegacyDraft();
    setupInstallPrompt();
    await loadConfig();
    await loadAccount();
    await hydrateSharedChat();
    handlePaymentReturn();

    window.NEXUS_ADVANCED = {
      open: openHub,
      favoriteMessage,
      getMemoryText,
      getActiveBotInstructions,
      getTurnstileToken: () => state.turnstileToken,
      resetTurnstile,
      onGenerationComplete
    };
  }

  function injectLaunchers() {
    document.getElementById("hiddenAccountLauncher")?.addEventListener("click", () => openHub("account"));
    document.getElementById("aboutInstallButton")?.addEventListener("click", installApp);

    const nav = document.createElement("nav");
    nav.className = "nexus-mobile-nav";
    nav.innerHTML = `
      <button data-view="chat"><span>💬</span>Chat</button>
      <button data-view="home"><span>✦</span>Hub</button>
      <button data-view="files"><span>📁</span>Files</button>
      <button data-view="account"><span>👤</span>Profile</button>`;
    nav.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.view === "chat") document.getElementById("promptInput")?.focus();
      else openHub(button.dataset.view);
    });
    document.body.appendChild(nav);
  }

  function createHub() {
    const backdrop = document.createElement("div");
    backdrop.id = "nexusHub";
    backdrop.className = "nexus-hub-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="nexus-hub" role="dialog" aria-modal="true" aria-label="Nexus Hub">
        <nav class="nexus-hub-nav" id="nexusHubNav">
          <div class="nexus-hub-brand"><img src="/assets/logo-icon.png?v=15.1.0" alt=""><div><strong>NEXUS HUB</strong><small>Production V15.1.0</small></div></div>
          ${navButton("home", "◈", "Overview")}
          ${navButton("prompts", "✨", "Prompts")}
          ${navButton("bots", "🤖", "Bots")}
          ${navButton("files", "📁", "Files")}
          ${navButton("code", "⌘", "Code")}
          ${navButton("image", "🖼️", "Images")}
          ${navButton("memory", "🧠", "Memory")}
          ${navButton("chats", "🗂️", "Chats")}
          ${navButton("account", "👤", "Account")}
          ${navButton("plans", "◆", "Plans")}
          ${navButton("admin", "📊", "Admin")}
          <div class="nexus-nav-spacer"></div>
          ${navButton("install", "⬇", "Install")}
        </nav>
        <main class="nexus-hub-main">
          <header class="nexus-hub-header"><div><h2 id="nexusViewTitle">Nexus Hub</h2><p id="nexusViewSubtitle">Advanced AI workspace</p></div><button class="nexus-close" id="nexusHubClose">✕</button></header>
          <section class="nexus-view" id="nexusView"></section>
        </main>
      </section>`;
    backdrop.addEventListener("click", event => { if (event.target === backdrop) closeHub(); });
    document.body.appendChild(backdrop);
    document.getElementById("nexusHubClose").onclick = closeHub;
    document.getElementById("nexusHubNav").onclick = event => {
      const button = event.target.closest("[data-nexus-view]");
      if (button) render(button.dataset.nexusView);
    };
  }

  function navButton(view, icon, label) {
    return `<button class="nexus-nav-button" data-nexus-view="${view}"><span>${icon}</span><span>${label}</span></button>`;
  }

  function openHub(view = "home") {
    document.getElementById("nexusHub").hidden = false;
    document.body.style.overflow = "hidden";
    render(view);
  }

  function closeHub() {
    document.getElementById("nexusHub").hidden = true;
    document.body.style.overflow = "";
  }

  function render(view) {
    const meta = {
      home: ["Nexus Hub", "Advanced AI workspace controls"],
      prompts: ["Prompt Library", "Reusable professional prompts"],
      bots: ["Custom Bots", "Assistants with their own instructions"],
      files: ["File Library", "Browser and optional R2 storage"],
      code: ["Code Studio", "HTML, CSS, JavaScript and Python runner"],
      image: ["Image Studio", "Generate, resize and compress images"],
      memory: ["Long-term Memory", "Reusable preferences and project context"],
      chats: ["Chat Manager", "Folders, pinning, archive, share and export"],
      account: ["Account & Cloud Sync", "D1 login and cross-device chats"],
      plans: ["Plans & Billing", "Optional Stripe or Razorpay checkout"],
      admin: ["Admin Dashboard", "Usage and integration status"],
      install: ["Install AI NEXUS", "Use it like a standalone app"]
    };
    const [title, subtitle] = meta[view] || meta.home;
    document.getElementById("nexusViewTitle").textContent = title;
    document.getElementById("nexusViewSubtitle").textContent = subtitle;
    document.querySelectorAll(".nexus-nav-button").forEach(button => button.classList.toggle("active", button.dataset.nexusView === view));
    const el = document.getElementById("nexusView");
    const renderers = { home: renderHome, prompts: renderPrompts, bots: renderBots, files: renderFiles, code: renderCode, image: renderImages, memory: renderMemory, chats: renderChats, account: renderAccount, plans: renderPlans, admin: renderAdmin, install: renderInstall };
    (renderers[view] || renderHome)(el);
  }

  function renderHome(el) {
    const cards = [
      ["🔎", "Live Web Research", "Current web results with numbered sources.", enableWebResearch],
      ["🖼️", "Image Generation", "Create images using Workers AI FLUX.", () => render("image")],
      ["⌘", "Code Studio", "Live web preview and optional Python runner.", () => render("code")],
      ["📚", "PDF Chat", "Attach a PDF and ask for page citations.", () => triggerFile(".pdf")],
      ["🤖", "Custom Bots", "Create reusable assistants.", () => render("bots")],
      ["🧠", "Long-term Memory", "Save preferences and project context.", () => render("memory")],
      ["☁️", "Cloud Sync", "D1 accounts and cross-device conversations.", () => render("account")],
      ["📁", "File Library", "IndexedDB and optional R2 storage.", () => render("files")],
      ["🔗", "Share & Export", "Public links, Word, HTML and PDF.", () => render("chats")],
      ["🛡️", "Security", "Turnstile, rate limits and validation.", () => render("admin")],
      ["⚡", "Multi-provider AI", "Cloudflare, OpenAI, Claude, Gemini and Groq.", () => document.getElementById("settingsButton")?.click()],
      ["⬇", "Installable PWA", "Offline shell, drafts and notifications.", () => render("install")]
    ];
    el.innerHTML = `<div class="nexus-status ${state.config.features?.ai ? "ok" : "warn"}">${featureSummary()}</div><div class="nexus-feature-grid" id="featureGrid" style="margin-top:12px"></div><div class="nexus-button-row" style="margin-top:16px"><button class="nexus-primary" id="quickNew">＋ New chat</button><button class="nexus-secondary" id="quickSync">☁ Sync</button><button class="nexus-secondary" id="quickShare">🔗 Share</button><button class="nexus-secondary" id="quickInstall">⬇ Install</button></div>`;
    const grid = el.querySelector("#featureGrid");
    cards.forEach(([icon, title, text, action]) => {
      const button = document.createElement("button");
      button.className = "nexus-card";
      button.innerHTML = `<span class="nexus-card-icon">${icon}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>`;
      button.onclick = action;
      grid.appendChild(button);
    });
    el.querySelector("#quickNew").onclick = () => { window.NEXUS_APP?.createChat?.(true); closeHub(); };
    el.querySelector("#quickSync").onclick = () => syncToCloud(true);
    el.querySelector("#quickShare").onclick = shareActiveChat;
    el.querySelector("#quickInstall").onclick = installApp;
  }

  function renderPrompts(el) {
    const custom = loadJSON(KEYS.prompts, []);
    const prompts = [...DEFAULT_PROMPTS.map(([name, prompt]) => ({ id: name, name, prompt, builtIn: true })), ...custom];
    el.innerHTML = `<div class="nexus-prompt-grid" id="promptGrid"></div><form class="nexus-form" id="promptForm" style="margin-top:18px"><label class="nexus-field"><span>Name</span><input id="promptName" required maxlength="60"></label><label class="nexus-field"><span>Prompt</span><textarea id="promptText" rows="5" required maxlength="5000"></textarea></label><button class="nexus-primary">Save prompt</button></form>`;
    const grid = el.querySelector("#promptGrid");
    prompts.forEach(item => {
      const card = document.createElement("div");
      card.className = "nexus-card";
      card.innerHTML = `<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.prompt.slice(0,140))}</p><div class="nexus-button-row" style="margin-top:10px"><button class="nexus-primary use">Use</button>${item.builtIn ? "" : '<button class="nexus-danger del">Delete</button>'}</div>`;
      card.querySelector(".use").onclick = () => { window.NEXUS_APP?.setPrompt?.(item.prompt); closeHub(); };
      card.querySelector(".del")?.addEventListener("click", () => { localStorage.setItem(KEYS.prompts, JSON.stringify(custom.filter(p => p.id !== item.id))); renderPrompts(el); });
      grid.appendChild(card);
    });
    el.querySelector("#promptForm").onsubmit = event => {
      event.preventDefault();
      custom.push({ id: crypto.randomUUID(), name: el.querySelector("#promptName").value.trim(), prompt: el.querySelector("#promptText").value.trim() });
      localStorage.setItem(KEYS.prompts, JSON.stringify(custom));
      renderPrompts(el);
    };
  }

  function renderBots(el) {
    const custom = loadJSON(KEYS.bots, []);
    const bots = [...DEFAULT_BOTS, ...custom];
    el.innerHTML = `<div class="nexus-status ${state.activeBotId ? "ok" : ""}">Active bot: ${escapeHtml(getActiveBot()?.name || "Standard AI")}</div><div class="nexus-bot-grid" id="botGrid" style="margin-top:12px"></div><form class="nexus-form" id="botForm" style="margin-top:18px"><div class="nexus-row"><label class="nexus-field"><span>Name</span><input id="botName" required></label><label class="nexus-field"><span>Icon</span><input id="botIcon" value="🤖" maxlength="4"></label></div><label class="nexus-field"><span>Instructions</span><textarea id="botInstructions" rows="6" required maxlength="4000"></textarea></label><button class="nexus-primary">Create bot</button></form>`;
    const grid = el.querySelector("#botGrid");
    bots.forEach(bot => {
      const card = document.createElement("div");
      card.className = "nexus-card";
      card.innerHTML = `<span class="nexus-card-icon">${escapeHtml(bot.icon)}</span><h3>${escapeHtml(bot.name)}</h3><p>${escapeHtml(bot.instructions.slice(0,130))}</p><div class="nexus-button-row" style="margin-top:10px"><button class="nexus-primary activate">${state.activeBotId === bot.id ? "Active" : "Activate"}</button>${DEFAULT_BOTS.some(b => b.id === bot.id) ? "" : '<button class="nexus-danger del">Delete</button>'}</div>`;
      card.querySelector(".activate").onclick = () => { state.activeBotId = state.activeBotId === bot.id ? "" : bot.id; localStorage.setItem(KEYS.activeBot, state.activeBotId); renderBots(el); };
      card.querySelector(".del")?.addEventListener("click", () => { localStorage.setItem(KEYS.bots, JSON.stringify(custom.filter(b => b.id !== bot.id))); if (state.activeBotId === bot.id) state.activeBotId = ""; renderBots(el); });
      grid.appendChild(card);
    });
    el.querySelector("#botForm").onsubmit = event => {
      event.preventDefault();
      custom.push({ id: crypto.randomUUID(), name: el.querySelector("#botName").value.trim(), icon: el.querySelector("#botIcon").value.trim() || "🤖", instructions: el.querySelector("#botInstructions").value.trim() });
      localStorage.setItem(KEYS.bots, JSON.stringify(custom));
      renderBots(el);
    };
  }

  async function renderFiles(el) {
    const cloudReady = Boolean(state.config.features?.database && state.config.features?.storage);
    const cloudStyle = cloudReady ? "cursor:pointer" : "cursor:not-allowed;opacity:.55";
    el.innerHTML = `<div class="nexus-button-row"><label class="nexus-primary" style="cursor:pointer">Upload local<input type="file" id="localUpload" hidden></label><label class="nexus-secondary" style="${cloudStyle}" aria-disabled="${cloudReady ? "false" : "true"}">Upload cloud<input type="file" id="cloudUpload" ${cloudReady ? "" : "disabled"} hidden></label><button class="nexus-secondary" id="refreshCloud" ${cloudReady ? "" : "disabled"}>Refresh cloud</button></div>${cloudReady ? "" : '<div class="nexus-status" style="margin-top:12px">R2 is not connected. Local browser storage remains fully available.</div>'}<div class="nexus-section" style="margin-top:16px"><div class="nexus-section-title"><h3>Local browser files</h3></div><div class="nexus-list" id="localFiles"></div></div><div class="nexus-section"><div class="nexus-section-title"><h3>Cloud R2 files</h3></div><div class="nexus-list" id="cloudFiles"></div></div>`;
    el.querySelector("#localUpload").onchange = async e => { if (e.target.files[0]) { await saveLocalFile(e.target.files[0]); renderFiles(el); } };
    if (cloudReady) {
      el.querySelector("#cloudUpload").onchange = async e => { if (e.target.files[0]) { await uploadCloudFile(e.target.files[0]); renderFiles(el); } };
      el.querySelector("#refreshCloud").onclick = () => loadCloudFiles(el.querySelector("#cloudFiles"));
    }
    await renderLocalFiles(el.querySelector("#localFiles"));
    if (cloudReady) await loadCloudFiles(el.querySelector("#cloudFiles"));
    else el.querySelector("#cloudFiles").innerHTML = '<div class="nexus-status">Cloud storage not connected.</div>';
  }

  function renderCode(el) {
    const saved = loadJSON("nexus-v8-code", { html: "<h1>Hello AI NEXUS</h1>", css: "body{font-family:system-ui;padding:30px;background:#0b1020;color:white}", js: "console.log('ready')", python: "print('Hello from Python')" });
    el.innerHTML = `<div class="nexus-tabs"><button class="nexus-tab active" data-tab="web">Web</button><button class="nexus-tab" data-tab="python">Python</button></div><section id="webPanel"><div class="nexus-button-row" style="margin-bottom:9px"><button class="nexus-primary" id="runWeb">▶ Run</button><button class="nexus-secondary" id="downloadWeb">Download HTML</button></div><div class="nexus-code-layout"><div class="nexus-stack"><label class="nexus-field"><span>HTML</span><textarea class="nexus-code-editor" id="codeHtml"></textarea></label><label class="nexus-field"><span>CSS</span><textarea class="nexus-code-editor" id="codeCss"></textarea></label><label class="nexus-field"><span>JavaScript</span><textarea class="nexus-code-editor" id="codeJs"></textarea></label></div><iframe class="nexus-preview" id="preview" sandbox="allow-scripts"></iframe></div></section><section id="pythonPanel" hidden><div class="nexus-button-row" style="margin-bottom:9px"><button class="nexus-primary" id="runPython">▶ Run Python</button></div><label class="nexus-field"><span>Python</span><textarea class="nexus-code-editor" id="codePython"></textarea></label><pre class="nexus-status" id="pythonOutput" style="white-space:pre-wrap;min-height:100px"></pre></section>`;
    el.querySelector("#codeHtml").value = saved.html; el.querySelector("#codeCss").value = saved.css; el.querySelector("#codeJs").value = saved.js; el.querySelector("#codePython").value = saved.python;
    el.querySelectorAll("[data-tab]").forEach(button => button.onclick = () => { el.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("active")); button.classList.add("active"); const py = button.dataset.tab === "python"; el.querySelector("#webPanel").hidden = py; el.querySelector("#pythonPanel").hidden = !py; });
    const collect = () => ({ html: el.querySelector("#codeHtml").value, css: el.querySelector("#codeCss").value, js: el.querySelector("#codeJs").value, python: el.querySelector("#codePython").value });
    const run = () => { const c = collect(); localStorage.setItem("nexus-v8-code", JSON.stringify(c)); el.querySelector("#preview").srcdoc = `<!doctype html><style>${c.css}</style>${c.html}<script>${c.js}<\/script>`; };
    el.querySelector("#runWeb").onclick = run;
    el.querySelector("#downloadWeb").onclick = () => { const c = collect(); downloadText("nexus-project.html", `<!doctype html><meta charset="utf-8"><style>${c.css}</style>${c.html}<script>${c.js}<\/script>`, "text/html"); };
    el.querySelector("#runPython").onclick = async () => { const out = el.querySelector("#pythonOutput"); out.textContent = "Loading Python runtime…"; try { if (!state.pyodide) { await loadScript("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js"); state.pyodide = await loadPyodide(); } out.textContent = ""; state.pyodide.setStdout({ batched: t => out.textContent += t + "\n" }); state.pyodide.setStderr({ batched: t => out.textContent += "ERROR: " + t + "\n" }); const result = await state.pyodide.runPythonAsync(collect().python); if (result !== undefined) out.textContent += String(result); } catch (error) { out.textContent += error.message; } };
    run();
  }

  function renderImages(el) {
    el.innerHTML = `<form class="nexus-form" id="generateForm"><label class="nexus-field"><span>Image prompt</span><textarea id="imagePrompt" rows="4" required placeholder="A futuristic neon AI laboratory…"></textarea></label><div class="nexus-row"><label class="nexus-field"><span>Width</span><select id="imageWidth"><option>512</option><option selected>768</option><option>1024</option></select></label><label class="nexus-field"><span>Height</span><select id="imageHeight"><option>512</option><option selected>768</option><option>1024</option></select></label></div><button class="nexus-primary">Generate image</button></form><div id="imageResult"></div><div class="nexus-section" style="margin-top:18px"><div class="nexus-section-title"><h3>Quick image tools</h3></div><div class="nexus-button-row"><label class="nexus-secondary" style="cursor:pointer">Choose image<input id="quickImage" type="file" accept="image/*" hidden></label><button class="nexus-secondary" id="compress" disabled>Compress</button><button class="nexus-secondary" id="gray" disabled>Grayscale</button><button class="nexus-secondary" id="resize" disabled>Resize 1024px</button></div><canvas id="imageCanvas" style="display:none;max-width:100%;margin-top:12px;border-radius:14px"></canvas></div>`;
    el.querySelector("#generateForm").onsubmit = async event => { event.preventDefault(); const result = el.querySelector("#imageResult"); result.innerHTML = '<div class="nexus-status">Generating…</div>'; try { const response = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: el.querySelector("#imagePrompt").value.trim(), width: Number(el.querySelector("#imageWidth").value), height: Number(el.querySelector("#imageHeight").value), turnstileToken: state.turnstileToken }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); result.innerHTML = `<img class="nexus-image-output" src="${data.dataURI}" alt="Generated"><div class="nexus-button-row"><button class="nexus-primary" id="saveGenerated">Download</button><button class="nexus-secondary" id="saveGeneratedLibrary">Save to Library</button></div>`; result.querySelector("#saveGenerated").onclick = () => downloadDataUrl("nexus-generated.jpg", data.dataURI); result.querySelector("#saveGeneratedLibrary").onclick = () => window.NEXUS_PRO?.saveGeneratedImage?.(data.dataURI, el.querySelector("#imagePrompt").value.trim()); } catch (error) { result.innerHTML = `<div class="nexus-status error">${escapeHtml(error.message)}</div>`; } };
    let image; const canvas = el.querySelector("#imageCanvas"); const ctx = canvas.getContext("2d");
    el.querySelector("#quickImage").onchange = async event => { const file = event.target.files[0]; if (!file) return; image = await imageFromFile(file); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; ctx.drawImage(image,0,0); canvas.style.display = "block"; ["#compress","#gray","#resize"].forEach(id => el.querySelector(id).disabled = false); };
    el.querySelector("#compress").onclick = () => downloadDataUrl("compressed.jpg", canvas.toDataURL("image/jpeg", .62));
    el.querySelector("#gray").onclick = () => { const d = ctx.getImageData(0,0,canvas.width,canvas.height); for (let i=0;i<d.data.length;i+=4) { const v=d.data[i]*.299+d.data[i+1]*.587+d.data[i+2]*.114; d.data[i]=d.data[i+1]=d.data[i+2]=v; } ctx.putImageData(d,0,0); };
    el.querySelector("#resize").onclick = () => { const scale=Math.min(1,1024/Math.max(canvas.width,canvas.height)); const t=document.createElement("canvas"); t.width=Math.round(canvas.width*scale); t.height=Math.round(canvas.height*scale); t.getContext("2d").drawImage(canvas,0,0,t.width,t.height); downloadDataUrl("resized.png",t.toDataURL("image/png")); };
  }

  function renderMemory(el) {
    const memories = loadJSON(KEYS.memories, []);
    el.innerHTML = `<div class="nexus-status">Memory is sent only when enabled in Settings.</div><div class="nexus-list" id="memoryList" style="margin-top:12px"></div><form class="nexus-form" id="memoryForm" style="margin-top:16px"><label class="nexus-field"><span>Add memory</span><textarea id="memoryText" rows="3" required maxlength="1000"></textarea></label><button class="nexus-primary">Save memory</button></form>`;
    const list = el.querySelector("#memoryList"); if (!memories.length) list.innerHTML = '<div class="nexus-status">No memories.</div>';
    memories.forEach(memory => { const row=document.createElement("div"); row.className="nexus-list-item"; row.innerHTML=`<div><strong>Memory</strong><small>${escapeHtml(memory.text)}</small></div><button class="nexus-danger">Delete</button>`; row.querySelector("button").onclick=()=>{localStorage.setItem(KEYS.memories,JSON.stringify(memories.filter(m=>m.id!==memory.id)));renderMemory(el)}; list.appendChild(row); });
    el.querySelector("#memoryForm").onsubmit = event => { event.preventDefault(); memories.push({id:crypto.randomUUID(),text:el.querySelector("#memoryText").value.trim()}); localStorage.setItem(KEYS.memories,JSON.stringify(memories.slice(-30))); renderMemory(el); };
  }

  function renderChats(el) {
    const chats = window.NEXUS_APP?.getChats?.() || []; const active = window.NEXUS_APP?.getActiveChat?.();
    el.innerHTML = `<div class="nexus-status">Active: ${escapeHtml(active?.title || "None")}</div><div class="nexus-row" style="margin-top:12px"><label class="nexus-field"><span>Folder</span><input id="chatFolder" value="${escapeHtml(active?.folder || "General")}"></label><div class="nexus-button-row" style="align-items:end"><button class="nexus-secondary" id="pin">${active?.pinned?"Unpin":"Pin"}</button><button class="nexus-secondary" id="archive">${active?.archived?"Unarchive":"Archive"}</button></div></div><div class="nexus-button-row" style="margin:12px 0"><button class="nexus-primary" id="saveMeta">Save</button><button class="nexus-secondary" id="share">Share link</button><button class="nexus-secondary" id="word">Word</button><button class="nexus-secondary" id="html">HTML</button><button class="nexus-secondary" id="print">Print/PDF</button></div><div class="nexus-section"><div class="nexus-section-title"><h3>Favorites</h3></div><div class="nexus-list" id="favorites"></div></div><div class="nexus-section"><div class="nexus-section-title"><h3>Archived chats</h3></div><div class="nexus-list" id="archived"></div></div>`;
    el.querySelector("#saveMeta").onclick=()=>{window.NEXUS_APP?.updateActiveChat?.({folder:el.querySelector("#chatFolder").value.trim()||"General"});renderChats(el)};
    el.querySelector("#pin").onclick=()=>{window.NEXUS_APP?.updateActiveChat?.({pinned:!active?.pinned});renderChats(el)};
    el.querySelector("#archive").onclick=()=>{window.NEXUS_APP?.updateActiveChat?.({archived:!active?.archived});renderChats(el)};
    el.querySelector("#share").onclick=shareActiveChat; el.querySelector("#word").onclick=exportWord; el.querySelector("#html").onclick=exportHtml; el.querySelector("#print").onclick=printChat;
    const favorites=loadJSON(KEYS.favorites,[]), fav=el.querySelector("#favorites"); if(!favorites.length)fav.innerHTML='<div class="nexus-status">No favorites.</div>'; favorites.forEach(item=>{const row=document.createElement("div");row.className="nexus-list-item";row.innerHTML=`<div class="nexus-favorite">${escapeHtml(item.content)}</div><button class="nexus-danger">Delete</button>`;row.querySelector("button").onclick=()=>{localStorage.setItem(KEYS.favorites,JSON.stringify(favorites.filter(f=>f.id!==item.id)));renderChats(el)};fav.appendChild(row)});
    const archived=chats.filter(c=>c.archived), list=el.querySelector("#archived"); if(!archived.length)list.innerHTML='<div class="nexus-status">No archived chats.</div>'; archived.forEach(chat=>{const row=document.createElement("div");row.className="nexus-list-item";row.innerHTML=`<div><strong>${escapeHtml(chat.title)}</strong><small>${escapeHtml(chat.folder||"General")}</small></div><button class="nexus-secondary">Restore</button>`;row.querySelector("button").onclick=()=>{chat.archived=false;window.NEXUS_APP?.saveChats?.();window.NEXUS_APP?.renderAll?.();renderChats(el)};list.appendChild(row)});
  }

  function renderAccount(el) {
    const user=state.account?.user, configured=state.config.features?.database;
    el.innerHTML=`<div class="nexus-status ${configured?"ok":"warn"}">${configured?(user?`Signed in as ${escapeHtml(user.email)}`:"Cloud accounts are ready."):'D1 binding "DB" is not configured. Guest mode still works.'}</div>${user?`<div class="nexus-card" style="margin-top:12px"><h3>${escapeHtml(user.displayName||user.email)}</h3><p>${escapeHtml(user.email)} · ${escapeHtml(user.plan||"free")} · ${escapeHtml(user.role||"user")}</p><div class="nexus-button-row" style="margin-top:12px"><button class="nexus-primary" id="sync">Sync now</button><button class="nexus-secondary" id="load">Load cloud</button><button class="nexus-danger" id="logout">Sign out</button></div></div>`:`<div class="nexus-row" style="margin-top:12px"><form class="nexus-form nexus-card" id="loginForm"><h3>Sign in</h3><label class="nexus-field"><span>Email</span><input type="email" id="loginEmail" required></label><label class="nexus-field"><span>Password</span><input type="password" id="loginPassword" minlength="8" required></label><button class="nexus-primary">Sign in</button></form><form class="nexus-form nexus-card" id="registerForm"><h3>Create account</h3><label class="nexus-field"><span>Name</span><input id="registerName" required></label><label class="nexus-field"><span>Email</span><input type="email" id="registerEmail" required></label><label class="nexus-field"><span>Password</span><input type="password" id="registerPassword" minlength="8" required></label><button class="nexus-primary">Register</button></form></div>`}<div class="nexus-feature-grid" style="margin-top:16px">${featureCard("D1 chat sync",state.config.features?.database)}${featureCard("R2 storage",state.config.features?.storage)}${featureCard("Turnstile",state.config.features?.turnstile)}</div><div class="nexus-turnstile" id="turnstile"></div>`;
    el.querySelector("#loginForm")?.addEventListener("submit",async event=>{event.preventDefault();await auth("/api/auth/login",{email:el.querySelector("#loginEmail").value,password:el.querySelector("#loginPassword").value,turnstileToken:state.turnstileToken});await loadAccount();renderAccount(el);window.NEXUS_APP?.showToast?.("Welcome! Your name is now shown in the sidebar and greeting.")});
    el.querySelector("#registerForm")?.addEventListener("submit",async event=>{event.preventDefault();await auth("/api/auth/register",{displayName:el.querySelector("#registerName").value,email:el.querySelector("#registerEmail").value,password:el.querySelector("#registerPassword").value,turnstileToken:state.turnstileToken});await loadAccount();renderAccount(el);window.NEXUS_APP?.showToast?.("Welcome! Your name is now shown in the sidebar and greeting.")});
    el.querySelector("#logout")?.addEventListener("click",async()=>{await fetch("/api/auth/logout",{method:"POST"});await loadAccount();renderAccount(el)}); el.querySelector("#sync")?.addEventListener("click",()=>syncToCloud(true)); el.querySelector("#load")?.addEventListener("click",loadFromCloud); setupTurnstile(el.querySelector("#turnstile"));
  }

  function renderPlans(el) {
    const ready=Boolean(state.config.features?.payments);
    const prices=state.config.planPrices||{student:199,developer:499,periodDays:30},period=state.config.paymentProvider==="stripe"?"billing cycle":`${Number(prices.periodDays)||30} days`;
    el.innerHTML=`<div class="nexus-plan-grid"><div class="nexus-card"><span class="nexus-card-icon">○</span><h3>Free</h3><p>Local chat, core AI, files, tools and PWA.</p><h2>₹0</h2></div><div class="nexus-card"><span class="nexus-card-icon">◆</span><h3>Student Pro</h3><p>Higher limits, 500 MB cloud storage and smart models.</p><h2>₹${Number(prices.student)||199} <small>/ ${period}</small></h2><button class="nexus-primary checkout" data-plan="student" style="margin-top:12px" ${ready?"":"disabled"}>Upgrade</button></div><div class="nexus-card"><span class="nexus-card-icon">⚡</span><h3>Developer</h3><p>More AI limits, 1 GB cloud storage and analytics.</p><h2>₹${Number(prices.developer)||499} <small>/ ${period}</small></h2><button class="nexus-primary checkout" data-plan="developer" style="margin-top:12px" ${ready?"":"disabled"}>Upgrade</button></div></div><div class="nexus-status ${ready?"ok":"warn"}" style="margin-top:14px">${ready?`Secure ${escapeHtml(state.config.paymentProvider||"")} checkout is ready.`:"Checkout is disabled until a verified payment provider is configured."}</div>`;
    el.querySelectorAll(".checkout").forEach(button=>button.onclick=()=>startCheckout(button.dataset.plan));
  }

  async function renderAdmin(el) {
    el.innerHTML='<div class="nexus-status">Loading admin statistics…</div>'; const token=sessionStorage.getItem("nexusAdminToken")||""; let response=await fetch("/api/admin",{headers:token?{"X-Admin-Token":token}:{}}); if(response.status===401||response.status===403){const entered=prompt("Enter admin token:");if(!entered){el.innerHTML='<div class="nexus-status warn">Admin access not provided.</div>';return}sessionStorage.setItem("nexusAdminToken",entered);response=await fetch("/api/admin",{headers:{"X-Admin-Token":entered}})} const data=await response.json().catch(()=>({})); if(!response.ok){el.innerHTML=`<div class="nexus-status error">${escapeHtml(data.error||"Admin unavailable")}</div>`;return} el.innerHTML=`<div class="nexus-feature-grid">${metricCard("Users",data.users)}${metricCard("Cloud chats",data.chats)}${metricCard("Files",data.files)}${metricCard("Requests today",data.requestsToday)}${metricCard("Feedback",data.feedback)}${metricCard("Shares",data.shares)}</div><div class="nexus-section" style="margin-top:18px"><div class="nexus-section-title"><h3>Integrations</h3></div><div class="nexus-feature-grid">${Object.entries(state.config.features||{}).map(([k,v])=>featureCard(k,v)).join("")}</div></div>`;
  }

  function renderInstall(el) { el.innerHTML='<div class="nexus-card"><span class="nexus-card-icon">⬇</span><h3>Install MARKZOSUF AI NEXUS</h3><p>Standalone PWA, offline shell, drafts and local history.</p><button class="nexus-primary" id="install" style="margin-top:12px">Install app</button></div><div class="nexus-status" style="margin-top:12px">Android/Chrome: Install app. iPhone: Share → Add to Home Screen. Desktop: use the address-bar install icon.</div>'; el.querySelector("#install").onclick=installApp; }

  async function loadConfig(){try{const r=await fetch("/api/config",{cache:"no-store"});state.config=r.ok?await r.json():{}}catch{state.config={}}}
  async function loadAccount(){
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      state.account = response.ok ? await response.json() : { authenticated: false };
    } catch {
      state.account = { authenticated: false };
    }

    updateSignedInUserUI();
  }

  function updateSignedInUserUI() {
    const user = state.account?.authenticated ? state.account.user : null;
    window.NEXUS_CURRENT_USER = user || null;

    const displayName =
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "MARK ZOSUF";

    const statusText = user
      ? `${user.email} · ${user.plan || "free"}`
      : "Guest · AI & ML Developer";

    const nameElement = document.getElementById("sidebarUserName");
    const statusElement = document.getElementById("sidebarUserStatus");
    const avatar = document.querySelector(".avatar-profile");

    if (nameElement) nameElement.textContent = displayName;
    if (statusElement) statusElement.textContent = statusText;
    if (avatar) avatar.textContent = initials(displayName);

    const hour = new Date().getHours();
    const period =
      hour < 12 ? "Good morning" :
      hour < 17 ? "Good afternoon" :
      "Good evening";

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    const greetingName = user
      ? displayName
      : (isMobile ? "Monu" : "markzosuf");

    const greeting = document.getElementById("adaptiveGreeting");
    if (greeting) {
      greeting.textContent = user
        ? `What can I help with, ${displayName}?`
        : "What can I help with?";
    }

    document.body.classList.toggle("signed-in-user", Boolean(user));
  }

  function initials(name = "") {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || "")
      .join("") || "MZ";
  }
  async function auth(url,body){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Authentication failed");window.NEXUS_APP?.showToast?.(d.message||"Success")}

  async function syncToCloud(show=true){if(!state.account?.authenticated){if(show){openHub("account");window.NEXUS_APP?.showToast?.("Sign in first","error")}return}try{const chats=window.NEXUS_APP?.getChats?.()||[];const r=await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",chats})});const d=await r.json();if(!r.ok)throw new Error(d.error);if(show)window.NEXUS_APP?.showToast?.(`Synced ${d.saved||chats.length} chats`)}catch(e){if(show)window.NEXUS_APP?.showToast?.(e.message,"error")}}
  async function loadFromCloud(){try{const r=await fetch("/api/sync");const d=await r.json();if(!r.ok)throw new Error(d.error);window.NEXUS_APP?.importChats?.(d.chats||[]);window.NEXUS_APP?.showToast?.(`Loaded ${(d.chats||[]).length} chats`)}catch(e){window.NEXUS_APP?.showToast?.(e.message,"error")}}
  async function shareActiveChat(){const chat=window.NEXUS_APP?.getActiveChat?.();if(!chat?.messages?.length){window.NEXUS_APP?.showToast?.("Chat is empty","error");return}try{const r=await fetch("/api/share",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat})});const d=await r.json();if(!r.ok)throw new Error(d.error);await navigator.clipboard.writeText(d.url);window.NEXUS_APP?.showToast?.("Share link copied") }catch(e){window.NEXUS_APP?.showToast?.(e.message,"error")}}
  async function hydrateSharedChat(){const token=new URLSearchParams(location.search).get("share");if(!token)return;try{const r=await fetch(`/api/share?token=${encodeURIComponent(token)}`);const d=await r.json();if(!r.ok)return;const id=`shared-${token}`;window.NEXUS_APP?.importChats?.([{...d.chat,id,title:`[Shared] ${d.chat.title}`,archived:false}]);window.NEXUS_APP?.setActiveChat?.(id)}catch{}}
  function handlePaymentReturn(){const url=new URL(location.href),status=url.searchParams.get("payment");if(!status)return;if(status==="success")window.NEXUS_APP?.showToast?.("Payment received. Your plan will update after secure webhook verification.");else if(status==="cancelled")window.NEXUS_APP?.showToast?.("Checkout was cancelled.","error");url.searchParams.delete("payment");url.searchParams.delete("session_id");history.replaceState({},"",url.pathname+(url.searchParams.size?`?${url.searchParams}`:"")+url.hash)}
  async function startCheckout(plan){
    try {
      if(!state.account?.authenticated) throw new Error("Sign in before upgrading your plan.");
      const r=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan,provider:state.config.paymentProvider||"stripe"})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||"Checkout could not be started.");
      if(d.provider==="stripe"&&d.url){location.href=d.url;return}
      if(d.provider!=="razorpay")throw new Error("Unsupported payment provider response.");
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if(!window.Razorpay)throw new Error("Razorpay Checkout could not be loaded.");
      const checkout=new window.Razorpay({
        key:d.keyId,amount:d.amount,currency:d.currency,order_id:d.orderId,
        name:"MARKZOSUF AI NEXUS",description:`${String(d.plan||plan)} plan · 30 days`,
        prefill:{name:d.customer?.name||"",email:d.customer?.email||""},
        handler:async payment=>{try{
          const verify=await fetch("/api/payment-verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payment)});
          const result=await verify.json().catch(()=>({}));
          if(!verify.ok)throw new Error(result.error||"Payment verification failed.");
          await loadAccount();
          renderPlans(document.getElementById("nexusView"));
          window.NEXUS_APP?.showToast?.(`Payment verified. ${result.plan} plan is active.`);
        }catch(error){window.NEXUS_APP?.showToast?.(error.message||"Payment verification failed.","error")}}
      });
      checkout.on("payment.failed",response=>window.NEXUS_APP?.showToast?.(response.error?.description||"Payment failed.","error"));
      checkout.open();
    }catch(e){window.NEXUS_APP?.showToast?.(e.message||"Checkout failed.","error")}
  }

  function enableWebResearch(){const app=window.NEXUS_APP,s=app?.getState?.();if(s){s.settings.webSearch=true;localStorage.setItem("markzosuf-ai-nexus-settings-v2",JSON.stringify(s.settings));app.showToast?.("Live web research enabled")};app?.setPrompt?.("Research this topic using current web sources and cite numbered references:\n\n");closeHub()}
  function favoriteMessage(message){const list=loadJSON(KEYS.favorites,[]);list.unshift({id:crypto.randomUUID(),content:message.content,createdAt:Date.now()});localStorage.setItem(KEYS.favorites,JSON.stringify(list.slice(0,100)));window.NEXUS_APP?.showToast?.("Added to favorites")}
  function getMemoryText(){return loadJSON(KEYS.memories,[]).map(m=>`- ${m.text}`).join("\n").slice(0,6000)}
  function getActiveBot(){return [...DEFAULT_BOTS,...loadJSON(KEYS.bots,[])].find(b=>b.id===state.activeBotId)||null}
  function getActiveBotInstructions(){return getActiveBot()?.instructions||""}
  function onGenerationComplete(message){if("Notification" in window&&Notification.permission==="granted"&&document.hidden)new Notification("AI NEXUS response ready",{body:String(message?.content||"").replace(/[#*_`]/g,"").slice(0,120),icon:"/assets/logo-icon.png?v=15.1.0"});syncToCloud(false);resetTurnstile();window.NEXUS_AUTH_UI?.resetTurnstile?.()}


  function clearLegacyDraft(){
    try { localStorage.removeItem(KEYS.draft); } catch {}
    const input=document.getElementById("promptInput");
    if(input){ input.value=""; input.dispatchEvent(new Event("input",{bubbles:true})); }
  }

  function bindDraft(){const input=document.getElementById("promptInput");if(!input)return;const draft=localStorage.getItem(KEYS.draft);if(draft&&!input.value){input.value=draft;input.dispatchEvent(new Event("input"))}input.addEventListener("input",debounce(()=>{if(input.value)localStorage.setItem(KEYS.draft,input.value);else localStorage.removeItem(KEYS.draft)},250))}
  function setupInstallPrompt(){window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();state.installPrompt=event})}
  async function installApp(){if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null}else window.NEXUS_APP?.showToast?.("Use browser menu → Install app / Add to Home Screen")}
  async function setupTurnstile(container){if(!container||!state.config.turnstileSiteKey)return;try{await loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");state.turnstileWidget=turnstile.render(container,{sitekey:state.config.turnstileSiteKey,theme:document.body.dataset.theme==="dark"?"dark":"light",callback:t=>state.turnstileToken=t,"expired-callback":()=>state.turnstileToken="","error-callback":()=>state.turnstileToken=""})}catch{}}
  function resetTurnstile(){try{if(state.turnstileWidget!==null)window.turnstile?.reset(state.turnstileWidget);else window.turnstile?.reset()}catch{}state.turnstileToken=""}

  async function renderLocalFiles(container){const files=await idbList();container.innerHTML=files.length?"":'<div class="nexus-status">No local files.</div>';files.forEach(file=>{const row=document.createElement("div");row.className="nexus-list-item";row.innerHTML=`<div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)} · local</small></div><div class="nexus-button-row"><button class="nexus-primary use">Use</button><button class="nexus-danger del">Delete</button></div>`;row.querySelector(".use").onclick=()=>{window.NEXUS_APP?.setPrompt?.(`Use this file:\n\n--- ${file.name} ---\n${(file.text||"").slice(0,65000)}`);closeHub()};row.querySelector(".del").onclick=async()=>{await idbDelete(file.id);renderLocalFiles(container)};container.appendChild(row)})}
  async function saveLocalFile(file){const text=/^(text\/)|\.(md|json|csv|js|ts|py|java|c|cpp|html|css|sql)$/i.test(file.type)||/\.(md|json|csv|js|ts|py|java|c|cpp|html|css|sql)$/i.test(file.name)?(await file.text()).slice(0,100000):"";await idbPut({id:crypto.randomUUID(),name:file.name,type:file.type,size:file.size,text,createdAt:Date.now()})}
  async function uploadCloudFile(file){const form=new FormData();form.append("file",file);const r=await fetch("/api/files",{method:"POST",body:form});const d=await r.json();if(!r.ok)throw new Error(d.error);window.NEXUS_APP?.showToast?.("Cloud file uploaded")}
  async function loadCloudFiles(container){try{const r=await fetch("/api/files");const d=await r.json();if(!r.ok)throw new Error(d.error);container.innerHTML=d.files?.length?"":'<div class="nexus-status">No cloud files.</div>';d.files?.forEach(file=>{const row=document.createElement("div");row.className="nexus-list-item";row.innerHTML=`<div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)} · R2</small></div><div class="nexus-button-row"><a class="nexus-secondary" href="/api/files?id=${encodeURIComponent(file.id)}">Download</a><button class="nexus-danger">Delete</button></div>`;row.querySelector("button").onclick=async()=>{await fetch(`/api/files?id=${encodeURIComponent(file.id)}`,{method:"DELETE"});loadCloudFiles(container)};container.appendChild(row)})}catch(e){container.innerHTML=`<div class="nexus-status warn">${escapeHtml(e.message||"Cloud storage not configured")}</div>`}}

  function exportWord(){const chat=window.NEXUS_APP?.getActiveChat?.();if(chat)downloadText(`${slugify(chat.title)}.doc`,`<html><body>${chatHtml(chat)}</body></html>`,`application/msword`)}
  function exportHtml(){const chat=window.NEXUS_APP?.getActiveChat?.();if(chat)downloadText(`${slugify(chat.title)}.html`,`<!doctype html><meta charset="utf-8"><body>${chatHtml(chat)}</body>`,`text/html`)}
  function printChat(){const chat=window.NEXUS_APP?.getActiveChat?.();if(!chat)return;const w=open("","_blank");w.document.write(`<title>${escapeHtml(chat.title)}</title><style>body{font:16px system-ui;max-width:850px;margin:40px auto}pre{white-space:pre-wrap;background:#eee;padding:12px}</style>${chatHtml(chat)}`);w.document.close();w.print()}
  function chatHtml(chat){return `<h1>${escapeHtml(chat.title)}</h1>`+chat.messages.map(m=>`<h3>${m.role==="user"?"You":"AI NEXUS"}</h3><pre>${escapeHtml(m.content||"")}</pre>`).join("")}
  function triggerFile(accept){const input=document.getElementById("fileInput");if(input){input.accept=accept;input.click()}closeHub()}

  function featureSummary(){const enabled=Object.values(state.config.features||{}).filter(Boolean).length;return `${enabled} server integrations detected · local workspace ready`}
  function featureCard(name,enabled){return `<div class="nexus-card"><strong>${escapeHtml(name)}</strong><p>${enabled?"Configured and ready":"Optional setup required"}</p></div>`}
  function metricCard(name,value){return `<div class="nexus-card"><strong>${Number(value||0).toLocaleString()}</strong><p>${escapeHtml(name)}</p></div>`}
  function loadScript(src){return new Promise((resolve,reject)=>{if([...document.scripts].some(s=>s.src===src))return resolve();const script=document.createElement("script");script.src=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script)})}
  function imageFromFile(file){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=URL.createObjectURL(file)})}
  function downloadDataUrl(name,url){const a=document.createElement("a");a.download=name;a.href=url;a.click()}
  function downloadText(name,text,type="text/plain"){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
  function formatBytes(bytes=0){if(!bytes)return"0 B";const units=["B","KB","MB","GB"],i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),3);return`${(bytes/1024**i).toFixed(i?1:0)} ${units[i]}`}
  function slugify(text=""){return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"nexus-chat"}
  function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c])}
  function loadJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
  function debounce(fn,wait){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)}}

  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open("nexus-v8-files",1);req.onupgradeneeded=()=>req.result.createObjectStore("files",{keyPath:"id"});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function idbPut(value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  async function idbList(){const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction("files").objectStore("files").getAll();req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.createdAt-a.createdAt));req.onerror=()=>reject(req.error)})}
  async function idbDelete(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction("files","readwrite");tx.objectStore("files").delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
})();
