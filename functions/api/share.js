import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  await enforceRateLimit(request, env, "share-read", 30, 60);
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) return json({ error: "A valid share token is required." }, 400);
  const row = await env.DB.prepare("SELECT chat_json AS chat FROM shares WHERE id=? AND expires_at>?").bind(token, Date.now()).first();
  if (!row) return json({ error: "Share link not found or expired." }, 404);
  return json({ chat: JSON.parse(row.chat) });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "share-create", 10, 3600);
    const raw = await request.text();
    if (raw.length > 1_000_000) return json({ error: "Conversation is too large to share." }, 413);
    let body;
    try { body = JSON.parse(raw || "{}"); }
    catch { return json({ error: "Request body must be valid JSON." }, 400); }
    if (!body.chat?.messages?.length) return json({ error: "Chat is empty." }, 400);
    const id = crypto.randomUUID().replaceAll("-", "");
    const expiresAt = Date.now() + 30 * 86400000;
    const chat = {
      title: String(body.chat.title || "Shared conversation").slice(0, 120),
      messages: body.chat.messages.slice(0, 100).map(message => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || "").slice(0, 12000),
        createdAt: Number(message.createdAt || Date.now())
      }))
    };
    await env.DB.prepare(
      "INSERT INTO shares(id,user_id,chat_json,created_at,expires_at) VALUES(?,?,?,?,?)"
    ).bind(id, user.id, JSON.stringify(chat), Date.now(), expiresAt).run();
    const url = new URL(request.url);
    return json({ token: id, url: `${url.origin}/?share=${id}`, expiresAt });
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    const token = new URL(request.url).searchParams.get("token") || "";
    await env.DB.prepare("DELETE FROM shares WHERE id=? AND user_id=?").bind(token, user.id).run();
    return json({ deleted: true });
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}
