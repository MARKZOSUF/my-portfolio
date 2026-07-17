
import { json, getUser, logUsage } from "../_shared/auth.js";
import { enforceChatAccess, enforceRateLimit } from "../_shared/security.js";

const PLAN_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

export async function onRequestPost({ request, env }) {
  try {
  await enforceRateLimit(request, env, "media", 5, 300);
  const body = await request.json().catch(() => ({}));
  const type = body.type === "music" ? "music" : "video";
  const prompt = String(body.prompt || "").trim().slice(0, 4000);
  if (!prompt) return json({ error: "A media prompt is required." }, 400);
  await enforceChatAccess(request, env, Math.ceil(prompt.length / 4));

  const providerUrl = type === "video" ? env.VIDEO_API_URL : env.MUSIC_API_URL;
  const providerKey = type === "video" ? env.VIDEO_API_KEY : env.MUSIC_API_KEY;

  if (providerUrl) {
    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(providerKey ? { "Authorization": `Bearer ${providerKey}` } : {})
      },
      body: JSON.stringify({
        prompt,
        style: String(body.style || "").slice(0, 500),
        duration: Number(body.duration || (type === "video" ? 15 : 60)),
        aspectRatio: String(body.aspectRatio || "16:9"),
        genre: String(body.genre || "").slice(0, 200)
      })
    });

    const text = (await response.text()).slice(0, 500000);
    let data;
    try { data = JSON.parse(text); }
    catch { data = { result: text }; }

    if (!response.ok) {
      return json({ error: data.error || data.message || `Configured ${type} provider failed.` }, response.status);
    }

    const url = data.url || data.video_url || data.audio_url || data.output?.url || data.data?.url || "";
    await recordUsage(request, env, `${type}-render`, providerUrl, prompt.length);
    return json({ mode: "render", url, result: data.result || data.message || "", raw: data });
  }

  if (!env.AI) {
    return json({ error: `Configure Workers AI or add ${type === "video" ? "VIDEO_API_URL" : "MUSIC_API_URL"}.` }, 503);
  }

  const system = type === "video"
    ? `Create a professional AI video production plan. Include title, hook, scene-by-scene storyboard, shots, camera movement, lighting, narration, on-screen text, sound design, negative prompts and final generation prompts. Use Markdown.`
    : `Create a professional AI music production plan. Include genre, mood, BPM, key, instrumentation, structure, vocal direction, safe original lyric concept, mixing direction and final audio-generation prompt. Use Markdown.`;

  const userText = type === "video"
    ? `Idea: ${prompt}\nStyle: ${body.style || "best fit"}\nAspect ratio: ${body.aspectRatio || "16:9"}\nDuration: ${body.duration || 15} seconds`
    : `Idea: ${prompt}\nStyle: ${body.style || "best fit"}\nGenre: ${body.genre || "best fit"}\nDuration: ${body.duration || 60} seconds`;

  const result = await env.AI.run(PLAN_MODEL, {
    messages: [{ role: "system", content: system }, { role: "user", content: userText }],
    max_tokens: 1800,
    temperature: .72
  });

  const answer = result?.response || result?.result || "No production plan was generated.";
  await recordUsage(request, env, `${type}-plan`, PLAN_MODEL, prompt.length, answer.length);

  return json({ mode: "plan", result: answer, providerRequiredForRendering: true });
  } catch (error) {
    return json({ error: error.message || "Media request failed." }, error.status || 500);
  }
}

async function recordUsage(request, env, feature, model, inputChars, outputChars = 0) {
  const user = await getUser(request, env);
  await logUsage(env, {
    userId: user?.id,
    ip: request.headers.get("CF-Connecting-IP"),
    feature, model, inputChars, outputChars
  });
}
