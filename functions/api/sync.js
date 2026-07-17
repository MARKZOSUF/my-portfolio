import { json, requireUser } from "../_shared/auth.js";
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  const user = await requireUser(request, env);
  const result = await env.DB.prepare(`SELECT data_json AS data FROM chats WHERE user_id=? ORDER BY updated_at DESC LIMIT 100`).bind(user.id).all();
  return json({ chats: (result.results || []).map(row => JSON.parse(row.data)) });
}
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  const user = await requireUser(request, env);
  const body = await request.json().catch(() => ({}));
  if (body.action === "delete" && body.chatId) {
    await env.DB.prepare("DELETE FROM chats WHERE id=? AND user_id=?").bind(body.chatId, user.id).run();
    return json({ deleted: true });
  }
  if (body.action !== "save" || !Array.isArray(body.chats)) return json({ error: "Invalid sync action." }, 400);
  const chats = body.chats.slice(0, 100);
  for (const chat of chats) {
    if (!chat?.id) continue;
    const data = JSON.stringify(chat).slice(0, 900000);
    await env.DB.prepare(`INSERT INTO chats(id,user_id,title,folder,pinned,archived,data_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,folder=excluded.folder,pinned=excluded.pinned,archived=excluded.archived,data_json=excluded.data_json,updated_at=excluded.updated_at WHERE user_id=excluded.user_id`).bind(chat.id,user.id,String(chat.title||"Conversation").slice(0,120),String(chat.folder||"General").slice(0,60),chat.pinned?1:0,chat.archived?1:0,data,Number(chat.createdAt||Date.now()),Number(chat.updatedAt||Date.now())).run();
  }
  return json({ saved: chats.length });
}
