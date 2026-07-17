import { json, getUser, logUsage } from "../_shared/auth.js";
import { enforceChatAccess, enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  if (!env.AI) return json({ error: 'Workers AI binding "AI" is not configured.' }, 503);
  try {
    await enforceRateLimit(request, env, "image-generation", 4, 300);
    const raw = await request.text();
    if (raw.length > 10000) return json({ error: "Request is too large." }, 413);
    const body = JSON.parse(raw || "{}");
    const prompt = String(body.prompt || "").trim().slice(0, 2000);
    if (!prompt) return json({ error: "Image prompt is required." }, 400);
    await enforceChatAccess(request, env, Math.ceil(prompt.length / 4));
    const width = [512, 768, 1024].includes(Number(body.width)) ? Number(body.width) : 768;
    const height = [512, 768, 1024].includes(Number(body.height)) ? Number(body.height) : 768;
    const response = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt, width, height, num_steps: 4, seed: Math.floor(Math.random() * 2147483647)
    });
    if (!response?.image) return json({ error: "Image model returned no image." }, 502);
    const user = await getUser(request, env);
    await logUsage(env, {
      userId: user?.id, ip: request.headers.get("CF-Connecting-IP"), feature: "image-generation",
      model: "@cf/black-forest-labs/flux-1-schnell", inputChars: prompt.length, outputChars: response.image.length
    });
    return json({ dataURI: `data:image/jpeg;base64,${response.image}` });
  } catch (error) {
    return json({ error: error.message || "Image generation failed." }, error.status || 500);
  }
}
