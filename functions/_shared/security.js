import { getUser, sha256 } from "./auth.js";

const memoryRateLimits = new Map();

export async function getSetting(env, key, fallback = "") {
  if (!env.DB) return fallback;
  try {
    return (await env.DB.prepare("SELECT value FROM admin_settings WHERE key=?").bind(key).first())?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function requireAdmin(request, env) {
  const user = await getUser(request, env);
  const token = request.headers.get("X-Admin-Token") || "";
  const tokenAllowed = Boolean(env.ADMIN_TOKEN && constantTimeEqual(token, env.ADMIN_TOKEN));
  if (user?.role !== "admin" && !tokenAllowed) {
    const error = new Error("Administrator access is required.");
    error.status = 403;
    throw error;
  }
  return user;
}

export async function enforceRateLimit(request, env, scope, limit = 20, windowSeconds = 60) {
  const user = await getUser(request, env).catch(() => null);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const identity = await sha256(user?.id ? `user:${user.id}` : `ip:${ip}`);
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `rate:${scope}:${identity}:${bucket}`;

  if (env.RATE_LIMIT) {
    const current = Number(await env.RATE_LIMIT.get(key)) || 0;
    if (current >= limit) throw rateLimitError(windowSeconds);
    await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: Math.max(120, windowSeconds * 2) });
    return;
  }

  if (env.DB) {
    try {
      await env.DB.prepare(`
        INSERT INTO api_rate_limits(key,count,expires_at)
        VALUES(?,1,?)
        ON CONFLICT(key) DO UPDATE SET count=count+1
      `).bind(key, (bucket + 2) * windowSeconds * 1000).run();
      const row = await env.DB.prepare("SELECT count FROM api_rate_limits WHERE key=?").bind(key).first();
      if (Number(row?.count || 0) > limit) throw rateLimitError(windowSeconds);
      if (Math.random() < 0.02) {
        await env.DB.prepare("DELETE FROM api_rate_limits WHERE expires_at<?").bind(Date.now()).run().catch(() => {});
      }
      return;
    } catch (error) {
      if (error?.status === 429) throw error;
      console.warn("D1 rate-limit fallback unavailable; using isolate memory.", error?.message || error);
      return enforceMemoryRateLimit(key, limit, windowSeconds);
    }
  }

  // Best-effort fallback for previews and simple deployments without KV/D1.
  // Production deployments should still bind RATE_LIMIT or DB for distributed enforcement.
  return enforceMemoryRateLimit(key, limit, windowSeconds);
}


export function isGuestAiAllowed(env) {
  if (env.REQUIRE_SIGN_IN_FOR_AI === "true") return false;
  if (env.ALLOW_GUEST_AI === "false") return false;
  return true;
}

export async function enforceChatAccess(request, env, estimated = 0) {
  const user = await getUser(request, env);
  const maintenance = await getSetting(env, "maintenance", "false");
  if (maintenance === "true" && user?.role !== "admin") {
    const error = new Error("AI NEXUS is temporarily in maintenance mode.");
    error.status = 503;
    throw error;
  }

  if (!user) {
    if (isGuestAiAllowed(env)) {
      return {
        user: null,
        guest: true,
        plan: "guest",
        limit: Number(env.GUEST_DAILY_AI_UNITS || 30000),
        hourlyLimit: Number(env.GUEST_HOURLY_MESSAGES || 30)
      };
    }
    const error = new Error("Sign in is required to use AI services.");
    error.status = 401;
    throw error;
  }

  if (!env.DB || user.accessIdentity) return { user };
  const row = await env.DB.prepare(
    "SELECT blocked,email_verified AS emailVerified,token_limit AS tokenLimit FROM users WHERE id=?"
  ).bind(user.id).first().catch(() => null);
  if (row?.blocked) {
    const error = new Error("This account has been blocked by an administrator.");
    error.status = 403;
    throw error;
  }
  if (env.REQUIRE_EMAIL_VERIFICATION === "true" && row && !row.emailVerified) {
    const error = new Error("Verify your email before using AI services.");
    error.status = 403;
    throw error;
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const usage = await env.DB.prepare(
    "SELECT COALESCE(SUM(input_chars+output_chars),0) AS total FROM usage WHERE user_id=? AND created_at>=?"
  ).bind(user.id, start.getTime()).first();
  const defaults = { free: 50000, student: 250000, plus: 500000, pro: 2500000, developer: 1000000 };
  const defaultLimit = Number(await getSetting(env, "default_token_limit", String(defaults[user.plan] || 50000)));
  const limit = Number(row?.tokenLimit || defaultLimit);
  if (Number(usage?.total || 0) + estimated > limit) {
    const error = new Error(`Daily AI limit reached (${limit.toLocaleString()} units).`);
    error.status = 429;
    throw error;
  }

  const hourlyDefaults = { free: 30, student: 150, plus: 250, pro: 500, developer: 1000 };
  const hourlyLimit = Number(await getSetting(env, `hourly_limit_${user.plan}`, String(hourlyDefaults[user.plan] || 30)));
  const hourly = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM usage WHERE user_id=? AND created_at>=?"
  ).bind(user.id, Date.now() - 3600000).first().catch(() => ({ total: 0 }));
  if (Number(hourly?.total || 0) >= hourlyLimit) {
    const error = new Error(`Hourly message limit reached (${hourlyLimit}).`);
    error.status = 429;
    throw error;
  }
  return { user, usage: Number(usage?.total || 0), limit, hourlyLimit };
}

export async function logError(env, { route, message, stack, userId, ip }) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "INSERT INTO error_logs(id,user_id,route,message,stack,ip,created_at) VALUES(?,?,?,?,?,?,?)"
    ).bind(
      crypto.randomUUID(), userId || null, route || "", String(message || "").slice(0, 2000),
      String(stack || "").slice(0, 8000), ip || "", Date.now()
    ).run();
  } catch {}
}

export async function recordLogin(env, request, userId, success, reason = "") {
  if (!env.DB) return;
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const country = request.headers.get("CF-IPCountry") || "";
  const device = request.headers.get("User-Agent") || "";
  let suspicious = 0;
  if (success) {
    const previous = await env.DB.prepare(
      "SELECT ip,country FROM login_events WHERE user_id=? AND success=1 ORDER BY created_at DESC LIMIT 1"
    ).bind(userId).first().catch(() => null);
    suspicious = previous && previous.ip !== ip && previous.country && country && previous.country !== country ? 1 : 0;
  }
  try {
    await env.DB.prepare(
      "INSERT INTO login_events(id,user_id,ip,country,device,success,reason,suspicious,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    ).bind(
      crypto.randomUUID(), userId || null, ip, country, device.slice(0, 500), success ? 1 : 0,
      reason.slice(0, 500), suspicious, Date.now()
    ).run();
  } catch {}
  return { suspicious, ip, country, device };
}

function enforceMemoryRateLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const expiresAt = now + windowSeconds * 1000;
  const existing = memoryRateLimits.get(key);
  const record = !existing || existing.expiresAt <= now
    ? { count: 0, expiresAt }
    : existing;
  record.count += 1;
  memoryRateLimits.set(key, record);
  if (record.count > limit) throw rateLimitError(windowSeconds);
  if (memoryRateLimits.size > 2000) {
    for (const [storedKey, value] of memoryRateLimits) {
      if (value.expiresAt <= now) memoryRateLimits.delete(storedKey);
    }
  }
}

function rateLimitError(windowSeconds) {
  const error = new Error(`Too many requests. Try again in about ${windowSeconds} seconds.`);
  error.status = 429;
  return error;
}

function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  return mismatch === 0;
}
