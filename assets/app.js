(() => {
  "use strict";

  const STORAGE_KEYS = {
    chats: "markzosuf-ai-nexus-chats-v2",
    settings: "markzosuf-ai-nexus-settings-v2",
    theme: "markzosuf-ai-nexus-theme-v2"
  };

  const TOOLS = [
    {
      id: "ask-anything",
      icon: "💬",
      name: "Ask Anything",
      description: "General questions, ideas, explanations, and everyday help.",
      starter: "Explain something interesting in simple Hinglish."
    },
    {
      id: "deep-reasoning",
      icon: "🧠",
      name: "Deep Reasoning",
      description: "Break down complex problems step by step.",
      starter: "Analyze this problem carefully and explain the reasoning:"
    },
    {
      id: "code-explainer",
      icon: "⌘",
      name: "Code Explainer",
      description: "Understand code, logic, inputs, outputs, and complexity.",
      starter: "Explain this code in simple Hinglish:\n\n"
    },
    {
      id: "bug-finder",
      icon: "🐞",
      name: "Bug Finder",
      description: "Find errors, explain causes, and provide corrected code.",
      starter: "Find and fix every bug in this code:\n\n"
    },
    {
      id: "project-builder",
      icon: "🚀",
      name: "Project Builder",
      description: "Create a complete project plan, features, stack, and steps.",
      starter: "Create a complete project plan for:"
    },
    {
      id: "study-tutor",
      icon: "📚",
      name: "Study Tutor",
      description: "Learn concepts with examples, notes, and revision points.",
      starter: "Teach me this topic from zero:"
    },
    {
      id: "quiz-maker",
      icon: "❓",
      name: "Quiz Maker",
      description: "Generate practice questions with a separate answer key.",
      starter: "Create a quiz on:"
    },
    {
      id: "summarizer",
      icon: "📝",
      name: "Smart Summarizer",
      description: "Turn long text or uploaded documents into clear notes.",
      starter: "Summarize the following content:\n\n"
    },
    {
      id: "image-analysis",
      icon: "🖼️",
      name: "Image Analysis",
      description: "Describe, inspect, and answer questions about an image.",
      starter: "Analyze the attached image and explain what is important."
    },
    {
      id: "resume-helper",
      icon: "📄",
      name: "Resume Helper",
      description: "Improve resume wording without inventing achievements.",
      starter: "Improve this resume content:\n\n"
    },
    {
      id: "email-writer",
      icon: "✉️",
      name: "Email Writer",
      description: "Write clear professional or casual emails.",
      starter: "Write an email for this purpose:"
    },
    {
      id: "translator",
      icon: "🌐",
      name: "Translator",
      description: "Translate while preserving meaning and tone.",
      starter: "Translate this into English and Hindi:\n\n"
    },
    {
      id: "grammar-fixer",
      icon: "✅",
      name: "Grammar Fixer",
      description: "Correct grammar, spelling, and clarity.",
      starter: "Correct and improve this text:\n\n"
    },
    {
      id: "sql-generator",
      icon: "🗃️",
      name: "SQL Generator",
      description: "Generate and explain safe SQL queries.",
      starter: "Create an SQL query for:"
    },
    {
      id: "regex-helper",
      icon: "⌁",
      name: "Regex Helper",
      description: "Create or explain regular expressions with examples.",
      starter: "Create a regular expression that:"
    },
    {
      id: "roadmap-builder",
      icon: "🗺️",
      name: "Roadmap Builder",
      description: "Build a learning or development roadmap with milestones.",
      starter: "Create a step-by-step roadmap for:"
    },
    {
      id: "interview-prep",
      icon: "🎯",
      name: "Interview Prep",
      description: "Practice interview questions and strong model answers.",
      starter: "Prepare me for an interview on:"
    },
    {
      id: "caption-generator",
      icon: "✨",
      name: "Caption Generator",
      description: "Create social media captions in different styles.",
      starter: "Create 10 captions for:"
    },
    {
      id: "idea-improver",
      icon: "⚡",
      name: "Idea Improver",
      description: "Turn a rough idea into a stronger, practical concept.",
      starter: "Improve this idea and add useful features:"
    },
    {
      id: "study-planner",
      icon: "📅",
      name: "Study Planner",
      description: "Create a realistic timetable and practice plan.",
      starter: "Create a study plan for:"
    }
  ];

  const SUGGESTIONS = [
    {
      icon: "▧",
      title: "Create an image",
      text: "Open the AI image studio.",
      action: "image",
      tool: "ask-anything",
      prompt: ""
    },
    {
      icon: "✎",
      title: "Write or edit",
      text: "Draft, rewrite, or improve text.",
      action: "write",
      tool: "grammar-fixer",
      prompt: "Write or improve the following text while preserving my meaning:\n\n"
    },
    {
      icon: "◎",
      title: "Look something up",
      text: "Research current information with sources.",
      action: "research",
      tool: "ask-anything",
      prompt: "Research this topic using current web sources and cite numbered references:\n\n"
    },
    {
      icon: "◫",
      title: "Analyze a file",
      text: "Upload an image, PDF, text, or code file.",
      action: "file",
      tool: "summarizer",
      prompt: "Analyze the attached file and explain the important points."
    }
  ];

  const DEFAULT_SETTINGS = {
    language: "auto",
    temperature: 0.65,
    maxTokens: 1600,
    autoTitle: true,
    useHistory: true,
    provider: "auto",
    webSearch: false,
    memoryEnabled: true,
    customInstructions: ""
  };

  const state = {
    chats: loadJSON(STORAGE_KEYS.chats, []),
    settings: { ...DEFAULT_SETTINGS, ...loadJSON(STORAGE_KEYS.settings, {}) },
    activeChatId: null,
    selectedToolId: "ask-anything",
    attachment: null,
    controller: null,
    isGenerating: false,
    speechRecognition: null,
    speechActive: false
  };

  const elements = {};

  // V9.1: reset the old GitHub provider selection so Cloudflare Auto can work.
  if (state.settings.provider === "github") {
    state.settings.provider = "auto";
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    setupResponsiveViewport();
    setupAdaptiveLayout();
    configureMarked();
    loadTheme();
    renderSuggestions();
    renderToolGrid();
    bindEvents();

    // V18: Always start with a clean conversation after a reload.
    // Previous chats remain available in the sidebar history.
    createChat(false);

    syncSettingsUI();
    renderAll();
    setupSpeechRecognition();
    setupPWA();
  }


  function setupResponsiveViewport() {
    const updateViewport = () => {
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height || window.innerHeight);
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(updateViewport, 120), { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewport, { passive: true });
      window.visualViewport.addEventListener("scroll", updateViewport, { passive: true });
    }
  }


  function setupAdaptiveLayout() {
    const media = window.matchMedia("(max-width: 860px)");

    const applyLayout = () => {
      const isMobile = media.matches;
      document.body.classList.toggle("layout-mobile", isMobile);
      document.body.classList.toggle("layout-desktop", !isMobile);

      const hour = new Date().getHours();
      const period =
        hour < 12 ? "Good morning" :
        hour < 17 ? "Good afternoon" :
        "Good evening";

      if (elements.adaptiveGreeting) {
        const signedInName =
          window.NEXUS_CURRENT_USER?.displayName ||
          window.NEXUS_CURRENT_USER?.email?.split("@")[0] ||
          "";

        elements.adaptiveGreeting.textContent = signedInName
          ? `What can I help with, ${signedInName}?`
          : "What can I help with?";
      }

      if (elements.adaptiveSubtitle) {
        elements.adaptiveSubtitle.textContent = isMobile
          ? ""
          : "How can AI NEXUS help you today?";
      }

      if (elements.adaptiveEyebrow) {
        elements.adaptiveEyebrow.textContent = isMobile
          ? "AI NEXUS"
          : "MARKZOSUF AI NEXUS";
      }

      if (elements.promptInput && !elements.promptInput.value) {
        elements.promptInput.placeholder = isMobile
          ? "Ask AI NEXUS"
          : "How can I help you today?";
      }
    };

    applyLayout();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", applyLayout);
    } else {
      media.addListener(applyLayout);
    }

    window.addEventListener("orientationchange", () => setTimeout(applyLayout, 140));
  }

  function cacheElements() {
    [
      "sidebar", "openSidebarButton", "closeSidebarButton", "newChatButton", "adaptiveGreeting", "adaptiveSubtitle", "adaptiveEyebrow",
      "chatSearchInput", "chatHistory", "clearAllButton", "aboutButton",
      "commandButton", "settingsButton", "chatTitleInput", "statusText",
      "modelStatus", "modelSelect", "exportChatButton", "themeButton",
      "workspacePanelButton", "workspacePanel", "closeWorkspacePanelButton",
      "messages", "welcomeScreen", "suggestionGrid", "scrollBottomButton",
      "attachmentTray", "fileInput", "toolsButton", "composerForm", "promptInput", "voiceButton",
      "sendButton", "sendIcon", "toolLabel", "tokenEstimate", "activeToolIcon",
      "activeToolName", "activeToolDescription", "statMessages", "statWords",
      "statFiles", "statChats", "knowledgeList", "regenerateLastButton",
      "downloadLastButton", "readLastButton", "toolsModal", "toolSearchInput",
      "toolGrid", "settingsModal", "languageSelect", "providerSelect", "webSearchToggle", "memoryToggle", "temperatureValue",
      "temperatureInput", "maxTokensSelect", "autoTitleToggle", "historyToggle",
      "customInstructionsInput", "resetSettingsButton", "saveSettingsButton",
      "aboutModal", "commandModal", "commandSearchInput", "commandResults",
      "toastContainer", "messageTemplate"
    ].forEach(id => {
      elements[id] = document.getElementById(id);
    });
  }

  function configureMarked() {
    if (window.marked) {
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
      });
    }
  }

  function bindEvents() {
    elements.newChatButton.addEventListener("click", () => createChat(true));
    elements.openSidebarButton.addEventListener("click", () => elements.sidebar.classList.add("open"));
    elements.closeSidebarButton.addEventListener("click", () => elements.sidebar.classList.remove("open"));

    elements.chatSearchInput.addEventListener("input", renderHistory);
    elements.clearAllButton.addEventListener("click", clearAllChats);
    elements.aboutButton?.addEventListener("click", () => {
      if (window.NEXUS_AUTH_UI?.open) window.NEXUS_AUTH_UI.open("account");
      else openModal("aboutModal");
    });
    elements.settingsButton?.addEventListener("click", () => openModal("settingsModal"));
    elements.commandButton?.addEventListener("click", openCommandPalette);

    elements.chatTitleInput.addEventListener("change", updateActiveChatTitle);
    elements.modelSelect.addEventListener("change", () => {
      const chat = getActiveChat();
      if (chat) {
        chat.modelMode = elements.modelSelect.value;
        saveChats();
      }
      updateModelStatus();
    });

    elements.exportChatButton.addEventListener("click", exportActiveChat);
    elements.themeButton.addEventListener("click", toggleTheme);
    elements.workspacePanelButton?.addEventListener("click", toggleWorkspacePanel);
    elements.closeWorkspacePanelButton?.addEventListener("click", toggleWorkspacePanel);

    elements.messages.addEventListener("scroll", handleMessageScroll);
    elements.scrollBottomButton.addEventListener("click", scrollToBottom);

    elements.fileInput.addEventListener("change", event => handleFile(event.target.files[0]));
    elements.toolsButton.addEventListener("click", () => openModal("toolsModal"));
    elements.toolSearchInput.addEventListener("input", renderToolGrid);
    elements.voiceButton.addEventListener("click", toggleVoiceInput);
    elements.composerForm?.addEventListener("submit", event => {
      event.preventDefault();
      if (state.isGenerating) stopGeneration();
      else sendMessage();
    });

    elements.promptInput.addEventListener("input", () => {
      autoResizePrompt();
      updateTokenEstimate();
      elements.sendButton.classList.toggle("has-text", Boolean(elements.promptInput.value.trim()));
    });

    elements.promptInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!state.isGenerating) {
          if (elements.composerForm?.requestSubmit) elements.composerForm.requestSubmit();
          else sendMessage();
        }
      }
    });

    elements.temperatureInput.addEventListener("input", () => {
      elements.temperatureValue.textContent = Number(elements.temperatureInput.value).toFixed(2);
    });

    elements.resetSettingsButton.addEventListener("click", resetSettings);
    elements.saveSettingsButton.addEventListener("click", saveSettingsFromUI);

    elements.regenerateLastButton.addEventListener("click", regenerateLastAnswer);
    elements.downloadLastButton.addEventListener("click", downloadLastAnswer);
    elements.readLastButton.addEventListener("click", readLastAnswer);

    document.querySelectorAll("[data-close-modal]").forEach(button => {
      button.addEventListener("click", () => closeModal(button.dataset.closeModal));
    });

    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) closeModal(backdrop.id);
      });
    });

    elements.commandSearchInput.addEventListener("input", renderCommandResults);

    document.addEventListener("keydown", handleGlobalShortcuts);
    document.addEventListener("dragover", event => { if ([...(event.dataTransfer?.types || [])].includes("Files")) { event.preventDefault(); document.body.classList.add("file-drag-active"); } });
    document.addEventListener("dragleave", event => { if (!event.relatedTarget) document.body.classList.remove("file-drag-active"); });
    document.addEventListener("drop", event => { const file=event.dataTransfer?.files?.[0]; if(!file)return; event.preventDefault(); document.body.classList.remove("file-drag-active"); handleFile(file); });
    document.getElementById("collapseSidebarButton")?.addEventListener("click", () => { document.body.classList.toggle("sidebar-collapsed"); localStorage.setItem("nexus-sidebar-collapsed", String(document.body.classList.contains("sidebar-collapsed"))); });
    if (localStorage.getItem("nexus-sidebar-collapsed") === "true") document.body.classList.add("sidebar-collapsed");

    document.querySelectorAll("[data-sidebar-action]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.sidebarAction;

        if (action === "search") {
          elements.chatSearchInput.focus();
          elements.chatSearchInput.select();
          return;
        }

        if (["projects", "library", "documents", "tasks", "integrations", "voice"].includes(action)) {
          window.NEXUS_PRO?.open?.(action);
          return;
        }
        if (action === "image") {
          window.NEXUS_PRO?.open?.("images");
          return;
        }
        window.NEXUS_PRO?.open?.("dashboard");
      });
    });

    document.querySelectorAll("[data-workspace-mode]").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-workspace-mode]").forEach(item => {
          item.classList.toggle("active", item === button);
        });

        if (button.dataset.workspaceMode === "work") {
          window.NEXUS_PRO?.open?.("projects");
        }
      });
    });
  }

  function handleGlobalShortcuts(event) {
    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
    }

    if (mod && event.key.toLowerCase() === "n") {
      event.preventDefault();
      createChat(true);
    }

    if (event.key === "Escape") {
      closeAllModals();
      elements.sidebar.classList.remove("open");
      if (state.isGenerating) stopGeneration();
    }
  }

  function createChat(focusInput = true) {
    const chat = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      title: "New conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      toolId: state.selectedToolId,
      modelMode: "auto",
      folder: "General",
      projectId: window.NEXUS_PRO?.getActiveProjectId?.() || "",
      pinned: false,
      archived: false,
      messages: []
    };

    state.chats.unshift(chat);
    state.activeChatId = chat.id;
    saveChats();
    renderAll();

    if (focusInput) {
      elements.sidebar.classList.remove("open");
      elements.promptInput.focus();
    }

    return chat;
  }

  function getActiveChat() {
    return state.chats.find(chat => chat.id === state.activeChatId) || null;
  }

  function setActiveChat(chatId) {
    const chat = state.chats.find(item => item.id === chatId);
    if (!chat) return;

    state.activeChatId = chat.id;
    state.selectedToolId = chat.toolId || "ask-anything";
    elements.sidebar.classList.remove("open");
    renderAll();
  }

  function deleteChat(chatId) {
    state.chats = state.chats.filter(chat => chat.id !== chatId);

    if (state.activeChatId === chatId) {
      state.activeChatId = state.chats[0]?.id || null;
    }

    if (!state.chats.length) createChat(false);
    saveChats();
    renderAll();
  }

  function clearAllChats() {
    if (!confirm("Delete all local conversations?")) return;
    state.chats = [];
    state.activeChatId = null;
    createChat(false);
    showToast("All conversations cleared.");
  }

  function updateActiveChatTitle() {
    const chat = getActiveChat();
    if (!chat) return;

    const title = elements.chatTitleInput.value.trim().slice(0, 70) || "New conversation";
    chat.title = title;
    chat.updatedAt = Date.now();
    saveChats();
    renderHistory();
  }

  function saveChats() {
    const compact = state.chats.slice(0, 40).map((chat, chatIndex) => ({
      ...chat,
      messages: (chat.messages || []).slice(-120).map(message => ({
        ...message,
        content: String(message.content || "").slice(0, 120000),
        attachment: message.attachment
          ? { ...message.attachment, dataUrl: chatIndex === 0 ? message.attachment.dataUrl || null : null }
          : null
      }))
    }));

    try {
      localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(compact));
    } catch {
      try {
        const emergency = compact.slice(0, 12).map(chat => ({
          ...chat,
          messages: chat.messages.slice(-50).map(message => ({
            ...message,
            attachment: message.attachment ? { ...message.attachment, dataUrl: null } : null
          }))
        }));
        localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(emergency));
        showToast("Storage was optimized so chats could continue saving.", "info");
      } catch {
        showToast("Browser storage is full. Export or clear older chats.", "error");
      }
    }
  }

  function renderAll() {
    const chat = getActiveChat();
    if (!chat) return;

    state.selectedToolId = chat.toolId || state.selectedToolId;
    elements.chatTitleInput.value = chat.title;
    elements.modelSelect.value = chat.modelMode || "auto";

    renderHistory();
    renderMessages();
    renderAttachment();
    updateToolUI();
    updateStats();
    updateModelStatus();
  }

  function renderHistory() {
    const query = elements.chatSearchInput.value.trim().toLowerCase();
    const filtered = state.chats
      .filter(chat => !chat.archived)
      .filter(chat => {
        const haystack = `${chat.title} ${chat.folder || ""} ${chat.messages.map(message => message.content).join(" ")}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) =>
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
      );

    elements.chatHistory.innerHTML = "";

    if (!filtered.length) {
      elements.chatHistory.innerHTML = `
        <div class="empty-history">
          ${query ? "No conversation matches your search." : "Your conversations will appear here."}
        </div>
      `;
      return;
    }

    const pinnedChats = filtered.filter(chat => chat.pinned);
    const regularChats = filtered.filter(chat => !chat.pinned);
    const groups = {
      ...(pinnedChats.length ? { Pinned: pinnedChats } : {}),
      ...groupChatsByDate(regularChats)
    };

    Object.entries(groups).forEach(([label, chats]) => {
      const groupLabel = document.createElement("div");
      groupLabel.className = "history-group-label";
      groupLabel.textContent = label;
      elements.chatHistory.appendChild(groupLabel);

      chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = `history-item ${chat.id === state.activeChatId ? "active" : ""}`;
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.innerHTML = `
          <span class="history-icon">${chat.pinned ? "📌" : getTool(chat.toolId).icon}</span>
          <span class="history-title" title="${escapeHtml(chat.folder || "General")}">${escapeHtml(chat.title)}</span>
          <button class="history-delete" type="button" aria-label="Delete chat" title="Delete">✕</button>
        `;

        const openChat = event => {
          if (event.target.closest(".history-delete")) return;
          setActiveChat(chat.id);
        };

        item.addEventListener("click", openChat);
        item.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openChat(event);
          }
        });

        item.querySelector(".history-delete").addEventListener("click", event => {
          event.stopPropagation();
          deleteChat(chat.id);
        });

        elements.chatHistory.appendChild(item);
      });
    });
  }

  function groupChatsByDate(chats) {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    const startWeek = startToday - 7 * 86400000;

    const grouped = chats.reduce((groups, chat) => {
      const time = chat.updatedAt || chat.createdAt;
      let label = "Older";

      if (time >= startToday) label = "Today";
      else if (time >= startYesterday) label = "Yesterday";
      else if (time >= startWeek) label = "Previous 7 days";

      (groups[label] ||= []).push(chat);
      return groups;
    }, {});

    const ordered = {};
    ["Today", "Yesterday", "Previous 7 days", "Older"].forEach(label => {
      if (grouped[label]?.length) ordered[label] = grouped[label];
    });
    return ordered;
  }

  function renderSuggestions() {
    elements.suggestionGrid.innerHTML = "";

    SUGGESTIONS.forEach(item => {
      const button = document.createElement("button");
      button.className = "suggestion-card";
      button.innerHTML = `
        <span class="suggestion-icon">${item.icon}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.text)}</span>
      `;

      button.addEventListener("click", () => {
        if (item.action === "image") {
          window.NEXUS_ADVANCED?.open?.("image");
          return;
        }

        if (item.action === "file") {
          elements.fileInput.click();
          return;
        }

        if (item.action === "research") {
          state.settings.webSearch = true;
          localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
        }

        selectTool(item.tool);
        elements.promptInput.value = item.prompt;
        autoResizePrompt();
        updateTokenEstimate();
        elements.promptInput.focus();
      });

      elements.suggestionGrid.appendChild(button);
    });
  }

  function renderToolGrid() {
    const query = elements.toolSearchInput.value.trim().toLowerCase();
    elements.toolGrid.innerHTML = "";

    TOOLS
      .filter(tool => `${tool.name} ${tool.description}`.toLowerCase().includes(query))
      .forEach(tool => {
        const button = document.createElement("button");
        button.className = `tool-card ${tool.id === state.selectedToolId ? "active" : ""}`;
        button.innerHTML = `
          <span class="tool-icon">${tool.icon}</span>
          <strong>${escapeHtml(tool.name)}</strong>
          <small>${escapeHtml(tool.description)}</small>
        `;

        button.addEventListener("click", () => {
          selectTool(tool.id);
          closeModal("toolsModal");
          elements.promptInput.focus();
        });

        elements.toolGrid.appendChild(button);
      });
  }

  function selectTool(toolId) {
    const tool = getTool(toolId);
    state.selectedToolId = tool.id;

    const chat = getActiveChat();
    if (chat) {
      chat.toolId = tool.id;
      chat.updatedAt = Date.now();
      saveChats();
    }

    updateToolUI();
    renderToolGrid();
  }

  function updateToolUI() {
    const tool = getTool(state.selectedToolId);
    elements.toolLabel.textContent = tool.name;
    elements.activeToolIcon.textContent = tool.icon;
    elements.activeToolName.textContent = tool.name;
    elements.activeToolDescription.textContent = tool.description;

    const isMobileLayout = document.body.classList.contains("layout-mobile");

    elements.promptInput.placeholder =
      tool.id === "image-analysis"
        ? "Attach an image and ask a question…"
        : isMobileLayout
          ? "Ask AI NEXUS"
          : `${tool.name}: type your message…`;
  }

  function getTool(toolId) {
    return TOOLS.find(tool => tool.id === toolId) || TOOLS[0];
  }

  function renderMessages() {
    const chat = getActiveChat();
    const isEmpty = !chat || !chat.messages.length;
    document.body.classList.toggle("empty-chat", isEmpty);
    elements.messages.innerHTML = "";

    if (isEmpty) {
      elements.messages.appendChild(elements.welcomeScreen);
      elements.welcomeScreen.hidden = false;
      return;
    }

    chat.messages.forEach((message, index) => {
      const node = createMessageNode(message, index);
      elements.messages.appendChild(node);
    });

    requestAnimationFrame(scrollToBottom);
  }

  function createMessageNode(message, index) {
    const fragment = elements.messageTemplate.content.cloneNode(true);
    const article = fragment.querySelector(".message");
    article.dataset.index = index;
    article.classList.add(message.role === "user" ? "user" : "assistant");

    const avatar = fragment.querySelector(".message-avatar");
    avatar.textContent = message.role === "user" ? "YOU" : "AI";

    fragment.querySelector(".message-author").textContent =
      message.role === "user" ? "You" : "AI NEXUS";

    fragment.querySelector(".message-time").textContent = formatTime(message.createdAt);

    const attachmentContainer = fragment.querySelector(".message-attachment");
    renderMessageAttachment(attachmentContainer, message.attachment);

    const content = fragment.querySelector(".message-content");

    if (message.pending) {
      content.innerHTML = `<span class="typing-indicator"><span></span><span></span><span></span></span>`;
    } else {
      renderMarkdown(content, message.content || "");
    }

    const actions = fragment.querySelector(".message-actions");
    renderMessageActions(actions, message, index);

    return fragment;
  }

  function renderMessageAttachment(container, attachment) {
    if (!attachment) return;

    container.classList.add("show");

    if (attachment.kind === "image" && attachment.dataUrl) {
      const image = document.createElement("img");
      image.className = "message-image";
      image.src = attachment.dataUrl;
      image.alt = attachment.name || "Uploaded image";
      container.appendChild(image);
    } else {
      container.innerHTML = `
        <span class="file-chip">
          <span>📄</span>
          <span>${escapeHtml(attachment.name || "Attached file")}</span>
        </span>
      `;
    }
  }

  function renderMessageActions(container, message, index) {
    if (message.pending) return;

    if (message.role === "assistant") {
      addAction(container, "Copy", () => copyText(message.content));
      addAction(container, "Read", () => speakText(message.content));
      addAction(container, "Download", () => downloadText(`ai-answer-${Date.now()}.md`, message.content));
      addAction(container, "👍", () => window.NEXUS_PRO?.rateMessage?.(message, 1));
      addAction(container, "👎", () => window.NEXUS_PRO?.rateMessage?.(message, -1));
      addAction(container, "Favorite", () => window.NEXUS_ADVANCED?.favoriteMessage?.(message));
      addAction(container, "Branch", () => window.NEXUS_PRO?.branchFromMessage?.(index));
      addAction(container, "Compare", () => window.NEXUS_PRO?.addToCompare?.(message));
      addAction(container, "Report", () => window.NEXUS_PRO?.reportMessage?.(message));
      addAction(container, "Regenerate", () => regenerateAt(index));
    } else {
      addAction(container, "Copy", () => copyText(message.content));
      addAction(container, "Edit", () => editUserMessage(index));
    }
  }

  function addAction(container, label, handler) {
    const button = document.createElement("button");
    button.className = "message-action";
    button.textContent = label;
    button.addEventListener("click", handler);
    container.appendChild(button);
  }

  function renderMarkdown(container, text) {
    let html;

    if (window.marked) {
      html = marked.parse(text);
    } else {
      html = escapeHtml(text).replace(/\n/g, "<br>");
    }

    container.innerHTML = window.DOMPurify
      ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
      : escapeHtml(text).replace(/\n/g, "<br>");

    decorateCodeBlocks(container);
  }

  function decorateCodeBlocks(container) {
    container.querySelectorAll("pre").forEach(pre => {
      const code = pre.querySelector("code");
      if (!code) return;

      if (window.hljs) {
        try {
          hljs.highlightElement(code);
        } catch {}
      }

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      const languageClass = [...code.classList].find(name => name.startsWith("language-"));
      wrapper.dataset.language = languageClass ? languageClass.slice(9) : "code";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      if (code.textContent.length > 1500) {
        wrapper.classList.add("is-collapsed");
        const expandButton = document.createElement("button");
        expandButton.type = "button";
        expandButton.className = "code-expand-button";
        expandButton.textContent = "Expand";
        expandButton.addEventListener("click", () => {
          const expanded = wrapper.classList.toggle("is-expanded");
          wrapper.classList.toggle("is-collapsed", !expanded);
          expandButton.textContent = expanded ? "Collapse" : "Expand";
        });
        wrapper.appendChild(expandButton);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy-button";
      button.textContent = "Copy code";
      button.addEventListener("click", async () => {
        await copyText(code.textContent);
        const original = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = original; }, 1200);
      });
      wrapper.appendChild(button);
    });
  }

  async function sendMessage(options = {}) {
    if (state.isGenerating) return;

    const chat = getActiveChat() || createChat(false);
    const inputText = (options.text ?? elements.promptInput.value).trim();
    const attachment = options.attachment ?? state.attachment;

    if (!inputText && !attachment) {
      showToast("Type a message or attach a file.", "error");
      return;
    }

    if (state.selectedToolId === "image-analysis" && attachment?.kind !== "image") {
      showToast("Image Analysis needs an image attachment.", "error");
      return;
    }

    const userContent = inputText || `Please analyze the attached ${attachment?.name || "file"}.`;

    const userMessage = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-u`,
      role: "user",
      content: userContent,
      createdAt: Date.now(),
      attachment: attachment
        ? {
            name: attachment.name,
            kind: attachment.kind,
            dataUrl: attachment.kind === "image" ? attachment.dataUrl : null
          }
        : null
    };

    if (options.replaceFromIndex !== undefined) {
      chat.messages = chat.messages.slice(0, options.replaceFromIndex);
    }

    chat.messages.push(userMessage);

    const assistantMessage = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-a`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      pending: true,
      model: null
    };

    chat.messages.push(assistantMessage);
    chat.toolId = state.selectedToolId;
    chat.updatedAt = Date.now();

    if (
      state.settings.autoTitle &&
      (chat.title === "New conversation" || chat.messages.filter(message => message.role === "user").length === 1)
    ) {
      chat.title = createTitle(userContent);
    }

    saveChats();

    elements.promptInput.value = "";
    elements.sendButton.classList.remove("has-text");
    clearAttachment();
    autoResizePrompt();
    updateTokenEstimate();
    setGenerating(true);
    renderAll();

    const assistantIndex = chat.messages.length - 1;

    try {
      state.controller = new AbortController();

      const payload = buildPayload(chat, userContent, attachment);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: state.controller.signal
      });

      const contentType = response.headers.get("content-type") || "";
      const model = response.headers.get("x-ai-model") || "AI";

      if (!response.ok) {
        const errorText = await readErrorResponse(response);
        throw new Error(errorText || `Server error ${response.status}`);
      }

      assistantMessage.pending = false;
      assistantMessage.model = model;

      if (contentType.includes("text/event-stream")) {
        await consumeSSE(response, token => {
          assistantMessage.content += token;
          updateStreamingMessage(assistantIndex, assistantMessage);
        });
      } else {
        const data = await response.json();
        assistantMessage.content = data.result || data.answer || data.response || "No response generated.";
        assistantMessage.model = data.model || model;
      }

      if (!assistantMessage.content.trim()) {
        assistantMessage.content = "The AI completed the request but returned no text.";
      }

      chat.updatedAt = Date.now();
      saveChats();
    } catch (error) {
      assistantMessage.pending = false;

      if (error.name === "AbortError") {
        assistantMessage.content ||= "Generation stopped.";
      } else {
        const message = String(error.message || "The request failed.");
        const hint =
          /429|too many|rate limit/i.test(message)
            ? "Please wait a minute, then try again."
            : /401|sign in/i.test(message)
              ? "Continue as guest or log in, then retry."
              : /5035|paid plan/i.test(message)
                ? "Remove paid-only CF_MODEL overrides and use the default Cloudflare model."
                : /binding|provider|workers ai/i.test(message)
                  ? 'Check that the Cloudflare binding is named **AI** and provider is **Nexus Auto**.'
                  : "Check your connection and retry in a new conversation.";

        assistantMessage.content = `**Request failed:** ${message}

${hint}`;
        showToast(message, "error");
      }

      saveChats();
    } finally {
      state.controller = null;
      setGenerating(false);
      renderAll();
      window.NEXUS_ADVANCED?.onGenerationComplete?.(assistantMessage, chat);
    }
  }

  function buildPayload(chat, inputText, attachment) {
    const recentMessages = state.settings.useHistory
      ? chat.messages
          .filter(message => !message.pending)
          .slice(-14, -1)
          .map(message => ({
            role: message.role,
            content: message.content.slice(0, 14000)
          }))
      : [];

    let finalInput = inputText;

    if (attachment?.kind === "text" && attachment.text) {
      finalInput += `\n\n--- Attached file: ${attachment.name} ---\n${attachment.text}`;
    }

    const v10 = window.NEXUS_V10?.getOptions?.(chat) || {};

    return {
      tool: state.selectedToolId,
      input: finalInput,
      history: recentMessages,
      image: attachment?.kind === "image" ? attachment.dataUrl : null,
      modelMode: chat.modelMode || "auto",
      language: state.settings.language,
      temperature: state.settings.temperature,
      maxTokens: state.settings.maxTokens,
      provider: state.settings.provider || "auto",
      webSearch: Boolean(state.settings.webSearch),
      liveTools: window.NEXUS_REALTIME?.isEnabled?.() !== false,
      memory: state.settings.memoryEnabled ? (window.NEXUS_ADVANCED?.getMemoryText?.() || "") : "",
      customBot: window.NEXUS_ADVANCED?.getActiveBotInstructions?.() || "",
      projectContext: window.NEXUS_PRO?.getProjectContext?.(chat.projectId) || "",
      documentContext: window.NEXUS_PRO?.getDocumentContext?.() || "",
      turnstileToken: window.NEXUS_AUTH_UI?.getTurnstileToken?.() || window.NEXUS_ADVANCED?.getTurnstileToken?.() || "",
      customInstructions: state.settings.customInstructions,
      ...v10
    };
  }

  async function consumeSSE(response, onToken) {
    if (!response.body) throw new Error("Streaming response is unavailable.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processLine = line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) return;
      const payloadText = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
      if (!payloadText || payloadText === "[DONE]") return;

      try {
        const parsed = JSON.parse(payloadText);
        const token = extractStreamText(parsed);
        if (token) onToken(token);
      } catch {
        if (!trimmed.startsWith("event:") && !trimmed.startsWith("id:")) onToken(payloadText);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      lines.forEach(processLine);
      if (done) break;
    }

    buffer += decoder.decode();
    if (buffer.trim()) processLine(buffer);
  }

  function extractStreamText(payload) {
    if (typeof payload === "string") return payload;

    return (
      payload.response ||
      payload.text ||
      payload.delta ||
      payload.token ||
      payload.answer ||
      payload.choices?.[0]?.delta?.content ||
      payload.choices?.[0]?.text ||
      ""
    );
  }

  function updateStreamingMessage(index, message) {
    const article = elements.messages.querySelector(`[data-index="${index}"]`);
    if (!article) {
      renderMessages();
      return;
    }

    const content = article.querySelector(".message-content");
    renderMarkdown(content, message.content);
    scrollToBottom();
  }

  function stopGeneration() {
    state.controller?.abort();
  }

  function setGenerating(value) {
    state.isGenerating = value;
    elements.sendButton.classList.toggle("stop", value);
    elements.sendIcon.textContent = value ? "■" : "➤";
    elements.statusText.textContent = value ? "Generating…" : "Ready";
    elements.voiceButton.disabled = value;
  }

  async function readErrorResponse(response) {
    const text = await response.text();

    try {
      const data = JSON.parse(text);
      return data.error || data.result || data.message || text;
    } catch {
      return text;
    }
  }

  function regenerateLastAnswer() {
    const chat = getActiveChat();
    if (!chat) return;

    const lastAssistantIndex = findLastIndex(chat.messages, message => message.role === "assistant");
    if (lastAssistantIndex < 1) {
      showToast("No answer to regenerate.", "error");
      return;
    }

    regenerateAt(lastAssistantIndex);
  }

  function regenerateAt(assistantIndex) {
    const chat = getActiveChat();
    if (!chat || state.isGenerating) return;

    const userIndex = findLastIndex(
      chat.messages.slice(0, assistantIndex),
      message => message.role === "user"
    );

    if (userIndex < 0) return;

    const userMessage = chat.messages[userIndex];
    const attachment = recoverAttachment(userMessage.attachment);

    state.selectedToolId = chat.toolId || "ask-anything";

    sendMessage({
      text: userMessage.content,
      attachment,
      replaceFromIndex: userIndex
    });
  }

  function editUserMessage(index) {
    const chat = getActiveChat();
    const message = chat?.messages[index];
    if (!message || message.role !== "user" || state.isGenerating) return;

    elements.promptInput.value = message.content;
    autoResizePrompt();
    updateTokenEstimate();

    if (message.attachment) {
      state.attachment = recoverAttachment(message.attachment);
      renderAttachment();
    }

    chat.messages = chat.messages.slice(0, index);
    saveChats();
    renderMessages();
    elements.promptInput.focus();
  }

  function recoverAttachment(attachment) {
    if (!attachment) return null;

    return {
      name: attachment.name,
      kind: attachment.kind,
      dataUrl: attachment.dataUrl || null,
      text: "",
      size: 0
    };
  }

  async function handleFile(file) {
    if (!file) return;

    const maxSize = file.type.startsWith("image/") ? 5 * 1024 * 1024 : 8 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast(`File is too large. Maximum ${Math.round(maxSize / 1024 / 1024)} MB.`, "error");
      elements.fileInput.value = "";
      return;
    }

    try {
      elements.statusText.textContent = "Reading file…";

      if (file.type.startsWith("image/")) {
        const dataUrl = await fileToDataURL(file);
        state.attachment = {
          name: file.name,
          kind: "image",
          dataUrl,
          text: "",
          size: file.size
        };
        selectTool("image-analysis");
      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await extractPDFText(file);
        state.attachment = {
          name: file.name,
          kind: "text",
          dataUrl: null,
          text: text.slice(0, 70000),
          size: file.size
        };
      } else {
        const text = await file.text();
        state.attachment = {
          name: file.name,
          kind: "text",
          dataUrl: null,
          text: text.slice(0, 70000),
          size: file.size
        };
      }

      renderAttachment();
      updateStats();
      window.NEXUS_PRO?.ingestFile?.(file, state.attachment);
      elements.promptInput.focus();
      showToast(`${file.name} attached.`);
    } catch (error) {
      showToast(`Could not read file: ${error.message}`, "error");
    } finally {
      elements.statusText.textContent = "Ready";
      elements.fileInput.value = "";
    }
  }

  async function extractPDFText(file) {
    const pdfjs = window.pdfjsLib || await import("/assets/vendor/pdf-4.10.38.min.mjs?v=15.1.0");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "/assets/vendor/pdf-worker-4.10.38.min.mjs?v=15.1.0";

    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageCount = Math.min(pdf.numPages, 60);
    const chunks = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(" ");
      chunks.push(`\n[Page ${pageNumber}]\n${text}`);
    }

    if (pdf.numPages > pageCount) {
      chunks.push(`\n[Only the first ${pageCount} pages were read.]`);
    }

    return chunks.join("\n");
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("File read failed."));
      reader.readAsDataURL(file);
    });
  }

  function clearAttachment() {
    state.attachment = null;
    elements.attachmentTray.innerHTML = "";
    updateStats();
  }

  function renderAttachment() {
    elements.attachmentTray.innerHTML = "";

    if (!state.attachment) return;

    const card = document.createElement("div");
    card.className = "attachment-card";

    let preview;

    if (state.attachment.kind === "image") {
      preview = document.createElement("img");
      preview.className = "attachment-thumbnail";
      preview.src = state.attachment.dataUrl;
      preview.alt = "";
    } else {
      preview = document.createElement("div");
      preview.className = "attachment-thumbnail";
      preview.textContent = "📄";
    }

    const info = document.createElement("div");
    info.className = "attachment-info";
    info.innerHTML = `
      <strong>${escapeHtml(state.attachment.name)}</strong>
      <span>${formatBytes(state.attachment.size)} · ${state.attachment.kind === "image" ? "Image" : "Document"}</span>
    `;

    const remove = document.createElement("button");
    remove.className = "attachment-remove";
    remove.textContent = "✕";
    remove.title = "Remove attachment";
    remove.addEventListener("click", clearAttachment);

    card.append(preview, info, remove);
    elements.attachmentTray.appendChild(card);
  }

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      elements.voiceButton.title = "Voice input is not supported in this browser.";
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      state.speechActive = true;
      elements.voiceButton.textContent = "●";
      elements.statusText.textContent = "Listening…";
    };

    recognition.onresult = event => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript;
      }

      elements.promptInput.value = transcript;
      autoResizePrompt();
      updateTokenEstimate();
    };

    recognition.onerror = event => {
      showToast(`Voice input: ${event.error}`, "error");
    };

    recognition.onend = () => {
      state.speechActive = false;
      elements.voiceButton.textContent = "🎙";
      elements.statusText.textContent = "Ready";
    };

    state.speechRecognition = recognition;
  }

  function toggleVoiceInput() {
    if (!state.speechRecognition) {
      showToast("Voice input works best in Chrome or Edge.", "error");
      return;
    }

    if (state.speechActive) {
      state.speechRecognition.stop();
    } else {
      try {
        state.speechRecognition.start();
      } catch {}
    }
  }

  function speakText(text) {
    if (!("speechSynthesis" in window)) {
      showToast("Text-to-speech is not supported in this browser.", "error");
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
    utterance.lang = state.settings.language === "hindi" ? "hi-IN" : "en-IN";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
  }

  function readLastAnswer() {
    const chat = getActiveChat();
    const message = [...(chat?.messages || [])].reverse().find(item => item.role === "assistant" && !item.pending);

    if (!message) {
      showToast("No answer to read.", "error");
      return;
    }

    speakText(message.content);
  }

  function downloadLastAnswer() {
    const chat = getActiveChat();
    const message = [...(chat?.messages || [])].reverse().find(item => item.role === "assistant" && !item.pending);

    if (!message) {
      showToast("No answer to download.", "error");
      return;
    }

    downloadText(`markzosuf-ai-answer-${Date.now()}.md`, message.content);
  }

  function exportActiveChat() {
    const chat = getActiveChat();

    if (!chat || !chat.messages.length) {
      showToast("This conversation is empty.", "error");
      return;
    }

    const content = [
      `# ${chat.title}`,
      "",
      `Exported from MARKZOSUF AI NEXUS`,
      "",
      ...chat.messages.map(message => [
        `## ${message.role === "user" ? "You" : "AI NEXUS"}`,
        "",
        message.content,
        ""
      ].join("\n"))
    ].join("\n");

    downloadText(`${slugify(chat.title)}.md`, content);
  }

  function updateStats() {
    const chat = getActiveChat();
    const messages = chat?.messages || [];
    const words = messages.reduce((total, message) => total + countWords(message.content), 0);
    const files = messages.filter(message => message.attachment).length + (state.attachment ? 1 : 0);

    elements.statMessages.textContent = messages.length;
    elements.statWords.textContent = words;
    elements.statFiles.textContent = files;
    elements.statChats.textContent = state.chats.length;

    elements.knowledgeList.innerHTML = "";

    if (state.attachment) {
      const item = document.createElement("div");
      item.className = "knowledge-item";
      item.textContent = `${state.attachment.kind === "image" ? "🖼️" : "📄"} ${state.attachment.name}`;
      elements.knowledgeList.appendChild(item);
    } else {
      elements.knowledgeList.innerHTML = `<p class="muted">No file is attached.</p>`;
    }
  }

  function updateModelStatus() {
    const mode = elements.modelSelect.value;
    const labels = {
      auto: "Auto routing",
      fast: "Fast model",
      smart: "Advanced reasoning",
      coding: "Coding specialist"
    };

    elements.modelStatus.textContent = labels[mode] || "Auto routing";
  }

  function toggleWorkspacePanel() {
    document.querySelector(".app-shell").classList.toggle("panel-open");
  }

  function handleMessageScroll() {
    const element = elements.messages;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    elements.scrollBottomButton.classList.toggle("show", distance > 260);
  }

  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function autoResizePrompt() {
    elements.promptInput.style.height = "auto";
    elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 180)}px`;
  }

  function updateTokenEstimate() {
    const text = elements.promptInput.value;
    const fileText = state.attachment?.text || "";
    const estimate = Math.max(0, Math.ceil((text.length + fileText.length) / 4));
    elements.tokenEstimate.textContent = `${estimate.toLocaleString()} estimated tokens`;
  }

  function syncSettingsUI() {
    elements.languageSelect.value = state.settings.language;
    elements.temperatureInput.value = state.settings.temperature;
    elements.temperatureValue.textContent = Number(state.settings.temperature).toFixed(2);
    elements.maxTokensSelect.value = String(state.settings.maxTokens);
    if (elements.providerSelect) elements.providerSelect.value = state.settings.provider || "auto";
    if (elements.webSearchToggle) elements.webSearchToggle.checked = Boolean(state.settings.webSearch);
    if (elements.memoryToggle) elements.memoryToggle.checked = state.settings.memoryEnabled !== false;
    elements.autoTitleToggle.checked = state.settings.autoTitle;
    elements.historyToggle.checked = state.settings.useHistory;
    elements.customInstructionsInput.value = state.settings.customInstructions;
  }

  function saveSettingsFromUI() {
    state.settings = {
      language: elements.languageSelect.value,
      temperature: Number(elements.temperatureInput.value),
      maxTokens: Number(elements.maxTokensSelect.value),
      provider: elements.providerSelect?.value || "auto",
      webSearch: Boolean(elements.webSearchToggle?.checked),
      memoryEnabled: elements.memoryToggle?.checked !== false,
      autoTitle: elements.autoTitleToggle.checked,
      useHistory: elements.historyToggle.checked,
      customInstructions: elements.customInstructionsInput.value.trim().slice(0, 2000)
    };

    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    closeModal("settingsModal");
    showToast("Settings saved.");
  }

  function resetSettings() {
    state.settings = { ...DEFAULT_SETTINGS };
    syncSettingsUI();
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    showToast("Settings reset.");
  }

  function loadTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    const theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.body.dataset.theme = theme;
    updateThemeButton();
  }

  function toggleTheme() {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    localStorage.setItem(STORAGE_KEYS.theme, next);
    updateThemeButton();
  }

  function updateThemeButton() {
    elements.themeButton.textContent = document.body.dataset.theme === "dark" ? "☾" : "☀";
  }

  function openModal(id) {
    const modal = elements[id];
    if (!modal) return;

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    if (id === "toolsModal") {
      elements.toolSearchInput.value = "";
      renderToolGrid();
      setTimeout(() => elements.toolSearchInput.focus(), 20);
    }

    if (id === "settingsModal") syncSettingsUI();
  }

  function closeModal(id) {
    const modal = elements[id];
    if (!modal) return;

    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(modal => {
      modal.hidden = true;
    });
    document.body.style.overflow = "";
  }

  function openCommandPalette() {
    openModal("commandModal");
    elements.commandSearchInput.value = "";
    renderCommandResults();
    setTimeout(() => elements.commandSearchInput.focus(), 20);
  }

  function renderCommandResults() {
    const query = elements.commandSearchInput.value.trim().toLowerCase();

    const commands = [
      {
        icon: "＋",
        title: "New conversation",
        description: "Start a fresh chat",
        action: () => createChat(true)
      },
      {
        icon: "✦",
        title: "Open AI toolkit",
        description: "Choose a specialist tool",
        action: () => openModal("toolsModal")
      },
      {
        icon: "◫",
        title: "Toggle workspace panel",
        description: "Show session stats and controls",
        action: toggleWorkspacePanel
      },
      {
        icon: "☾",
        title: "Toggle theme",
        description: "Switch between dark and light",
        action: toggleTheme
      },
      {
        icon: "⚙",
        title: "Open settings",
        description: "Change language, creativity, and instructions",
        action: () => openModal("settingsModal")
      },
      {
        icon: "⇩",
        title: "Export conversation",
        description: "Download the active chat as Markdown",
        action: exportActiveChat
      },
      {
        icon: "MZ",
        title: "About MARK ZOSUF",
        description: "Open creator profile and social links",
        action: () => openModal("aboutModal")
      }
    ];

    const results = commands.filter(command =>
      `${command.title} ${command.description}`.toLowerCase().includes(query)
    );

    elements.commandResults.innerHTML = "";

    results.forEach(command => {
      const button = document.createElement("button");
      button.className = "command-item";
      button.innerHTML = `
        <span>${command.icon}</span>
        <div>
          <strong>${escapeHtml(command.title)}</strong>
          <small>${escapeHtml(command.description)}</small>
        </div>
        <span>›</span>
      `;

      button.addEventListener("click", () => {
        closeAllModals();
        command.action();
      });

      elements.commandResults.appendChild(button);
    });
  }

  function setupPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3400);
  }

  function copyText(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast("Copied to clipboard."))
      .catch(() => showToast("Could not copy text.", "error"));
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function createTitle(text) {
    const cleaned = stripMarkdown(text)
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.slice(0, 52) || "New conversation";
  }

  function stripMarkdown(text = "") {
    return text
      .replace(/```[\s\S]*?```/g, " code block ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[#>*_[\]()~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function formatTime(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(timestamp || Date.now()));
  }

  function formatBytes(bytes = 0) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function countWords(text = "") {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "ai-conversation";
  }

  function loadJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function findLastIndex(array, predicate) {
    for (let index = array.length - 1; index >= 0; index--) {
      if (predicate(array[index], index)) return index;
    }
    return -1;
  }

  function duplicateActiveChat() {
    const chat=getActiveChat(); if(!chat)return null;
    const copy={...structuredClone(chat),id:crypto.randomUUID(),title:`${chat.title} (copy)`,createdAt:Date.now(),updatedAt:Date.now()};
    state.chats.unshift(copy); state.activeChatId=copy.id; saveChats(); renderAll(); return copy;
  }
  function forkChatAt(index) {
    const chat=getActiveChat(); if(!chat)return null;
    const branch={...structuredClone(chat),id:crypto.randomUUID(),title:`${chat.title} — branch`,messages:chat.messages.slice(0,index+1),createdAt:Date.now(),updatedAt:Date.now()};
    state.chats.unshift(branch); state.activeChatId=branch.id; saveChats(); renderAll(); return branch;
  }

  window.NEXUS_APP = {
    getState: () => state,
    getChats: () => state.chats,
    getActiveChat,
    createChat,
    setActiveChat,
    saveChats,
    renderAll,
    renderHistory,
    showToast,
    selectTool,
    handleFile,
    sendCurrent: sendMessage,
    stopGeneration,
    duplicateActiveChat,
    forkChatAt,
    setPrompt(text) {
      elements.promptInput.value = String(text || "");
      autoResizePrompt();
      updateTokenEstimate();
      elements.promptInput.focus();
    },
    updateActiveChat(patch = {}) {
      const chat = getActiveChat();
      if (!chat) return null;
      Object.assign(chat, patch, { updatedAt: Date.now() });
      saveChats();
      renderAll();
      return chat;
    },
    importChats(chats) {
      if (!Array.isArray(chats)) return;
      const byId = new Map(state.chats.map(chat => [chat.id, chat]));
      chats.forEach(chat => { if (chat?.id) byId.set(chat.id, { ...byId.get(chat.id), ...chat }); });
      state.chats = [...byId.values()].sort((a,b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      if (!state.activeChatId && state.chats[0]) state.activeChatId = state.chats[0].id;
      saveChats();
      renderAll();
    },
    exportMarkdown: exportActiveChat,
    getElements: () => elements
  };
})();
