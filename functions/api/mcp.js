import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "mcp-connector", 20, 60);
    const raw = await request.text();
    if (raw.length > 100000) return json({ error: "Connector request is too large." }, 413);
    let body;
    try { body = JSON.parse(raw || "{}"); }
    catch { return json({ error: "Request body must be valid JSON." }, 400); }
    let url;
    try { url = new URL(String(body.url || "")); }
    catch { return json({ error: "A valid HTTPS tool URL is required." }, 400); }
    if (url.protocol !== "https:") return json({ error: "Only HTTPS connector URLs are allowed." }, 400);

    const allowed = String(env.MCP_ALLOWED_HOSTS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!allowed.length || !allowed.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      return json({ error: "This connector host is not in MCP_ALLOWED_HOSTS." }, 403);
    }

    const headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (env.MCP_GATEWAY_TOKEN) headers.Authorization = `Bearer ${env.MCP_GATEWAY_TOKEN}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        method: "POST", headers, redirect: "error", signal: controller.signal,
        body: JSON.stringify({ input: body.input || {}, user: { id: user.id, email: user.email } })
      });
      const text = await readLimited(response, 500000);
      let data;
      try { data = JSON.parse(text); }
      catch { data = { text }; }
      return response.ok
        ? json({ ok: true, status: response.status, data })
        : json({ error: data.error || `Connector failed (${response.status}).`, data }, response.status);
    } catch (error) {
      return json({ error: error.name === "AbortError" ? "Connector timed out." : error.message }, error.status || 502);
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}

async function readLimited(response, maximum) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maximum) throw Object.assign(new Error("Connector response is too large."), { status: 413 });
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw Object.assign(new Error("Connector response is too large."), { status: 413 });
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
