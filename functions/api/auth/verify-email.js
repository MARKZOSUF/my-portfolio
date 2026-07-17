import { json, sha256 } from "../../_shared/auth.js";
import { enforceRateLimit } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "auth-email-verify", 10, 900);
  const body = await request.json().catch(() => ({}));
  const row = await env.DB.prepare(
    "SELECT id,user_id AS userId FROM email_verification_tokens WHERE token_hash=? AND expires_at>? AND used=0"
  ).bind(await sha256(String(body.token || "")), Date.now()).first();
  if (!row) return json({ error: "Verification link is invalid or expired." }, 400);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET email_verified=1 WHERE id=?").bind(row.userId),
    env.DB.prepare("UPDATE email_verification_tokens SET used=1 WHERE id=?").bind(row.id)
  ]);
  return json({ message: "Email verified." });
}
