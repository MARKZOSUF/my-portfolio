import { json, clearSessionCookie, getCookie, sha256 } from "../../_shared/auth.js";
export async function onRequestPost({ request, env }) {
  const token = getCookie(request, "nexus_session");
  if (token && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
  return json({ message: "Signed out." }, 200, { "Set-Cookie": clearSessionCookie() });
}
