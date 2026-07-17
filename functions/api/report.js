import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "abuse-report", 5, 3600);
    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason || "").trim().slice(0, 500);
    const content = String(body.content || "").slice(0, 12000);
    if (!reason || !content) return json({ error: "Reason and content are required." }, 400);
    await env.DB.prepare(
      "INSERT INTO abuse_reports(id,user_id,chat_id,reason,content,status,created_at) VALUES(?,?,?,?,?,'open',?)"
    ).bind(crypto.randomUUID(), user.id, String(body.chatId || "").slice(0, 100), reason, content, Date.now()).run();
    return json({ submitted: true }, 201);
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}
