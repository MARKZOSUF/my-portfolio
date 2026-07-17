const encoder = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers }
  });
}

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function sessionCookie(token, maxAge = 2592000) {
  return `nexus_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return "nexus_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 32) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(value => parseInt(value, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function getUser(request, env) {
  const accessEmail = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (accessEmail) return { id: `access:${accessEmail}`, email: accessEmail, displayName: accessEmail.split("@")[0], role: "user", plan: "free", accessIdentity: true };
  if (!env.DB) return null;
  const token = getCookie(request, "nexus_session");
  if (!token) return null;
  return await env.DB.prepare(`SELECT u.id,u.email,u.display_name AS displayName,u.role,CASE WHEN u.plan_expires_at>0 AND u.plan_expires_at<? THEN 'free' ELSE u.plan END AS plan FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).bind(Date.now(), await sha256(token), Date.now()).first();
}

export async function requireUser(request, env) {
  const user = await getUser(request, env);
  if (!user) { const error = new Error("Sign in is required."); error.status = 401; throw error; }
  return user;
}

export async function verifyTurnstile(request, env, token) {
  const required = env.REQUIRE_TURNSTILE === "true";
  const configured = Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
  // Do not lock every login/chat request when the dashboard variables are incomplete.
  // Protection becomes active only after both keys are configured and REQUIRE_TURNSTILE=true.
  if (!required || !configured) return true;
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const result = await response.json();
  if (!result.success) return false;
  const expectedHost = String(env.PUBLIC_HOSTNAME || "").trim().toLowerCase();
  return !expectedHost || String(result.hostname || "").toLowerCase() === expectedHost;
}

export async function logUsage(env, data) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`INSERT INTO usage(id,user_id,ip,feature,model,input_chars,output_chars,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), data.userId || null, data.ip || null, data.feature || "unknown", data.model || null, data.inputChars || 0, data.outputChars || 0, Date.now()).run();
  } catch {}
}
