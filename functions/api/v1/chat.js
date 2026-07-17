import { json, sha256 } from "../../_shared/auth.js";

function corsHeaders(request, env = {}) {
  const origin = request.headers.get("Origin") || "";
  const configured = String(env.ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
  const sameOrigin = origin && origin === new URL(request.url).origin;
  const allowed = sameOrigin || configured.includes(origin);
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
  const CORS = corsHeaders(request, env);
  try {
    if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503, CORS);
    if (!env.AI) return json({ error: 'Workers AI binding "AI" is not configured.' }, 503, CORS);

    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS developer_api_keys(
        id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,scopes TEXT NOT NULL DEFAULT 'chat',
        quota_daily INTEGER NOT NULL DEFAULT 100,day_key TEXT NOT NULL DEFAULT '',
        day_count INTEGER NOT NULL DEFAULT 0,usage_count INTEGER NOT NULL DEFAULT 0,
        revoked INTEGER NOT NULL DEFAULT 0,last_used_at INTEGER,created_at INTEGER NOT NULL
      )`
    ).run();

    const authorization = request.headers.get("Authorization") || "";
    const secret = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!secret.startsWith("nx_live_")) {
      return json({ error: "A valid Bearer API key is required." }, 401, CORS);
    }

    const key = await env.DB.prepare(
      `SELECT id,user_id AS userId,quota_daily AS quotaDaily,day_key AS dayKey,
              day_count AS dayCount,scopes,revoked
       FROM developer_api_keys WHERE key_hash=?`
    ).bind(await sha256(secret)).first();

    if (!key || key.revoked) return json({ error: "API key is invalid or revoked." }, 401, CORS);
    if (!String(key.scopes || "").split(",").includes("chat")) {
      return json({ error: "This API key does not have the chat scope." }, 403, CORS);
    }

    const today = new Date().toISOString().slice(0, 10);
    const count = key.dayKey === today ? Number(key.dayCount || 0) : 0;
    if (count >= Number(key.quotaDaily || 100)) {
      return json({ error: "Daily API quota exceeded." }, 429, {
        ...CORS,
        "Retry-After": "3600"
      });
    }

    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body.messages)
      ? body.messages.slice(-30).map(item => ({
          role: ["system", "assistant", "user"].includes(item?.role) ? item.role : "user",
          content: String(item?.content || "").slice(0, 12000)
        }))
      : [{ role: "user", content: String(body.prompt || "").slice(0, 12000) }];

    if (!messages.some(item => item.content.trim())) {
      return json({ error: "messages or prompt is required." }, 400, CORS);
    }

    const model = String(body.model || "@cf/qwen/qwen3-30b-a3b-fp8").slice(0, 150);
    const result = await env.AI.run(model, {
      messages,
      stream: false,
      max_tokens: Math.max(64, Math.min(Number(body.max_tokens || 800), 1800)),
      temperature: Math.max(0, Math.min(Number(body.temperature ?? 0.7), 2))
    });

    const content = extractText(result);
    if (!content) return json({ error: "AI returned an empty response." }, 502, CORS);

    await env.DB.prepare(
      `UPDATE developer_api_keys
       SET day_key=?,day_count=?,usage_count=usage_count+1,last_used_at=?
       WHERE id=?`
    ).bind(today, count + 1, Date.now(), key.id).run();

    return json({
      id: `chatcmpl_${crypto.randomUUID().replaceAll("-", "")}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }],
      usage: {
        prompt_chars: messages.reduce((sum, item) => sum + item.content.length, 0),
        completion_chars: content.length
      }
    }, 200, CORS);
  } catch (error) {
    return json({ error: error.message || "Public chat API failed." }, 500, CORS);
  }
}

function extractText(result) {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const direct = result.response || result.result || result.answer || result.output_text || result.text;
  if (typeof direct === "string") return direct.trim();
  if (Array.isArray(result.choices)) {
    return result.choices
      .map(choice => choice?.message?.content || choice?.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}
