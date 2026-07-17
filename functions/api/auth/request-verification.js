import { getUser, json, randomHex, sha256, verifyTurnstile } from "../../_shared/auth.js";
import { sendMail } from "../../_shared/mail.js";
import { enforceRateLimit } from "../../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "auth-verification-request", 3, 900);
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const currentUser = await getUser(request, env);
  if (currentUser?.email !== email && !(await verifyTurnstile(request, env, body.turnstileToken))) {
    return json({ error: "Security verification failed." }, 400);
  }
  const user = await env.DB.prepare(
    "SELECT id,email,email_verified AS verified FROM users WHERE email=?"
  ).bind(email).first();
  if (user && !user.verified && env.RESEND_API_KEY && env.EMAIL_FROM) {
    await env.DB.prepare("UPDATE email_verification_tokens SET used=1 WHERE user_id=? AND used=0").bind(user.id).run();
    const token = randomHex(32);
    const origin = new URL(request.url).origin;
    const link = `${origin}/?verify=${token}`;
    await env.DB.prepare(
      "INSERT INTO email_verification_tokens(id,user_id,token_hash,expires_at,used,created_at) VALUES(?,?,?,?,0,?)"
    ).bind(crypto.randomUUID(), user.id, await sha256(token), Date.now() + 86400000, Date.now()).run();
    await sendMail(env, {
      to: user.email,
      subject: "Verify your AI NEXUS email",
      html: `<p><a href="${link}">Verify your email</a>. This link expires in 24 hours.</p>`,
      text: `Verify email: ${link}`
    }).catch(() => {});
  }
  return json({ message: "If verification is needed and email is configured, a link has been sent." });
}
