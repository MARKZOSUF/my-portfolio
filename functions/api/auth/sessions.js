import { json, requireUser } from "../../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  const user = await requireUser(request, env);
  const result = await env.DB.prepare(
    "SELECT id,created_at AS createdAt,expires_at AS expiresAt,ip,country,device FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC"
  ).bind(user.id, Date.now()).all();
  return json({ sessions: result.results || [] });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare("DELETE FROM sessions WHERE id=? AND user_id=?")
    .bind(String(body.sessionId || ""), user.id).run();
  return json({ revoked: true });
}
