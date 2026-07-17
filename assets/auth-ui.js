(() => {
  "use strict";

  const state = {
    config: {},
    account: { authenticated: false },
    mode: "login",
    googleReady: false,
    modalOpen: false,
    busy: false,
    turnstileToken: "",
    turnstileWidget: null
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    createModal();
    bindLaunchers();

    await Promise.allSettled([loadConfig(), loadAccount()]);
    renderLaunchers();
    renderModal();
    await setupTurnstile();

    const params = new URLSearchParams(location.search);
    const isSecurityLink = params.has("reset") || params.has("verify");

    // Show the login/sign-up experience automatically on first page load
    // for every signed-out visitor on desktop and mobile.
    const guestDismissed = localStorage.getItem("nexus-auth-guest-dismissed") === "true";
    if (!state.account?.authenticated && !isSecurityLink && !guestDismissed) {
      requestAnimationFrame(() => {
        setTimeout(() => open("login", { startup: true }), 120);
      });
    }
  }

  function createModal() {
    if (document.getElementById("authModalBackdrop")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "authModalBackdrop";
    backdrop.className = "auth-modal-backdrop auth-startup-backdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.innerHTML = `
      <section class="auth-modal auth-startup-modal" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <button class="auth-modal-close" id="authModalClose" type="button" aria-label="Close and continue as guest">✕</button>

        <div class="auth-startup-grid">
          <main class="auth-startup-main">
            <div class="auth-brand auth-startup-brand">
              <img src="/assets/logo-icon.png?v=15.1.0" alt="AI NEXUS">
              <span class="auth-startup-badge">AI NEXUS ACCOUNT</span>
              <h2 id="authModalTitle">Log in or sign up</h2>
              <p>Sync conversations, projects, files and your profile across desktop and mobile.</p>
            </div>

            <div id="authGuestView">
              <div class="auth-tabs" role="tablist" aria-label="Account mode">
                <button class="auth-tab active" type="button" data-auth-mode="login" role="tab">Log in</button>
                <button class="auth-tab" type="button" data-auth-mode="signup" role="tab">Sign up</button>
              </div>

              <div class="auth-provider-stack">
                <div class="auth-google-container" id="googleSignInContainer">
                  <button class="auth-provider-button" id="googleFallbackButton" type="button">
                    <span class="auth-provider-icon google-g">G</span>
                    <span>Continue with Google</span>
                  </button>
                </div>
                <button class="auth-provider-placeholder" type="button" disabled>
                  <span class="auth-provider-icon">●</span><span>Continue with Apple</span><small>Coming soon</small>
                </button>
                <button class="auth-provider-placeholder" type="button" disabled>
                  <span class="auth-provider-icon">☎</span><span>Continue with phone</span><small>Coming soon</small>
                </button>
              </div>

              <div class="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div>

              <form class="auth-form" id="loginAuthForm" novalidate>
                <label class="auth-field">
                  <span>Email address</span>
                  <input id="authLoginEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
                </label>
                <label class="auth-field">
                  <span>Password</span>
                  <input id="authLoginPassword" type="password" autocomplete="current-password" placeholder="Minimum 8 characters" minlength="8" required>
                </label>
                <div class="auth-inline-actions">
                  <button class="auth-link-button" id="authForgotButton" type="button">Forgot password?</button>
                  <button class="auth-link-button" id="authVerifyButton" type="button">Verify email</button>
                </div>
                <button class="auth-submit" id="authLoginSubmit" type="submit">Continue</button>
              </form>

              <form class="auth-form" id="signupAuthForm" hidden novalidate>
                <label class="auth-field">
                  <span>Your name</span>
                  <input id="authSignupName" autocomplete="name" placeholder="Your display name" maxlength="60" required>
                </label>
                <label class="auth-field">
                  <span>Email address</span>
                  <input id="authSignupEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
                </label>
                <label class="auth-field">
                  <span>Password</span>
                  <input id="authSignupPassword" type="password" autocomplete="new-password" placeholder="Minimum 8 characters" minlength="8" required>
                </label>
                <button class="auth-submit" id="authSignupSubmit" type="submit">Create account</button>
              </form>

              <div class="auth-turnstile" id="authTurnstile" aria-label="Security verification"></div>

              <button class="auth-guest-button" id="authGuestButton" type="button">Continue as guest</button>
              <p class="auth-legal">By continuing, you agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and acknowledge the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Notice</a>. Passwords are hashed before storage.</p>
            </div>

            <div id="authAccountView" hidden></div>
            <div class="auth-status" id="authStatus" hidden role="status" aria-live="polite"></div>
          </main>

          <aside class="auth-startup-side" aria-label="Account benefits">
            <div class="auth-side-glow"></div>
            <img src="/assets/logo-icon.png?v=15.1.0" alt="" class="auth-side-logo">
            <h3>Your personal AI workspace</h3>
            <p>One account connects your chats, projects and advanced tools.</p>
            <ul>
              <li><span>✓</span> Show your name in the greeting</li>
              <li><span>✓</span> Sync chats and project memory</li>
              <li><span>✓</span> Save PDFs, code and images</li>
              <li><span>✓</span> Manage sessions and security</li>
            </ul>
            <div class="auth-side-security">🔒 Cloudflare D1 session security</div>
          </aside>
        </div>
      </section>
    `;

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) close();
    });

    document.body.appendChild(backdrop);

    byId("authModalClose")?.addEventListener("click", close);
    byId("authGuestButton")?.addEventListener("click", () => {
      localStorage.setItem("nexus-auth-guest-dismissed", "true");
      close();
    });
    document.querySelectorAll("[data-auth-mode]").forEach(button => {
      button.addEventListener("click", () => setMode(button.dataset.authMode));
    });
    byId("loginAuthForm")?.addEventListener("submit", login);
    byId("signupAuthForm")?.addEventListener("submit", signup);
    byId("authForgotButton")?.addEventListener("click", requestPasswordReset);
    byId("authVerifyButton")?.addEventListener("click", requestEmailVerification);
    byId("googleFallbackButton")?.addEventListener("click", handleGoogleButton);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && state.modalOpen) close();
    });
  }

  function bindLaunchers() {
    byId("openLoginButton")?.addEventListener("click", () => open("login"));
    byId("openSignupButton")?.addEventListener("click", () => open("signup"));
    byId("openUserButton")?.addEventListener("click", () => open("account"));
  }

  async function loadConfig() {
    try {
      const response = await fetch("/api/config", { cache: "no-store" });
      state.config = response.ok ? await response.json() : {};
    } catch {
      state.config = {};
    }
  }

  async function loadAccount() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      state.account = response.ok ? await response.json() : { authenticated: false };
    } catch {
      state.account = { authenticated: false };
    }

    const user = state.account?.authenticated ? state.account.user : null;
    window.NEXUS_CURRENT_USER = user || null;
    if (user) localStorage.removeItem("nexus-auth-guest-dismissed");
    updateProfile(user);
  }

  function open(mode = "login", options = {}) {
    if (state.account?.authenticated) mode = "account";
    state.mode = mode === "signup" ? "signup" : mode === "account" ? "account" : "login";
    state.modalOpen = true;
    renderModal();

    const backdrop = byId("authModalBackdrop");
    if (!backdrop) return;

    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
    backdrop.classList.toggle("is-startup", Boolean(options.startup));
    document.body.classList.add("auth-modal-open");
    document.body.style.overflow = "hidden";

    const shell = document.querySelector(".app-shell");
    if (shell) shell.inert = true;

    if (!state.account?.authenticated && state.config.googleClientId) {
      initializeGoogle();
    }

    setTimeout(() => {
      const focusTarget = state.mode === "signup" ? byId("authSignupName") : byId("authLoginEmail");
      focusTarget?.focus({ preventScroll: true });
    }, 180);
  }

  function close() {
    const backdrop = byId("authModalBackdrop");
    if (!backdrop) return;

    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-startup");
    state.modalOpen = false;
    document.body.classList.remove("auth-modal-open");
    document.body.style.overflow = "";

    const shell = document.querySelector(".app-shell");
    if (shell) shell.inert = false;

    hideStatus();
  }

  function setMode(mode) {
    state.mode = mode === "signup" ? "signup" : "login";
    hideStatus();
    renderModal();
    if (state.config.googleClientId && state.modalOpen) initializeGoogle();
  }

  function renderModal() {
    const user = state.account?.authenticated ? state.account.user : null;
    const guestView = byId("authGuestView");
    const accountView = byId("authAccountView");
    const title = byId("authModalTitle");
    if (!guestView || !accountView || !title) return;

    if (user) {
      title.textContent = "Your AI NEXUS account";
      guestView.hidden = true;
      accountView.hidden = false;
      accountView.innerHTML = `
        <div class="auth-account-card auth-final-account-card">
          <div class="auth-account-avatar">${escapeHtml(initials(user.displayName || user.email))}</div>
          <h3>${escapeHtml(user.displayName || user.email)}</h3>
          <p>${escapeHtml(user.email)} · ${escapeHtml(user.plan || "free")} plan</p>
          <div class="auth-account-actions">
            <button class="auth-submit" id="authSyncButton" type="button">Open cloud sync</button>
            <button class="auth-login-button danger" id="authLogoutButton" type="button">Sign out</button>
          </div>
        </div>
      `;

      byId("authLogoutButton")?.addEventListener("click", logout);
      byId("authSyncButton")?.addEventListener("click", () => {
        close();
        window.NEXUS_ADVANCED?.open?.("account");
      });
      return;
    }

    title.textContent = state.mode === "signup" ? "Create your account" : "Log in or sign up";
    guestView.hidden = false;
    accountView.hidden = true;

    document.querySelectorAll("[data-auth-mode]").forEach(button => {
      const active = button.dataset.authMode === state.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    const loginForm = byId("loginAuthForm");
    const signupForm = byId("signupAuthForm");
    if (loginForm) loginForm.hidden = state.mode !== "login";
    if (signupForm) signupForm.hidden = state.mode !== "signup";

    renderGoogleState();
    renderDatabaseState();
  }

  function renderGoogleState() {
    const container = byId("googleSignInContainer");
    if (!container) return;

    if (!state.config.googleClientId) {
      container.innerHTML = `
        <button class="auth-provider-button auth-provider-disabled" type="button" disabled>
          <span class="auth-provider-icon google-g">G</span>
          <span>Continue with Google</span>
          <small>Setup required</small>
        </button>`;
      return;
    }

    if (!state.googleReady && !container.querySelector("#googleFallbackButton")) {
      container.innerHTML = `
        <button class="auth-provider-button" id="googleFallbackButton" type="button">
          <span class="auth-provider-icon google-g">G</span>
          <span>Continue with Google</span>
        </button>`;
      byId("googleFallbackButton")?.addEventListener("click", handleGoogleButton);
    }
  }

  function renderDatabaseState() {
    const enabled = state.config.features?.database !== false;
    ["authLoginEmail", "authLoginPassword", "authLoginSubmit", "authSignupName", "authSignupEmail", "authSignupPassword", "authSignupSubmit"]
      .forEach(id => {
        const element = byId(id);
        if (element) element.disabled = !enabled || state.busy;
      });

    if (!enabled) {
      showStatus("Account database is not connected. Continue as guest or configure the DB binding.", "error");
    }
  }

  async function handleGoogleButton() {
    if (!state.config.googleClientId) return;
    await initializeGoogle();
  }

  async function login(event) {
    event.preventDefault();
    const email = byId("authLoginEmail")?.value.trim() || "";
    const password = byId("authLoginPassword")?.value || "";

    if (!isValidEmail(email)) return showStatus("Enter a valid email address.", "error");
    if (password.length < 8) return showStatus("Password must contain at least 8 characters.", "error");

    await submitAuth("/api/auth/login", {
      email,
      password,
      turnstileToken: state.turnstileToken
    });
  }

  async function signup(event) {
    event.preventDefault();
    const displayName = byId("authSignupName")?.value.trim() || "";
    const email = byId("authSignupEmail")?.value.trim() || "";
    const password = byId("authSignupPassword")?.value || "";

    if (displayName.length < 2) return showStatus("Enter your name.", "error");
    if (!isValidEmail(email)) return showStatus("Enter a valid email address.", "error");
    if (password.length < 8) return showStatus("Password must contain at least 8 characters.", "error");

    await submitAuth("/api/auth/register", {
      displayName,
      email,
      password,
      turnstileToken: state.turnstileToken
    });
  }

  async function submitAuth(url, body) {
    setBusy(true);
    showStatus("Please wait…");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(friendlyError(data.error, response.status));

      await loadAccount();
      renderLaunchers();
      renderModal();
      showStatus(data.message || "Signed in successfully.", "success");
      window.NEXUS_APP?.showToast?.("Signed in successfully.");
      setTimeout(close, 650);
    } catch (error) {
      showStatus(friendlyError(error.message), "error");
    } finally {
      setBusy(false);
      resetTurnstile();
    }
  }

  async function requestPasswordReset() {
    const email = byId("authLoginEmail")?.value.trim() || prompt("Enter your account email:", "") || "";
    if (!isValidEmail(email)) return showStatus("Enter your email first, then select Forgot password.", "error");

    setBusy(true);
    showStatus("Requesting a password reset link…");
    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: state.turnstileToken })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(friendlyError(data.error, response.status));
      showStatus(data.message || "Reset instructions have been requested.", "success");
    } catch (error) {
      showStatus(friendlyError(error.message), "error");
    } finally {
      setBusy(false);
      resetTurnstile();
    }
  }

  async function requestEmailVerification() {
    const email = byId("authLoginEmail")?.value.trim() || prompt("Enter your account email:", "") || "";
    if (!isValidEmail(email)) return showStatus("Enter your email first, then select Verify email.", "error");

    setBusy(true);
    showStatus("Requesting a verification link…");
    try {
      const response = await fetch("/api/auth/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: state.turnstileToken })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(friendlyError(data.error, response.status));
      showStatus(data.message || "Verification instructions have been requested.", "success");
    } catch (error) {
      showStatus(friendlyError(error.message), "error");
    } finally {
      setBusy(false);
      resetTurnstile();
    }
  }

  async function logout() {
    setBusy(true);
    showStatus("Signing out…");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed.");
      await loadAccount();
      renderLaunchers();
      state.mode = "login";
      renderModal();
      showStatus("Signed out.", "success");
    } catch (error) {
      showStatus(friendlyError(error.message), "error");
    } finally {
      setBusy(false);
    }
  }

  function renderLaunchers() {
    const user = state.account?.authenticated ? state.account.user : null;
    const loginButton = byId("openLoginButton");
    const signupButton = byId("openSignupButton");
    const userButton = byId("openUserButton");

    if (loginButton) loginButton.hidden = Boolean(user);
    if (signupButton) signupButton.hidden = Boolean(user);
    if (userButton) userButton.hidden = !user;

    if (user) {
      const name = user.displayName || user.email.split("@")[0];
      const nameElement = byId("authUserName");
      const avatarElement = byId("authUserAvatar");
      if (nameElement) nameElement.textContent = name;
      if (avatarElement) avatarElement.textContent = initials(name);
    }
  }

  function updateProfile(user) {
    const displayName = user?.displayName || user?.email?.split("@")[0] || "MARK ZOSUF";
    const status = user ? `${user.email} · ${user.plan || "free"}` : "Guest · AI & ML Developer";

    const sidebarName = byId("sidebarUserName");
    const sidebarStatus = byId("sidebarUserStatus");
    const avatar = document.querySelector(".avatar-profile");
    const greeting = byId("adaptiveGreeting");

    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarStatus) sidebarStatus.textContent = status;
    if (avatar) avatar.textContent = initials(displayName);
    if (greeting) greeting.textContent = user ? `What can I help with, ${displayName}?` : "What can I help with?";
  }

  async function initializeGoogle() {
    if (!state.config.googleClientId || state.googleReady) return;

    try {
      const container = byId("googleSignInContainer");
      if (!container) return;
      container.innerHTML = '<div class="auth-provider-loading">Loading Google sign-in…</div>';

      if (!window.google?.accounts?.id) {
        await loadScript("https://accounts.google.com/gsi/client");
      }

      container.innerHTML = "";
      google.accounts.id.initialize({
        client_id: state.config.googleClientId,
        callback: handleGoogleCredential,
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true
      });

      google.accounts.id.renderButton(container, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: state.mode === "signup" ? "signup_with" : "continue_with",
        width: Math.min(360, Math.max(270, container.clientWidth || 350))
      });

      state.googleReady = true;
    } catch {
      state.googleReady = false;
      const container = byId("googleSignInContainer");
      if (container) {
        container.innerHTML = `
          <button class="auth-provider-button auth-provider-disabled" type="button" disabled>
            <span class="auth-provider-icon google-g">G</span>
            <span>Google sign-in unavailable</span>
          </button>`;
      }
      showStatus("Google sign-in could not load. Email login is still available.", "error");
    }
  }

  async function handleGoogleCredential(response) {
    if (!response?.credential) return showStatus("Google did not return a sign-in credential.", "error");

    setBusy(true);
    showStatus("Verifying Google account…");
    try {
      const result = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(friendlyError(data.error, result.status));

      await loadAccount();
      renderLaunchers();
      renderModal();
      showStatus("Google sign-in successful.", "success");
      setTimeout(close, 650);
    } catch (error) {
      showStatus(friendlyError(error.message), "error");
    } finally {
      setBusy(false);
    }
  }

  function setBusy(busy) {
    state.busy = busy;
    document.querySelectorAll("#authModalBackdrop button, #authModalBackdrop input").forEach(element => {
      if (element.id === "authModalClose" || element.id === "authGuestButton") return;
      if (element.classList.contains("auth-provider-placeholder")) return;
      element.disabled = busy;
    });
    byId("authModalBackdrop")?.classList.toggle("is-busy", busy);
    renderDatabaseState();
  }

  function showStatus(message, type = "") {
    const status = byId("authStatus");
    if (!status) return;
    status.hidden = false;
    status.className = `auth-status ${type}`.trim();
    status.textContent = message;
  }

  function hideStatus() {
    const status = byId("authStatus");
    if (!status) return;
    status.hidden = true;
    status.textContent = "";
    status.className = "auth-status";
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(script => script.src === src)) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Script loading failed."));
      document.head.appendChild(script);
    });
  }

  async function setupTurnstile() {
    const container = byId("authTurnstile");
    if (!container || !state.config.turnstileSiteKey || state.turnstileWidget !== null) return;
    try {
      await loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
      state.turnstileWidget = window.turnstile.render(container, {
        sitekey: state.config.turnstileSiteKey,
        theme: document.body.dataset.theme === "dark" ? "dark" : "light",
        callback: token => state.turnstileToken = token,
        "expired-callback": () => state.turnstileToken = "",
        "error-callback": () => state.turnstileToken = ""
      });
    } catch {
      showStatus("Security verification could not load. Refresh and try again.", "error");
    }
  }

  function resetTurnstile() {
    state.turnstileToken = "";
    try {
      if (state.turnstileWidget !== null) window.turnstile?.reset(state.turnstileWidget);
    } catch {}
  }

  function friendlyError(message = "", status = 0) {
    const text = String(message || "");
    if (/D1 binding|database is not configured/i.test(text)) return "Account database is not connected yet.";
    if (/turnstile/i.test(text)) return "Security verification failed. Refresh the page and try again.";
    if (/incorrect|invalid credentials/i.test(text)) return "Email or password is incorrect.";
    if (/failed to fetch|network/i.test(text)) return "Network problem. Check your connection and try again.";
    if (status === 429) return "Too many attempts. Wait a moment and try again.";
    return text || "Authentication could not be completed.";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function initials(name = "") {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "MZ";
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
  }

  window.NEXUS_AUTH_UI = {
    open,
    close,
    getUser: () => state.account?.user || null,
    getTurnstileToken: () => state.turnstileToken,
    resetTurnstile,
    refresh: async () => {
      await loadAccount();
      renderLaunchers();
      renderModal();
    }
  };
})();
