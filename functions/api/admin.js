import { json } from "../_shared/auth.js";
import { requireAdmin } from "../_shared/security.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    await requireAdmin(request, env);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const result = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS count FROM users"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM chats"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM files"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM shares"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM feedback"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM usage WHERE created_at>=?").bind(today.getTime()),
      env.DB.prepare("SELECT feature,COUNT(*) AS count FROM usage GROUP BY feature ORDER BY count DESC LIMIT 12")
    ]);
    return json({
      users: result[0].results?.[0]?.count || 0,
      chats: result[1].results?.[0]?.count || 0,
      files: result[2].results?.[0]?.count || 0,
      shares: result[3].results?.[0]?.count || 0,
      feedback: result[4].results?.[0]?.count || 0,
      requestsToday: result[5].results?.[0]?.count || 0,
      byFeature: result[6].results || []
    });
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}
