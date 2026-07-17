import { json, hashPassword, randomHex, sha256, sessionCookie, verifyTurnstile } from "../../_shared/auth.js";
import { enforceRateLimit, recordLogin } from "../../_shared/security.js";
import { sendMail } from "../../_shared/mail.js";
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "auth-login", 10, 300);
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!(await verifyTurnstile(request, env, body.turnstileToken))) return json({ error: "Security verification failed." }, 400);
  const user = await env.DB.prepare(`SELECT id,email,password_hash AS passwordHash,salt,display_name AS displayName,role,CASE WHEN plan_expires_at>0 AND plan_expires_at<? THEN 'free' ELSE plan END AS plan,blocked,email_verified AS emailVerified FROM users WHERE email=?`).bind(Date.now(),email).first();
  if(!user||await hashPassword(password,user.salt)!==user.passwordHash){await recordLogin(env,request,user?.id||null,false,"invalid_credentials");return json({error:"Email or password is incorrect."},401)}
  if(user.blocked)return json({error:"This account is blocked."},403);
  if(env.REQUIRE_EMAIL_VERIFICATION==="true"&&!user.emailVerified)return json({error:"Verify your email before signing in."},403);
  const now = Date.now(), token = randomHex(32), evt = await recordLogin(env,request,user.id,true,"");
  await env.DB.prepare(`INSERT INTO sessions(id,user_id,token_hash,ip,country,device,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(
    crypto.randomUUID(), user.id, await sha256(token), evt?.ip || "", evt?.country || "", String(evt?.device || "").slice(0, 500),
    now + 30 * 86400000, now
  ).run();
  if(evt?.suspicious&&env.RESEND_API_KEY&&env.EMAIL_FROM)await sendMail(env,{to:user.email,subject:"New AI NEXUS sign-in",html:`<p>New sign-in from ${evt.country||"unknown"} (${evt.ip||"unknown IP"}).</p>`,text:`New sign-in: ${evt.country} ${evt.ip}`}).catch(()=>{});delete user.passwordHash;delete user.salt;delete user.blocked;delete user.emailVerified;return json({message:"Signed in.",user},200,{"Set-Cookie":sessionCookie(token)});
}
