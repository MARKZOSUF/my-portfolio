(() => {
  "use strict";

  const VIEWS = [
    ["dashboard", "◆", "Features 4–15"],
    ["mobile", "📱", "Native Apps"],
    ["offline", "◉", "Offline AI"],
    ["teams", "👥", "Team Accounts"],
    ["collaboration", "⌁", "Collaboration"],
    ["community", "💬", "User Chat"],
    ["monetization", "₹", "Ads & Sponsors"],
    ["developer", "</>", "Developer API"],
    ["finetune", "🧠", "Fine-tuning"],
    ["vault", "🔐", "E2EE Vault"],
    ["backup", "☁", "Cloud Backup"],
    ["whatsapp", "WA", "WhatsApp"],
    ["upi", "UPI", "UPI Payment"]
  ];

  const state = {
    view: "dashboard",
    config: {},
    account: null,
    data: {
      organizations: [],
      rooms: [],
      channels: [],
      apiKeys: [],
      fineTuneJobs: [],
      backups: [],
      vaults: []
    },
    roomId: "",
    channelId: "",
    roomSince: 0,
    channelSince: 0,
    pollTimer: null,
    installPrompt: null,
    offlineSession: null
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    captureInstallPrompt();
    createSuite();
    bindEntryPoints();
    await Promise.allSettled([loadConfig(), loadAccount()]);
    if (state.account) {
      await refreshData();
      autoBackup().catch(() => {});
    }
    const openParam = new URLSearchParams(location.search).get("open");
    if (openParam === "plus") open("dashboard");
    window.NEXUS_PLUS = {
      open,
      close,
      refresh: refreshData,
      encryptJSON,
      decryptJSON
    };
  }

  function createSuite() {
    const backdrop = document.createElement("div");
    backdrop.id = "plusBackdrop";
    backdrop.className = "plus-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = `
      <section class="plus-shell" role="dialog" aria-modal="true" aria-labelledby="plusTitle">
        <nav class="plus-nav" id="plusNav" aria-label="V9.3 Plus features">
          <div class="plus-brand">
            <img src="/assets/logo-icon.png?v=9.3-plus" alt="">
            <div><strong>NEXUS PLUS</strong><small>Features 4–15</small></div>
          </div>
          ${VIEWS.map(([id, icon, label]) => `
            <button type="button" data-plus-view="${id}" title="${escapeHtml(label)}">
              <span>${icon}</span><span>${escapeHtml(label)}</span>
            </button>
          `).join("")}
        </nav>
        <main class="plus-main">
          <header class="plus-header">
            <div>
              <h2 id="plusTitle">V9.3 Plus</h2>
              <p id="plusSubtitle">Expanded platform features</p>
            </div>
            <button class="plus-close" id="plusClose" type="button" aria-label="Close">✕</button>
          </header>
          <section class="plus-view" id="plusView"></section>
        </main>
      </section>`;
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) close();
    });
    document.body.appendChild(backdrop);
    document.getElementById("plusClose").addEventListener("click", close);
    document.getElementById("plusNav").addEventListener("click", event => {
      const button = event.target.closest("[data-plus-view]");
      if (button) render(button.dataset.plusView);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !backdrop.hidden) close();
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        open("dashboard");
      }
    });
  }

  function bindEntryPoints() {
    document.querySelectorAll('[data-sidebar-action="enterprise"]').forEach(button => {
      button.addEventListener("click", event => {
        event.stopImmediatePropagation();
        open("dashboard");
      });
    });
  }

  function open(view = "dashboard") {
    const backdrop = document.getElementById("plusBackdrop");
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    render(view);
  }

  function close() {
    document.getElementById("plusBackdrop").hidden = true;
    document.body.style.overflow = "";
    stopPolling();
  }

  function render(view) {
    state.view = view;
    stopPolling();
    const titles = {
      dashboard: ["Features 4–15", "Native wrappers, offline tools, teams, monetization, developer and payment systems"],
      mobile: ["Native Android & iOS", "Installable PWA plus Capacitor project scaffold"],
      offline: ["Offline AI Assistant", "Browser on-device model when available, with a local fallback engine"],
      teams: ["Team Accounts", "Organizations, invitations and owner/admin/editor/viewer roles"],
      collaboration: ["Live Collaboration", "Shared rooms with three-second event polling"],
      community: ["User-to-user Chat", "Organization channels with optional client-side encryption"],
      monetization: ["Ads, Affiliates & Sponsors", "Configuration-aware monetization slots and click tracking"],
      developer: ["Developer API", "Create revocable API keys with daily quotas"],
      finetune: ["Custom Model Jobs", "Prepare datasets and submit to an external fine-tuning provider"],
      vault: ["End-to-end Encrypted Vault", "AES-GCM encryption happens in this browser before upload"],
      backup: ["Automatic Cloud Backup", "Daily and manual backups with restore controls"],
      whatsapp: ["WhatsApp Integration", "Direct share links and optional WhatsApp Cloud API"],
      upi: ["UPI Payment Page", "UPI intent, QR payment link and initiation records"]
    };
    const [title, subtitle] = titles[view] || titles.dashboard;
    document.getElementById("plusTitle").textContent = title;
    document.getElementById("plusSubtitle").textContent = subtitle;
    document.querySelectorAll("[data-plus-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.plusView === view);
    });

    const viewElement = document.getElementById("plusView");
    const renderer = {
      dashboard,
      mobile: mobileView,
      offline: offlineView,
      teams: teamsView,
      collaboration: collaborationView,
      community: communityView,
      monetization: monetizationView,
      developer: developerView,
      finetune: fineTuneView,
      vault: vaultView,
      backup: backupView,
      whatsapp: whatsappView,
      upi: upiView
    }[view] || dashboard;
    renderer(viewElement);
  }

  function dashboard(element) {
    const cards = VIEWS.slice(1).map(([id, icon, label], index) => ({
      id, icon, label, number: index + 4
    }));
    element.innerHTML = `
      <div class="plus-status ${state.account ? "ok" : "warn"}">
        ${state.account
          ? `Signed in as ${escapeHtml(state.account.displayName || state.account.email)}. Cloud features are ready.`
          : `Guest mode: Native wrapper, offline assistant, WhatsApp share and UPI tools work. Sign in for teams, API keys, encrypted cloud vaults and backups.`}
      </div>
      <div class="plus-grid" id="plusDashboardGrid" style="margin-top:12px"></div>`;
    const grid = document.getElementById("plusDashboardGrid");
    for (const card of cards) {
      const button = document.createElement("button");
      button.className = "plus-card";
      button.innerHTML = `
        <span class="plus-icon">${card.icon}</span>
        <h3>${card.number}. ${escapeHtml(card.label)}</h3>
        <p>Open and configure this V9.3 Plus feature.</p>`;
      button.addEventListener("click", () => render(card.id));
      grid.appendChild(button);
    }
  }

  function mobileView(element) {
    element.innerHTML = `
      <div class="plus-grid two">
        <div class="plus-card plus-stack">
          <span class="plus-icon">📲</span>
          <h3>Install as PWA</h3>
          <p>Installs the current website from the browser. It uses the same Cloudflare backend.</p>
          <button class="plus-primary" id="installPwaButton">Install app</button>
          <div class="plus-status" id="installPwaStatus">Checking browser installation support…</div>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">🤖</span>
          <h3>Android native wrapper</h3>
          <p>The ZIP includes Capacitor configuration. Build the APK/AAB using Android Studio.</p>
          <div class="plus-code">npm install
npm run mobile:add:android
npm run mobile:sync
npm run mobile:open:android</div>
          <button class="plus-secondary" data-copy-text="npm install&#10;npm run mobile:add:android&#10;npm run mobile:sync&#10;npm run mobile:open:android">Copy Android commands</button>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">🍎</span>
          <h3>iOS native wrapper</h3>
          <p>iOS compilation requires macOS, Xcode and an Apple developer signing setup.</p>
          <div class="plus-code">npm install
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:open:ios</div>
          <button class="plus-secondary" data-copy-text="npm install&#10;npm run mobile:add:ios&#10;npm run mobile:sync&#10;npm run mobile:open:ios">Copy iOS commands</button>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">🧩</span>
          <h3>Included mobile files</h3>
          <p><code>capacitor.config.json</code>, <code>package.json</code>, <code>dist/index.html</code> and <code>mobile-app/README.md</code>.</p>
        </div>
      </div>`;
    const status = document.getElementById("installPwaStatus");
    const button = document.getElementById("installPwaButton");
    status.textContent = state.installPrompt
      ? "Browser install prompt is ready."
      : "Use the browser menu → Add to Home screen when the automatic prompt is unavailable.";
    button.disabled = !state.installPrompt;
    button.addEventListener("click", installPwa);
    bindCopyButtons(element);
  }

  function offlineView(element) {
    element.innerHTML = `
      <div class="plus-row">
        <div class="plus-card plus-stack">
          <h3>Offline prompt</h3>
          <label class="plus-field"><span>Ask the local assistant</span>
            <textarea id="offlinePrompt" rows="10" placeholder="Paste notes to summarize, ask for keywords, or request a simple explanation."></textarea>
          </label>
          <div class="plus-buttons">
            <button class="plus-primary" id="runOfflineButton">Run offline</button>
            <button class="plus-secondary" id="offlineExampleButton">Use example</button>
          </div>
          <div class="plus-status" id="offlineStatus">Detecting an on-device browser model…</div>
        </div>
        <div class="plus-card plus-stack">
          <h3>Local result</h3>
          <div class="plus-output" id="offlineOutput">No prompt has been processed.</div>
          <p>When a browser-provided on-device language model is unavailable, the built-in fallback performs local summaries, keyword extraction and structured notes without sending text to a server.</p>
        </div>
      </div>`;
    const supported = Boolean(globalThis.LanguageModel?.create || globalThis.ai?.languageModel?.create);
    document.getElementById("offlineStatus").textContent = supported
      ? "On-device browser language model detected."
      : "Using the built-in local fallback engine.";
    document.getElementById("offlineExampleButton").addEventListener("click", () => {
      document.getElementById("offlinePrompt").value =
        "Summarize: Artificial intelligence helps computers identify patterns, generate content and support decisions. Responsible AI needs privacy, transparency and human review.";
    });
    document.getElementById("runOfflineButton").addEventListener("click", runOffline);
  }

  function teamsView(element) {
    if (!requireAccount(element)) return;
    const organizations = state.data.organizations;
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="createOrgForm">
          <h3>Create organization</h3>
          <label class="plus-field"><span>Name</span><input name="name" maxlength="80" required placeholder="My AI Team"></label>
          <button class="plus-primary">Create team</button>
        </form>
        <form class="plus-card plus-stack" id="acceptInviteForm">
          <h3>Accept invitation</h3>
          <label class="plus-field"><span>Invite token</span><input name="token" required placeholder="Paste token"></label>
          <button class="plus-secondary">Join team</button>
        </form>
      </div>
      <div class="plus-section" style="margin-top:18px">
        <div class="plus-section-head"><h3>Your organizations</h3><button class="plus-secondary" id="refreshTeams">Refresh</button></div>
        <div class="plus-list" id="orgList">
          ${organizations.length ? organizations.map(org => `
            <div class="plus-list-item">
              <div><strong>${escapeHtml(org.name)}</strong><small>${escapeHtml(org.slug)} · ${escapeHtml(org.role)}</small></div>
              <button class="plus-secondary" data-invite-org="${org.id}">Invite</button>
            </div>`).join("") : `<div class="plus-status">No team created yet.</div>`}
        </div>
      </div>
      <dialog id="inviteDialog" class="modal">
        <form method="dialog" class="modal-card plus-stack" id="inviteMemberForm">
          <h3>Invite team member</h3>
          <input type="hidden" name="orgId">
          <label class="plus-field"><span>Email</span><input name="email" type="email" required></label>
          <label class="plus-field"><span>Role</span>
            <select name="role"><option>viewer</option><option>editor</option><option>admin</option></select>
          </label>
          <div class="plus-buttons"><button class="plus-primary" value="send">Create invite</button><button class="plus-secondary" value="cancel">Cancel</button></div>
          <div id="inviteResult"></div>
        </form>
      </dialog>`;
    document.getElementById("createOrgForm").addEventListener("submit", createOrg);
    document.getElementById("acceptInviteForm").addEventListener("submit", acceptInvite);
    document.getElementById("refreshTeams").addEventListener("click", async () => {
      await refreshData();
      render("teams");
    });
    element.querySelectorAll("[data-invite-org]").forEach(button => {
      button.addEventListener("click", () => {
        const dialog = document.getElementById("inviteDialog");
        dialog.querySelector('[name="orgId"]').value = button.dataset.inviteOrg;
        dialog.showModal();
      });
    });
    document.getElementById("inviteMemberForm").addEventListener("submit", inviteMember);
  }

  function collaborationView(element) {
    if (!requireAccount(element)) return;
    const orgOptions = organizationOptions();
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="createRoomForm">
          <h3>Create shared room</h3>
          <label class="plus-field"><span>Organization</span><select name="orgId" required>${orgOptions}</select></label>
          <label class="plus-field"><span>Room name</span><input name="name" required placeholder="Website planning"></label>
          <button class="plus-primary">Create room</button>
        </form>
        <div class="plus-card plus-stack">
          <h3>Open room</h3>
          <label class="plus-field"><span>Room</span><select id="roomSelect">${roomOptions()}</select></label>
          <div class="plus-status">Events refresh every three seconds while this screen is open.</div>
        </div>
      </div>
      <div class="plus-section" style="margin-top:16px">
        <div class="plus-chat-feed" id="roomFeed"><div class="plus-status">Choose a room.</div></div>
        <form class="plus-stack" id="roomEventForm" style="margin-top:9px">
          <label class="plus-field"><span>Shared note/update</span><textarea name="text" rows="3" required placeholder="Add a team update…"></textarea></label>
          <button class="plus-primary">Post update</button>
        </form>
      </div>`;
    document.getElementById("createRoomForm").addEventListener("submit", createRoom);
    const select = document.getElementById("roomSelect");
    select.value = state.roomId || select.value;
    state.roomId = select.value;
    select.addEventListener("change", () => {
      state.roomId = select.value;
      state.roomSince = 0;
      document.getElementById("roomFeed").innerHTML = "";
      pollRoom();
    });
    document.getElementById("roomEventForm").addEventListener("submit", postRoomEvent);
    pollRoom();
    state.pollTimer = setInterval(pollRoom, 3000);
  }

  function communityView(element) {
    if (!requireAccount(element)) return;
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="createChannelForm">
          <h3>Create chat channel</h3>
          <label class="plus-field"><span>Organization</span><select name="orgId" required>${organizationOptions()}</select></label>
          <label class="plus-field"><span>Channel</span><input name="name" required placeholder="developers"></label>
          <button class="plus-primary">Create channel</button>
        </form>
        <div class="plus-card plus-stack">
          <h3>Channel</h3>
          <label class="plus-field"><span>Open channel</span><select id="channelSelect">${channelOptions()}</select></label>
          <label class="plus-field"><span>Optional encryption passphrase</span><input id="channelPassphrase" type="password" autocomplete="new-password"></label>
          <label><input id="encryptChannelMessage" type="checkbox"> Encrypt messages in this browser before upload</label>
        </div>
      </div>
      <div class="plus-section" style="margin-top:16px">
        <div class="plus-chat-feed" id="channelFeed"><div class="plus-status">Choose a channel.</div></div>
        <form class="plus-stack" id="channelMessageForm" style="margin-top:9px">
          <label class="plus-field"><span>Message</span><textarea name="message" rows="3" required placeholder="Write a message…"></textarea></label>
          <button class="plus-primary">Send message</button>
        </form>
      </div>`;
    document.getElementById("createChannelForm").addEventListener("submit", createChannel);
    const select = document.getElementById("channelSelect");
    select.value = state.channelId || select.value;
    state.channelId = select.value;
    select.addEventListener("change", () => {
      state.channelId = select.value;
      state.channelSince = 0;
      document.getElementById("channelFeed").innerHTML = "";
      pollChannel();
    });
    document.getElementById("channelMessageForm").addEventListener("submit", sendChannelMessage);
    pollChannel();
    state.pollTimer = setInterval(pollChannel, 3000);
  }

  function monetizationView(element) {
    const monetization = state.config.monetization || {};
    element.innerHTML = `
      <div class="plus-grid two">
        <div class="plus-card plus-stack">
          <span class="plus-icon">▦</span>
          <h3>Google AdSense slot</h3>
          <div class="plus-status ${monetization.adsenseConfigured ? "ok" : "warn"}">
            ${monetization.adsenseConfigured
              ? "AdSense public client and slot are configured."
              : "Add ADSENSE_CLIENT and ADSENSE_SLOT in Cloudflare variables."}
          </div>
          <div id="plusAdPreview" class="plus-ad-preview">Ad preview area</div>
          <button class="plus-secondary" id="renderAdButton">Render configured ad</button>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">🤝</span>
          <h3>Sponsor campaign</h3>
          <p>${escapeHtml(monetization.sponsorTitle || "No sponsor configured")}</p>
          <div class="plus-buttons">
            <button class="plus-secondary" id="openSponsorButton" ${monetization.sponsorUrl ? "" : "disabled"}>Open sponsor</button>
          </div>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">🔗</span>
          <h3>Affiliate links</h3>
          <div class="plus-list" id="affiliateList">
            ${(monetization.affiliateLinks || []).length
              ? monetization.affiliateLinks.map(link => `
                <button class="plus-list-item plus-secondary" data-affiliate-url="${escapeAttribute(link.url)}" data-affiliate-name="${escapeAttribute(link.name)}">
                  <div><strong>${escapeHtml(link.name)}</strong><small>${escapeHtml(link.description || "Affiliate link")}</small></div><span>↗</span>
                </button>`).join("")
              : `<div class="plus-status">Set AFFILIATE_LINKS_JSON to show affiliate campaigns.</div>`}
          </div>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">📊</span>
          <h3>Tracking</h3>
          <p>Sponsor and affiliate button clicks are recorded for signed-in users.</p>
          <div class="plus-code">ADSENSE_CLIENT=ca-pub-...
ADSENSE_SLOT=...
SPONSOR_TITLE=...
SPONSOR_URL=...
AFFILIATE_LINKS_JSON=[...]</div>
        </div>
      </div>`;
    document.getElementById("renderAdButton").addEventListener("click", () => {
      window.NEXUS_MONETIZATION?.renderAd?.(document.getElementById("plusAdPreview"));
    });
    document.getElementById("openSponsorButton").addEventListener("click", () => {
      if (!monetization.sponsorUrl) return;
      recordMonetization("sponsor_click", monetization.sponsorTitle);
      window.open(monetization.sponsorUrl, "_blank", "noopener,noreferrer");
    });
    element.querySelectorAll("[data-affiliate-url]").forEach(button => {
      button.addEventListener("click", () => {
        recordMonetization("affiliate_click", button.dataset.affiliateName);
        window.open(button.dataset.affiliateUrl, "_blank", "noopener,noreferrer");
      });
    });
  }

  function developerView(element) {
    if (!requireAccount(element)) return;
    const keys = state.data.apiKeys;
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="apiKeyForm">
          <h3>Create API key</h3>
          <label class="plus-field"><span>Name</span><input name="name" required value="My app"></label>
          <label class="plus-field"><span>Daily quota</span><input name="quotaDaily" type="number" min="10" max="5000" value="100"></label>
          <button class="plus-primary">Create secret key</button>
          <div id="newApiSecret"></div>
        </form>
        <div class="plus-card plus-stack">
          <h3>API example</h3>
          <div class="plus-code">curl -X POST "${location.origin}/api/v1/chat" \
-H "Authorization: Bearer nx_live_YOUR_KEY" \
-H "Content-Type: application/json" \
-d '{"prompt":"Explain Python lists"}'</div>
          <button class="plus-secondary" data-copy-text='curl -X POST "${location.origin}/api/v1/chat" -H "Authorization: Bearer nx_live_YOUR_KEY" -H "Content-Type: application/json" -d "{\"prompt\":\"Explain Python lists\"}"'>Copy example</button>
        </div>
      </div>
      <div class="plus-section" style="margin-top:18px">
        <div class="plus-section-head"><h3>API keys</h3><button class="plus-secondary" id="refreshApiKeys">Refresh</button></div>
        <div class="plus-list">
          ${keys.length ? keys.map(key => `
            <div class="plus-list-item">
              <div>
                <strong>${escapeHtml(key.name)} ${key.revoked ? '<span class="plus-badge">revoked</span>' : ""}</strong>
                <small>${escapeHtml(key.prefix)}… · today ${key.dayCount}/${key.quotaDaily} · total ${key.usageCount}</small>
              </div>
              <button class="plus-danger" data-revoke-key="${key.id}" ${key.revoked ? "disabled" : ""}>Revoke</button>
            </div>`).join("") : `<div class="plus-status">No developer API keys.</div>`}
        </div>
      </div>`;
    document.getElementById("apiKeyForm").addEventListener("submit", createApiKey);
    document.getElementById("refreshApiKeys").addEventListener("click", async () => {
      await refreshData();
      render("developer");
    });
    element.querySelectorAll("[data-revoke-key]").forEach(button => {
      button.addEventListener("click", () => revokeApiKey(button.dataset.revokeKey));
    });
    bindCopyButtons(element);
  }

  function fineTuneView(element) {
    if (!requireAccount(element)) return;
    const configured = Boolean(state.config.features?.fineTuningProvider);
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="fineTuneForm">
          <h3>Create fine-tuning job</h3>
          <label class="plus-field"><span>Job name</span><input name="name" required value="Support assistant"></label>
          <label class="plus-field"><span>Provider</span><input name="provider" value="external"></label>
          <label class="plus-field"><span>Base model</span><input name="baseModel" required placeholder="provider/model-name"></label>
          <label class="plus-field"><span>JSONL or dataset text</span><textarea name="dataset" rows="9" required placeholder='{"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hi"}]}'></textarea></label>
          <button class="plus-primary">Prepare / submit</button>
        </form>
        <div class="plus-card plus-stack">
          <h3>Provider status</h3>
          <div class="plus-status ${configured ? "ok" : "warn"}">
            ${configured
              ? "FINE_TUNE_API_URL is configured. New jobs will be submitted."
              : "No external provider configured. Datasets will be validated and saved with dataset-ready status."}
          </div>
          <p>Cloudflare Workers AI chat binding does not automatically fine-tune a custom model through this page. Connect a compatible provider endpoint using FINE_TUNE_API_URL.</p>
        </div>
      </div>
      <div class="plus-section" style="margin-top:18px">
        <h3>Jobs</h3>
        <div class="plus-list" style="margin-top:9px">
          ${state.data.fineTuneJobs.length ? state.data.fineTuneJobs.map(job => `
            <div class="plus-list-item">
              <div><strong>${escapeHtml(job.name)}</strong><small>${escapeHtml(job.baseModel)} · ${escapeHtml(job.status)}${job.error ? ` · ${escapeHtml(job.error)}` : ""}</small></div>
              <span class="plus-badge">${escapeHtml(job.provider)}</span>
            </div>`).join("") : `<div class="plus-status">No jobs created.</div>`}
        </div>
      </div>`;
    document.getElementById("fineTuneForm").addEventListener("submit", createFineTune);
  }

  function vaultView(element) {
    if (!requireAccount(element)) return;
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="vaultForm">
          <h3>Encrypt active conversation</h3>
          <label class="plus-field"><span>Vault name</span><input name="name" required value="Private conversation"></label>
          <label class="plus-field"><span>Passphrase</span><input name="passphrase" type="password" minlength="8" required autocomplete="new-password"></label>
          <label class="plus-field"><span>Confirm passphrase</span><input name="confirm" type="password" minlength="8" required autocomplete="new-password"></label>
          <button class="plus-primary">Encrypt and upload</button>
          <div class="plus-status">AES-GCM encryption and key derivation happen inside this browser. The passphrase is never sent to the server.</div>
        </form>
        <div class="plus-card plus-stack">
          <h3>Open encrypted vault</h3>
          <label class="plus-field"><span>Vault</span><select id="vaultSelect">${vaultOptions()}</select></label>
          <label class="plus-field"><span>Passphrase</span><input id="vaultPassphrase" type="password" autocomplete="current-password"></label>
          <div class="plus-buttons">
            <button class="plus-secondary" id="decryptVaultButton">Decrypt preview</button>
            <button class="plus-success" id="restoreVaultButton">Restore as chat</button>
            <button class="plus-danger" id="deleteVaultButton">Delete</button>
          </div>
          <div class="plus-output" id="vaultOutput">Encrypted content is not loaded yet.</div>
        </div>
      </div>`;
    document.getElementById("vaultForm").addEventListener("submit", saveVault);
    document.getElementById("decryptVaultButton").addEventListener("click", () => openVault(false));
    document.getElementById("restoreVaultButton").addEventListener("click", () => openVault(true));
    document.getElementById("deleteVaultButton").addEventListener("click", deleteVault);
  }

  function backupView(element) {
    if (!requireAccount(element)) return;
    element.innerHTML = `
      <div class="plus-grid two">
        <div class="plus-card plus-stack">
          <span class="plus-icon">☁</span>
          <h3>Automatic backup</h3>
          <div class="plus-status ok">A backup is attempted once every 24 hours when a signed-in user opens the website.</div>
          <button class="plus-primary" id="createBackupButton">Create backup now</button>
        </div>
        <div class="plus-card plus-stack">
          <span class="plus-icon">↻</span>
          <h3>Restore safely</h3>
          <p>Restoring replaces local chats, settings, projects and scheduled task data, then reloads the app.</p>
        </div>
      </div>
      <div class="plus-section" style="margin-top:18px">
        <div class="plus-section-head"><h3>Cloud backups</h3><button class="plus-secondary" id="refreshBackups">Refresh</button></div>
        <div class="plus-list">
          ${state.data.backups.length ? state.data.backups.map(backup => `
            <div class="plus-list-item">
              <div><strong>${escapeHtml(backup.label)}</strong><small>${new Date(backup.createdAt).toLocaleString()} · ${formatBytes(backup.size)} · ${escapeHtml(backup.kind)}</small></div>
              <div class="plus-buttons">
                <button class="plus-success" data-restore-backup="${backup.id}">Restore</button>
                <button class="plus-danger" data-delete-backup="${backup.id}">Delete</button>
              </div>
            </div>`).join("") : `<div class="plus-status">No cloud backups yet.</div>`}
        </div>
      </div>`;
    document.getElementById("createBackupButton").addEventListener("click", () => createBackup("manual"));
    document.getElementById("refreshBackups").addEventListener("click", async () => {
      await refreshData();
      render("backup");
    });
    element.querySelectorAll("[data-restore-backup]").forEach(button => {
      button.addEventListener("click", () => restoreBackup(button.dataset.restoreBackup));
    });
    element.querySelectorAll("[data-delete-backup]").forEach(button => {
      button.addEventListener("click", () => deleteBackup(button.dataset.deleteBackup));
    });
  }

  function whatsappView(element) {
    const configured = Boolean(state.config.features?.whatsappCloudApi);
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="whatsappShareForm">
          <h3>Open WhatsApp share</h3>
          <label class="plus-field"><span>Phone with country code (optional)</span><input name="to" inputmode="tel" placeholder="919876543210"></label>
          <label class="plus-field"><span>Message</span><textarea name="message" rows="7" required>Try MARKZOSUF AI NEXUS: ${location.origin}</textarea></label>
          <button class="plus-primary">Open WhatsApp</button>
        </form>
        <form class="plus-card plus-stack" id="whatsappApiForm">
          <h3>WhatsApp Cloud API</h3>
          <div class="plus-status ${configured ? "ok" : "warn"}">
            ${configured ? "Server-side WhatsApp sending is configured." : "Cloud API secrets are not configured."}
          </div>
          <label class="plus-field"><span>Recipient phone</span><input name="to" required inputmode="tel" placeholder="919876543210"></label>
          <label class="plus-field"><span>Message</span><textarea name="message" rows="7" required></textarea></label>
          <button class="plus-secondary" ${configured ? "" : "disabled"}>Send through Cloud API</button>
        </form>
      </div>`;
    document.getElementById("whatsappShareForm").addEventListener("submit", openWhatsApp);
    document.getElementById("whatsappApiForm").addEventListener("submit", sendWhatsAppApi);
  }

  function upiView(element) {
    const upi = state.config.upi || {};
    element.innerHTML = `
      <div class="plus-row">
        <form class="plus-card plus-stack" id="upiForm">
          <h3>Create UPI payment</h3>
          <label class="plus-field"><span>UPI ID</span><input name="vpa" required value="${escapeAttribute(upi.vpa || "")}" placeholder="name@bank"></label>
          <label class="plus-field"><span>Payee name</span><input name="payeeName" required value="${escapeAttribute(upi.payeeName || "MARKZOSUF AI NEXUS")}"></label>
          <label class="plus-field"><span>Amount ₹</span><input name="amount" type="number" min="1" step="0.01" required value="99"></label>
          <label class="plus-field"><span>Note</span><input name="note" maxlength="80" value="AI NEXUS Student Pro"></label>
          <label class="plus-field"><span>Transaction reference</span><input name="txnRef" maxlength="35" value="NEXUS${Date.now()}"></label>
          <button class="plus-primary">Generate payment link</button>
        </form>
        <div class="plus-card plus-stack">
          <h3>Payment QR</h3>
          <img class="plus-qr" id="upiQr" alt="UPI QR will appear here" hidden>
          <div class="plus-code" id="upiUri">Generate a payment link first.</div>
          <div class="plus-buttons">
            <a class="plus-primary" id="openUpiLink" href="#" hidden>Open UPI app</a>
            <button class="plus-secondary" id="copyUpiLink" disabled>Copy link</button>
          </div>
          <div class="plus-status warn">A UPI intent starts a payment but does not prove success. Confirm payment using your bank statement or a verified payment gateway webhook.</div>
        </div>
      </div>`;
    document.getElementById("upiForm").addEventListener("submit", generateUpi);
    document.getElementById("copyUpiLink").addEventListener("click", () => {
      const uri = document.getElementById("upiUri").textContent;
      copyText(uri);
    });
  }

  async function loadConfig() {
    try {
      const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
      state.config = response.ok ? await response.json() : {};
    } catch {
      state.config = {};
    }
  }

  async function loadAccount() {
    try {
      const response = await fetch("/api/auth/me", { headers: { Accept: "application/json" } });
      const result = response.ok ? await response.json() : {};
      state.account = result.authenticated ? result.user : null;
    } catch {
      state.account = null;
    }
  }

  async function refreshData() {
    if (!state.account) return;
    try {
      const result = await apiGet("bootstrap");
      state.data = { ...state.data, ...result };
      if (!state.roomId) state.roomId = state.data.rooms[0]?.id || "";
      if (!state.channelId) state.channelId = state.data.channels[0]?.id || "";
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function createOrg(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiPost("create_org", { name: form.get("name") });
    await refreshData();
    render("teams");
    toast("Organization created.");
  }

  async function acceptInvite(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiPost("accept_invite", { token: form.get("token") });
    await refreshData();
    render("teams");
    toast("Team invitation accepted.");
  }

  async function inviteMember(event) {
    event.preventDefault();
    const submitter = event.submitter;
    if (submitter?.value === "cancel") return;
    const form = new FormData(event.currentTarget);
    const result = await apiPost("invite_member", {
      orgId: form.get("orgId"),
      email: form.get("email"),
      role: form.get("role")
    });
    document.getElementById("inviteResult").innerHTML = `
      <div class="plus-secret">Invite token (shown once): ${escapeHtml(result.token)}</div>
      <button type="button" class="plus-secondary" id="copyInviteToken">Copy token</button>`;
    document.getElementById("copyInviteToken").addEventListener("click", () => copyText(result.token));
  }

  async function createRoom(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiPost("create_room", {
      orgId: form.get("orgId"),
      name: form.get("name")
    });
    await refreshData();
    state.roomId = result.id;
    render("collaboration");
  }

  async function postRoomEvent(event) {
    event.preventDefault();
    if (!state.roomId) return toast("Create or choose a room.", "error");
    const form = new FormData(event.currentTarget);
    await apiPost("post_event", {
      roomId: state.roomId,
      eventType: "note",
      payload: { text: form.get("text") }
    });
    event.currentTarget.reset();
    await pollRoom();
  }

  async function pollRoom() {
    if (!state.roomId || state.view !== "collaboration") return;
    try {
      const result = await apiGet("room_events", {
        roomId: state.roomId,
        since: state.roomSince
      });
      const feed = document.getElementById("roomFeed");
      if (!feed) return;
      if (state.roomSince === 0) feed.innerHTML = "";
      for (const item of result.events || []) {
        state.roomSince = Math.max(state.roomSince, Number(item.createdAt || 0));
        const message = document.createElement("div");
        message.className = "plus-message";
        message.innerHTML = `<strong>${escapeHtml(item.displayName)} · ${new Date(item.createdAt).toLocaleTimeString()}</strong>
          <p>${escapeHtml(item.payload?.text || JSON.stringify(item.payload || {}))}</p>`;
        feed.appendChild(message);
      }
      if (!feed.children.length) feed.innerHTML = `<div class="plus-status">No updates in this room.</div>`;
      feed.scrollTop = feed.scrollHeight;
    } catch {}
  }

  async function createChannel(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiPost("create_channel", {
      orgId: form.get("orgId"),
      name: form.get("name")
    });
    await refreshData();
    state.channelId = result.id;
    render("community");
  }

  async function sendChannelMessage(event) {
    event.preventDefault();
    if (!state.channelId) return toast("Create or choose a channel.", "error");
    const form = new FormData(event.currentTarget);
    const text = String(form.get("message") || "");
    const encrypt = document.getElementById("encryptChannelMessage").checked;
    const passphrase = document.getElementById("channelPassphrase").value;
    let ciphertext = null;
    let body = text;
    if (encrypt) {
      if (passphrase.length < 8) return toast("Use an encryption passphrase of at least 8 characters.", "error");
      ciphertext = await encryptJSON({ text }, passphrase);
      body = "";
    }
    await apiPost("send_message", {
      channelId: state.channelId,
      body,
      ciphertext
    });
    event.currentTarget.reset();
    await pollChannel();
  }

  async function pollChannel() {
    if (!state.channelId || state.view !== "community") return;
    try {
      const result = await apiGet("channel_messages", {
        channelId: state.channelId,
        since: state.channelSince
      });
      const feed = document.getElementById("channelFeed");
      if (!feed) return;
      if (state.channelSince === 0) feed.innerHTML = "";
      const passphrase = document.getElementById("channelPassphrase")?.value || "";
      for (const item of result.messages || []) {
        state.channelSince = Math.max(state.channelSince, Number(item.createdAt || 0));
        let text = item.body || "";
        if (item.ciphertext) {
          text = "🔒 Encrypted message";
          if (passphrase) {
            try {
              const decrypted = await decryptJSON(item.ciphertext, passphrase);
              text = decrypted.text || text;
            } catch {}
          }
        }
        const message = document.createElement("div");
        message.className = "plus-message";
        message.innerHTML = `<strong>${escapeHtml(item.displayName)} · ${new Date(item.createdAt).toLocaleTimeString()}</strong>
          <p>${escapeHtml(text)}</p>`;
        feed.appendChild(message);
      }
      if (!feed.children.length) feed.innerHTML = `<div class="plus-status">No messages in this channel.</div>`;
      feed.scrollTop = feed.scrollHeight;
    } catch {}
  }

  async function createApiKey(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiPost("create_api_key", {
      name: form.get("name"),
      quotaDaily: Number(form.get("quotaDaily"))
    });
    document.getElementById("newApiSecret").innerHTML = `
      <div class="plus-secret">${escapeHtml(result.secret)}</div>
      <button type="button" class="plus-secondary" id="copyNewApiKey">Copy secret now</button>
      <div class="plus-status warn">The full secret will not be shown again.</div>`;
    document.getElementById("copyNewApiKey").addEventListener("click", () => copyText(result.secret));
    await refreshData();
  }

  async function revokeApiKey(id) {
    if (!confirm("Revoke this API key? Existing apps will stop working.")) return;
    await apiPost("revoke_api_key", { id });
    await refreshData();
    render("developer");
  }

  async function createFineTune(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiPost("create_fine_tune", {
      name: form.get("name"),
      provider: form.get("provider"),
      baseModel: form.get("baseModel"),
      dataset: form.get("dataset")
    });
    await refreshData();
    render("finetune");
    toast(`Fine-tuning job status: ${result.status}`);
  }

  async function saveVault(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const passphrase = String(form.get("passphrase") || "");
    if (passphrase !== String(form.get("confirm") || "")) return toast("Passphrases do not match.", "error");
    const chat = window.NEXUS_APP?.getActiveChat?.();
    if (!chat) return toast("Open or create a conversation first.", "error");
    const ciphertext = await encryptJSON(chat, passphrase);
    await apiPost("save_vault", { name: form.get("name"), ciphertext });
    event.currentTarget.reset();
    await refreshData();
    render("vault");
    toast("Encrypted vault saved.");
  }

  async function openVault(restore) {
    const id = document.getElementById("vaultSelect").value;
    const passphrase = document.getElementById("vaultPassphrase").value;
    if (!id || passphrase.length < 8) return toast("Choose a vault and enter its passphrase.", "error");
    const result = await apiGet("vault_get", { id });
    try {
      const chat = await decryptJSON(result.vault.ciphertext, passphrase);
      document.getElementById("vaultOutput").textContent = JSON.stringify(chat, null, 2).slice(0, 30000);
      if (restore) {
        const stateRef = window.NEXUS_APP?.getState?.();
        if (!stateRef) throw new Error("Chat state is unavailable.");
        const restored = { ...chat, id: crypto.randomUUID(), title: `${chat.title || "Restored chat"} — restored`, updatedAt: Date.now() };
        stateRef.chats.unshift(restored);
        stateRef.activeChatId = restored.id;
        window.NEXUS_APP.saveChats();
        window.NEXUS_APP.renderAll();
        close();
        toast("Encrypted chat restored.");
      }
    } catch {
      toast("Could not decrypt. Check the passphrase.", "error");
    }
  }

  async function deleteVault() {
    const id = document.getElementById("vaultSelect").value;
    if (!id || !confirm("Delete this encrypted vault?")) return;
    await apiPost("delete_vault", { id });
    await refreshData();
    render("vault");
  }

  async function createBackup(kind = "manual") {
    const snapshot = createSnapshot();
    await apiPost("create_backup", {
      kind,
      label: `${kind === "auto" ? "Automatic" : "Manual"} backup · ${new Date().toLocaleString()}`,
      data: snapshot
    });
    localStorage.setItem("nexus-last-auto-backup", String(Date.now()));
    await refreshData();
    if (state.view === "backup") render("backup");
    if (kind !== "auto") toast("Cloud backup created.");
  }

  async function autoBackup() {
    const last = Number(localStorage.getItem("nexus-last-auto-backup") || 0);
    if (Date.now() - last < 86400000) return;
    await createBackup("auto");
  }

  function createSnapshot() {
    return {
      version: "9.3-plus",
      createdAt: Date.now(),
      chats: window.NEXUS_APP?.getChats?.() || readJson("markzosuf-ai-nexus-chats-v2", []),
      settings: readJson("markzosuf-ai-nexus-settings-v2", {}),
      theme: localStorage.getItem("markzosuf-ai-nexus-theme-v2") || "dark",
      projects: readJson("nexus-v9-projects", []),
      tasks: readJson("nexus-v9-tasks", [])
    };
  }

  async function restoreBackup(id) {
    if (!confirm("Restore this backup and replace current local workspace data?")) return;
    const result = await apiGet("backup_get", { id });
    const data = result.backup.data || {};
    if (Array.isArray(data.chats)) localStorage.setItem("markzosuf-ai-nexus-chats-v2", JSON.stringify(data.chats));
    if (data.settings) localStorage.setItem("markzosuf-ai-nexus-settings-v2", JSON.stringify(data.settings));
    if (data.theme) localStorage.setItem("markzosuf-ai-nexus-theme-v2", data.theme);
    if (Array.isArray(data.projects)) localStorage.setItem("nexus-v9-projects", JSON.stringify(data.projects));
    if (Array.isArray(data.tasks)) localStorage.setItem("nexus-v9-tasks", JSON.stringify(data.tasks));
    location.reload();
  }

  async function deleteBackup(id) {
    if (!confirm("Delete this cloud backup?")) return;
    await apiPost("delete_backup", { id });
    await refreshData();
    render("backup");
  }

  function openWhatsApp(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const to = String(form.get("to") || "").replace(/\D/g, "");
    const message = encodeURIComponent(String(form.get("message") || ""));
    const url = to ? `https://wa.me/${to}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function sendWhatsAppApi(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await apiPost("whatsapp_send", {
      to: form.get("to"),
      message: form.get("message")
    });
    toast(result.sent ? "WhatsApp message sent." : "WhatsApp request completed.");
  }

  async function generateUpi(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const vpa = String(form.get("vpa") || "").trim();
    if (!/^[\w.\-]+@[\w.\-]+$/.test(vpa)) return toast("Enter a valid UPI ID.", "error");
    const amount = Number(form.get("amount") || 0);
    const params = new URLSearchParams({
      pa: vpa,
      pn: String(form.get("payeeName") || ""),
      am: amount.toFixed(2),
      cu: "INR",
      tn: String(form.get("note") || ""),
      tr: String(form.get("txnRef") || "")
    });
    const uri = `upi://pay?${params.toString()}`;
    const qr = document.getElementById("upiQr");
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(uri)}`;
    qr.hidden = false;
    document.getElementById("upiUri").textContent = uri;
    const link = document.getElementById("openUpiLink");
    link.href = uri;
    link.hidden = false;
    document.getElementById("copyUpiLink").disabled = false;
    if (state.account) {
      apiPost("record_upi", {
        amount,
        note: form.get("note"),
        txnRef: form.get("txnRef")
      }).catch(() => {});
    }
  }

  async function runOffline() {
    const prompt = document.getElementById("offlinePrompt").value.trim();
    const output = document.getElementById("offlineOutput");
    const status = document.getElementById("offlineStatus");
    if (!prompt) return toast("Enter an offline prompt.", "error");
    output.textContent = "Processing locally…";
    try {
      const languageModel = globalThis.LanguageModel || globalThis.ai?.languageModel;
      if (languageModel?.create) {
        status.textContent = "Using browser on-device language model.";
        state.offlineSession ||= await languageModel.create();
        output.textContent = await state.offlineSession.prompt(prompt);
        return;
      }
    } catch {
      state.offlineSession = null;
    }
    status.textContent = "Using built-in local fallback engine.";
    output.textContent = localOfflineEngine(prompt);
  }

  function localOfflineEngine(prompt) {
    const normalized = prompt.replace(/\s+/g, " ").trim();
    const body = normalized.replace(/^(summarize|summary|keywords|explain|notes)\s*:?\s*/i, "");
    const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean);
    const words = (body.toLowerCase().match(/[a-zA-Z]{4,}|[\u0900-\u097F]{3,}/g) || []);
    const stop = new Set(["this","that","with","from","have","will","your","about","into","they","them","their","there","what","when","where","which","would","could","should","करके","और","लिए","है","का","की","को"]);
    const counts = {};
    for (const word of words) if (!stop.has(word)) counts[word] = (counts[word] || 0) + 1;
    const keywords = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,8).map(([word]) => word);
    const summary = sentences.slice(0, Math.min(3, sentences.length)).join(" ") || body.slice(0, 500);
    return [
      "OFFLINE SUMMARY",
      summary,
      "",
      "KEYWORDS",
      keywords.length ? keywords.join(", ") : "No strong keywords detected.",
      "",
      "STRUCTURED NOTES",
      ...(sentences.slice(0, 6).map((sentence, index) => `${index + 1}. ${sentence}`))
    ].join("\n");
  }

  async function encryptJSON(value, passphrase) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey(
      "raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(JSON.stringify(value))
    );
    return {
      version: 1,
      algorithm: "AES-GCM",
      kdf: "PBKDF2-SHA256-250000",
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };
  }

  async function decryptJSON(payload, passphrase) {
    const encoder = new TextEncoder();
    const material = await crypto.subtle.importKey(
      "raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]
    );
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(payload.data)
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  async function installPwa() {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice.catch(() => null);
    state.installPrompt = null;
    render("mobile");
  }

  function captureInstallPrompt() {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      state.installPrompt = event;
    });
    window.addEventListener("appinstalled", () => {
      state.installPrompt = null;
      toast("AI NEXUS app installed.");
    });
  }

  async function recordMonetization(eventType, campaign) {
    if (!state.account) return;
    apiPost("monetization_event", { eventType, campaign }).catch(() => {});
  }

  function organizationOptions() {
    return state.data.organizations.length
      ? state.data.organizations.map(org => `<option value="${org.id}">${escapeHtml(org.name)} · ${escapeHtml(org.role)}</option>`).join("")
      : `<option value="">Create an organization first</option>`;
  }

  function roomOptions() {
    return state.data.rooms.length
      ? state.data.rooms.map(room => `<option value="${room.id}">${escapeHtml(room.name)}</option>`).join("")
      : `<option value="">No rooms</option>`;
  }

  function channelOptions() {
    return state.data.channels.length
      ? state.data.channels.map(channel => `<option value="${channel.id}">#${escapeHtml(channel.name)}</option>`).join("")
      : `<option value="">No channels</option>`;
  }

  function vaultOptions() {
    return state.data.vaults.length
      ? state.data.vaults.map(vault => `<option value="${vault.id}">${escapeHtml(vault.name)}</option>`).join("")
      : `<option value="">No encrypted vaults</option>`;
  }

  function requireAccount(element) {
    if (state.account) return true;
    element.innerHTML = `
      <div class="plus-card plus-stack">
        <h3>Sign in required</h3>
        <p>This feature stores private user data in D1 and requires an authenticated account.</p>
        <button class="plus-primary" id="plusSignInButton">Open login</button>
      </div>`;
    document.getElementById("plusSignInButton").addEventListener("click", () => {
      close();
      document.getElementById("openLoginButton")?.click();
    });
    return false;
  }

  function stopPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  async function apiGet(action, params = {}) {
    const url = new URL("/api/enterprise", location.origin);
    url.searchParams.set("action", action);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    return result;
  }

  async function apiPost(action, payload = {}) {
    const response = await fetch("/api/enterprise", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
    return result;
  }

  function bindCopyButtons(root) {
    root.querySelectorAll("[data-copy-text]").forEach(button => {
      button.addEventListener("click", () => copyText(button.dataset.copyText));
    });
  }

  async function copyText(text) {
    try {
      if (window.NEXUS_SAFE_COPY) await window.NEXUS_SAFE_COPY(text);
      else await navigator.clipboard.writeText(text);
      toast("Copied.");
    } catch {
      toast("Copy failed.", "error");
    }
  }

  function toast(message, type = "") {
    if (window.NEXUS_APP?.showToast) return window.NEXUS_APP.showToast(message, type);
    console[type === "error" ? "error" : "log"](message);
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
