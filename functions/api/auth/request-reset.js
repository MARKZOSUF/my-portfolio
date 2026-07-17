import { getUser, json, randomHex, sha256, verifyTurnstile } from "../../_shared/auth.js";
import { sendMail } from "../../_shared/mail.js";
import { enforceRateLimit } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "auth-reset-request", 3, 900);
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const currentUser = await getUser(request, env);
  if (currentUser?.email !== email && !(await verifyTurnstile(request, env, body.turnstileToken))) {
    return json({ error: "Security verification failed." }, 400);
  }
  const user = await env.DB.prepare(
    "SELECT id,email,display_name AS displayName FROM users WHERE email=?"
  ).bind(email).first();
  if (user && env.RESEND_API_KEY && env.EMAIL_FROM) {
    await env.DB.prepare("UPDATE password_reset_tokens SET used=1 WHERE user_id=? AND used=0").bind(user.id).run();
    const token = randomHex(32);
    const origin = new URL(request.url).origin;
    const link = `${origin}/?reset=${token}`;
    await env.DB.prepare(
      "INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at,used,created_at) VALUES(?,?,?,?,0,?)"
    ).bind(crypto.randomUUID(), user.id, await sha256(token), Date.now() + 3600000, Date.now()).run();
    await sendMail(env, {
      to: user.email,
      subject: "Reset your AI NEXUS password",
      html: `<p>Hello,</p><p><a href="${link}">Reset your password</a>. This link expires in one hour.</p>`,
      text: `Reset password: ${link}`
    }).catch(() => {});
  }
  return json({ message: "If the account exists and email is configured, a reset link has been sent." });
}
