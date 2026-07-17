import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "feedback", 10, 3600);
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || "").trim().slice(0, 4000);
    const rating = Number(body.rating || 0);
    if (!message || ![-1, 0, 1, 2, 3, 4, 5].includes(rating)) return json({ error: "Valid feedback is required." }, 400);
    await env.DB.prepare("INSERT INTO feedback(id,user_id,rating,message,created_at) VALUES(?,?,?,?,?)")
      .bind(crypto.randomUUID(), user.id, rating, message, Date.now()).run();
    return json({ saved: true }, 201);
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}
