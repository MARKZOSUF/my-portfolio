import { json } from "../_shared/auth.js";
import { enforceChatAccess, enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  try {
    await enforceRateLimit(request, env, "image-edit", 4, 300);
    await enforceChatAccess(request, env, 1000);
    const raw = await request.text();
    if (raw.length > 7_500_000) return json({ error: "Image request is too large." }, 413);
    const body = JSON.parse(raw || "{}");
    const image = String(body.image || "");
    const prompt = String(body.prompt || "").trim().slice(0, 3000);
    if (!image.startsWith("data:image/") || !prompt) return json({ error: "Image and prompt are required." }, 400);
    if (!env.IMAGE_EDIT_API_URL) return json({ error: "AI image editing is not configured. Local tools still work." }, 503);
    const response = await fetch(env.IMAGE_EDIT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(env.IMAGE_EDIT_API_KEY ? { Authorization: `Bearer ${env.IMAGE_EDIT_API_KEY}` } : {}) },
      body: JSON.stringify({ image, prompt })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: data.error || data.message || "Image editor failed." }, response.status);
    return json({ dataURI: data.dataURI || data.image || data.output?.image || "", result: data.result || data.message || "" });
  } catch (error) {
    return json({ error: error.message || "Image edit failed." }, error.status || 500);
  }
}
