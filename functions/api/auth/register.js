import { json, hashPassword, randomHex, sha256, sessionCookie, verifyTurnstile } from "../../_shared/auth.js";
import { sendMail } from "../../_shared/mail.js";
import { enforceRateLimit } from "../../_shared/security.js";
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "auth-register", 5, 300);
  const body = await request.json().catch(() => ({}));
  const displayName = String(body.displayName || "").trim().slice(0, 60);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
  const password = String(body.password || "");
  if (!(await verifyTurnstile(request, env, body.turnstileToken))) return json({ error: "Security verification failed." }, 400);
  if (!displayName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) return json({ error: "Enter a valid name, email, and password of at least 8 characters." }, 400);
  if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first()) return json({ error: "An account with this email already exists." }, 409);
  const id = crypto.randomUUID(), salt = randomHex(16), createdAt = Date.now();
  await env.DB.prepare(`INSERT INTO users(id,email,password_hash,salt,display_name,role,plan,email_verified,blocked,token_limit,created_at) VALUES(?,?,?,?,?,'user','free',0,0,0,?)`).bind(id,email,await hashPassword(password,salt),salt,displayName,createdAt).run();
  if(env.RESEND_API_KEY&&env.EMAIL_FROM){const vt=randomHex(32),vh=await sha256(vt),origin=new URL(request.url).origin;await env.DB.prepare("INSERT INTO email_verification_tokens(id,user_id,token_hash,expires_at,used,created_at) VALUES(?,?,?,?,0,?)").bind(crypto.randomUUID(),id,vh,Date.now()+86400000,Date.now()).run();await sendMail(env,{to:email,subject:"Verify your AI NEXUS email",html:`<p>Hello ${escapeHtml(displayName)},</p><p><a href="${origin}/?verify=${vt}">Verify your email</a>.</p>`,text:`Verify email: ${origin}/?verify=${vt}`}).catch(()=>{})}
  const token = randomHex(32);
  await env.DB.prepare(`INSERT INTO sessions(id,user_id,token_hash,ip,country,device,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(
    crypto.randomUUID(), id, await sha256(token), request.headers.get("CF-Connecting-IP") || "",
    request.headers.get("CF-IPCountry") || "", (request.headers.get("User-Agent") || "").slice(0, 500),
    createdAt + 30 * 86400000, createdAt
  ).run();
  return json({ message: "Account created.", user: { id, email, displayName, role: "user", plan: "free" } }, 201, { "Set-Cookie": sessionCookie(token) });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
