import { json, sha256, hashPassword, randomHex } from "../../_shared/auth.js";
import { enforceRateLimit } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "auth-reset-complete", 5, 900);
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
  const row = await env.DB.prepare(
    "SELECT id,user_id AS userId FROM password_reset_tokens WHERE token_hash=? AND expires_at>? AND used=0"
  ).bind(await sha256(token), Date.now()).first();
  if (!row) return json({ error: "Reset link is invalid or expired." }, 400);
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash=?,salt=? WHERE id=?").bind(hash, salt, row.userId),
    env.DB.prepare("UPDATE password_reset_tokens SET used=1 WHERE id=?").bind(row.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(row.userId)
  ]);
  return json({ message: "Password changed. Sign in again." });
}
