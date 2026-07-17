import { json, getUser, logUsage, verifyTurnstile } from "../_shared/auth.js";
import { enforceChatAccess, enforceRateLimit, logError } from "../_shared/security.js";
import { collectRealtimeContext, publicSearch } from "../_shared/realtime-tools.js";

const FREE_CF_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const CF_FALLBACK_MODELS = [FREE_CF_MODEL, "@cf/meta/llama-3.2-3b-instruct", "@cf/meta/llama-3.2-1b-instruct"];
const CF_MODELS = {
  fast: "@cf/meta/llama-3.2-1b-instruct",
  smart: FREE_CF_MODEL,
  coding: FREE_CF_MODEL
};
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MODERATION_MODEL = "@cf/meta/llama-guard-3-8b";

const TOOL_PROMPTS = {
  "ask-anything": "You are MARKZOSUF AI NEXUS, a capable general AI assistant. Give accurate, useful, well-structured answers. For greetings and casual conversation, respond naturally and briefly; never output code unless the user asks for code.",
  "deep-reasoning": "Analyze carefully, verify assumptions, state uncertainty, and provide a concise educational reasoning summary rather than private internal deliberation.",
  "code-explainer": "Explain code purpose, important lines, control flow, inputs, outputs, edge cases, and complexity. Use fenced code blocks.",
  "bug-finder": "Find bugs, explain causes, provide corrected code, and include a short test plan. Never invent execution results.",
  "project-builder": "Create a practical project plan with architecture, stack, database, APIs, folder structure, milestones, tests, and deployment.",
  "study-tutor": "Teach from fundamentals with examples, analogies, common mistakes, and quick revision.",
  "quiz-maker": "Create questions first and a separate answer key.",
  "summarizer": "Summarize faithfully and preserve important facts.",
  "image-analysis": "Describe only what is visible or reasonably inferable. Separate facts from uncertainty and do not guess identities.",
  "resume-helper": "Improve wording honestly. Never invent qualifications, marks, or achievements.",
  "email-writer": "Write a polished email with subject, greeting, body, and closing.",
  "translator": "Translate accurately while preserving meaning, tone, and formatting.",
  "grammar-fixer": "Return improved text first, then explain important corrections.",
  "sql-generator": "Generate safe SQL, state assumptions, and explain the query.",
  "regex-helper": "Create or explain regex with matching and non-matching examples.",
  "roadmap-builder": "Create realistic milestones, practice tasks, and measurable checks.",
  "interview-prep": "Create role-specific questions, model answers, and a practice strategy.",
  "caption-generator": "Generate original, concise, varied captions.",
  "idea-improver": "Strengthen the idea, value proposition, features, and build plan.",
  "study-planner": "Create a sustainable schedule with revision, practice, breaks, and progress checks."
};


const REASONING_PROMPTS = {
  fast: "Answer directly and efficiently. Check obvious errors before responding.",
  balanced: "Plan the solution internally, verify important assumptions, and provide a concise reasoning summary with the answer.",
  deep: "Use careful multi-step analysis, test alternatives, verify calculations, and present a concise auditable explanation without revealing hidden private chain-of-thought.",
  adaptive: "Choose the amount of reasoning based on difficulty. For complex tasks, verify assumptions and provide a concise reasoning summary; for simple tasks, answer directly."
};
const DISCOVERY_PROMPT = "Before giving a full solution, ask up to three focused clarification questions when missing information could materially change the result. If the request is already clear, proceed without unnecessary questions.";

const LANGUAGE_PROMPTS = {
  auto: "Reply in the same language as the user's latest message.",
  hinglish: "Reply in simple natural Hinglish written in Roman script.",
  english: "Reply in clear English.",
  hindi: "Reply in clear Hindi using Devanagari."
};

export async function onRequest({ request, env }) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Only POST requests are allowed." }, 405, headers);

  try {
    await enforceRateLimit(request, env, "chat", Number(env.CHAT_RATE_LIMIT_PER_MINUTE || 12), 60);
    const raw = await request.text();
    if (raw.length > 7_500_000) return json({ error: "Request is too large." }, 413, headers);
    let body;
    try { body = JSON.parse(raw); }
    catch { return json({ error: "Request body must be valid JSON." }, 400, headers); }
    const access = await enforceChatAccess(request,env,Math.ceil(raw.length/4));
    if (access.guest && !(await verifyTurnstile(request, env, body.turnstileToken))) {
      return json({ error: "Security verification failed." }, 400, headers);
    }

    const input = clean(body.input, 100000);
    const image = typeof body.image === "string" ? body.image : "";
    if (!input && !image) return json({ error: "Enter a message or attach an image." }, 400, headers);

    if (env.ENABLE_MODERATION === "true" && env.AI && input) {
      try {
        const moderation = await env.AI.run(MODERATION_MODEL, { prompt: input });
        const verdict = String(moderation?.response || moderation?.result || moderation || "").toLowerCase();
        if (verdict.startsWith("unsafe")) {
          return json({ error: "This request cannot be processed safely." }, 400, headers);
        }
      } catch (moderationError) {
        console.warn("Moderation unavailable; continuing with application safety rules.", moderationError?.message || moderationError);
      }
    }

    const tool = TOOL_PROMPTS[body.tool] ? body.tool : "ask-anything";
    const language = LANGUAGE_PROMPTS[body.language] ? body.language : "auto";
    const provider = ["auto", "cloudflare", "github", "openai", "anthropic", "gemini", "groq"].includes(body.provider) ? body.provider : "auto";
    const modelProfile = ["auto", "fast", "smart", "coding"].includes(body.modelProfile) ? body.modelProfile : "auto";
    const reasoningMode = ["fast", "balanced", "deep", "adaptive"].includes(body.reasoningMode) ? body.reasoningMode : "adaptive";
    const researchMode = ["off", "standard", "deep"].includes(body.researchMode) ? body.researchMode : "off";
    const domainFocus = ["web", "academic", "youtube", "reddit", "code", "writing"].includes(body.domainFocus) ? body.domainFocus : "web";
    const mode = routeMode(modelProfile === "auto" ? body.modelMode : modelProfile, tool, input);
    const maxTokens = Math.round(clamp(body.maxTokens, 128, 1600, 900));
    const temperature = clamp(body.temperature, 0, 1.5, 0.65);
    const history = sanitizeHistory(body.history);

    if (image) {
      const result = await handleVision(env, image, input, tool, language, body.customInstructions, body.customBot, maxTokens);
      await usage(request, env, "vision", VISION_MODEL, input.length, result.length);
      return json({ result, model: VISION_MODEL, provider: "cloudflare" }, 200, { ...headers, "X-AI-Model": VISION_MODEL });
    }


    const greeting = getQuickGreeting(input, language);
    if (greeting && !image) {
      await usage(request, env, "quick-greeting", "nexus-local", input.length, greeting.length);
      return json(
        { result: greeting, model: "Nexus Local", provider: "local" },
        200,
        { ...headers, "X-AI-Model": "Nexus Local", "X-AI-Provider": "local" }
      );
    }

    const liveEnabled = body.liveTools !== false && domainFocus !== "writing";
    const live = await collectRealtimeContext({
      query: input,
      env,
      request,
      domainFocus,
      researchMode,
      enabled: liveEnabled
    }).catch(error => {
      console.error("Realtime tools failed", error);
      return { context: "", sources: [], tools: [] };
    });

    let searchContext = "";
    let sources = [...(live.sources || [])];
    if ((body.webSearch || researchMode !== "off") && domainFocus !== "writing") {
      try {
        const searched = researchMode === "deep"
          ? await deepSearchWeb(env, input, domainFocus, request)
          : await searchWeb(env, input, domainFocus, 8, request);
        searchContext = searched.context || "";
        sources = dedupeSources([...sources, ...(searched.sources || [])]).slice(0, 20);
        sources = sources.map((item, index) => ({ ...item, index: index + 1 }));
      } catch (searchError) {
        console.warn("Search enrichment unavailable; continuing without it.", searchError?.message || searchError);
      }
    }

    const system = [
      TOOL_PROMPTS[tool],
      LANGUAGE_PROMPTS[language],
      REASONING_PROMPTS[reasoningMode],
      body.discoveryMode ? DISCOVERY_PROMPT : "",
      "The latest user message has priority over older chat context. Do not continue an old coding or research task when the latest message is only a greeting or changes topic.",
      "Use Markdown. Use fenced code blocks with a language label.",
      "Be honest about uncertainty. Never claim to have executed code, opened links, or inspected files unless their content was supplied.",
      (searchContext || live.context) ? "Use the numbered sources below. Cite factual or time-sensitive claims with [1], [2], and end with a Sources section containing the supplied URLs. Never invent a citation." : "",
      live.context,
      body.memory ? `Long-term memory notes:\n${clean(body.memory, 6000)}` : "",
      body.customBot ? `Active bot instructions:\n${clean(body.customBot, 4000)}` : "",
      body.customAppContext ? `Active custom app:\n${clean(body.customAppContext, 6000)}` : "",
      body.notebookContext ? `Active notebook knowledge:\n${clean(body.notebookContext, 30000)}` : "",
      body.artifactMode ? "When the user requests an app, webpage, chart, SVG, or runnable code, return complete fenced code with an accurate language label so it can open in the Artifacts workspace." : "",
      body.projectContext ? `Active project context:\n${clean(body.projectContext, 12000)}` : "",
      body.documentContext ? `Relevant document context:\n${clean(body.documentContext, 50000)}` : "",
      body.customInstructions ? `User preferences:\n${clean(body.customInstructions, 2000)}` : "",
      searchContext
    ].filter(Boolean).join("\n\n");

    const messages = [{ role: "system", content: system }, ...history, { role: "user", content: input }];
    const providers = providerOrder(provider, env);
    let lastError;

    for (const name of providers) {
      try {
        if (name === "cloudflare") {
          const preferredModel = env[`CF_MODEL_${String(mode).toUpperCase()}`] || env.CF_MODEL || CF_MODELS[mode] || FREE_CF_MODEL;
          if (sources.length || researchMode === "deep") {
            const { result, model } = await runCloudflareWithFallback(env, preferredModel, {
              messages, stream: false, max_tokens: maxTokens, temperature
            });
            const text = appendSources(extractCloudflareText(result), sources);
            await usage(request, env, tool, model, input.length, text.length);
            return json({ result: text, model, provider: name, sources }, 200, { ...headers, "X-AI-Model": model, "X-AI-Provider": name });
          }
          try {
            const streamed = await runCloudflareWithFallback(env, preferredModel, {
              messages, stream: true, max_tokens: maxTokens, temperature
            });
            const readable = streamed.result?.pipeThrough
              ? streamed.result
              : streamed.result?.body?.pipeThrough
                ? streamed.result.body
                : null;

            if (readable) {
              let outputBytes = 0;
              const meteredStream = readable.pipeThrough(new TransformStream({
                transform(chunk, controller) {
                  outputBytes += typeof chunk === "string" ? chunk.length : Number(chunk?.byteLength || 0);
                  controller.enqueue(chunk);
                },
                async flush() {
                  await usage(request, env, tool, streamed.model, input.length, outputBytes).catch(() => {});
                }
              }));
              return new Response(meteredStream, {
                status: 200,
                headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-AI-Model": streamed.model, "X-AI-Provider": name, "X-AI-Sources": String(sources.length) }
              });
            }
          } catch (streamError) {
            console.warn("Streaming unavailable; retrying as a standard response.", streamError?.message || streamError);
          }

          const fallback = await runCloudflareWithFallback(env, preferredModel, {
            messages, stream: false, max_tokens: maxTokens, temperature
          });
          const fallbackText = extractCloudflareText(fallback.result);
          if (!fallbackText.trim()) throw new Error("Workers AI returned an empty response.");
          await usage(request, env, tool, fallback.model, input.length, fallbackText.length);
          return json(
            { result: fallbackText, model: fallback.model, provider: name },
            200,
            { ...headers, "X-AI-Model": fallback.model, "X-AI-Provider": name }
          );
        }
        const response = await runExternal(name, env, messages, system, maxTokens, temperature, modelProfile, reasoningMode);
        if (!String(response.text || "").trim()) throw new Error(`${name} returned an empty response.`);
        const text = appendSources(response.text, sources);
        await usage(request, env, tool, response.model, input.length, text.length);
        return json({ result: text, model: response.model, provider: name, sources }, 200, { ...headers, "X-AI-Model": response.model, "X-AI-Provider": name });
      } catch (error) {
        lastError = error;
        console.error(`Provider ${name} failed`, error);
      }
    }
    if (!providers.length) {
      const error = new Error('No AI provider is available. Add the Cloudflare Workers AI binding named "AI".');
      error.status = 503;
      throw error;
    }
    throw lastError || new Error("Every configured AI provider failed temporarily.");
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error("AI NEXUS chat error", error);
      const user=await getUser(request,env).catch(()=>null);await logError(env,{route:"/api/chat",message:error.message,stack:error.stack,userId:user?.id,ip:request.headers.get("CF-Connecting-IP")});
    }
    return json({ error: error.message || "Unknown server error." }, status, headers);
  }
}



function getQuickGreeting(input, language) {
  const normalized = String(input || "").trim().toLowerCase().replace(/[!?.,]+$/g, "").trim();
  if (!/^(?:h+i+|h+e+l+o+|hlo+|hey+|hola|namaste|namaskar|hello buddy|hey buddy|what'?s up|whats up|sup)$/.test(normalized)) {
    return "";
  }

  if (language === "hindi") {
    return "नमस्ते! मैं AI NEXUS हूँ। आज मैं आपकी किस चीज़ में मदद करूँ?";
  }
  if (language === "english") {
    return "Hello! I’m AI NEXUS. What would you like help with today?";
  }
  return "Hello buddy! Main AI NEXUS hoon. Aaj kis cheez mein help chahiye?";
}

async function runCloudflareWithFallback(env, preferredModel, payload, fallbackModel = FREE_CF_MODEL) {
  if (!env.AI) {
    const error = new Error('Workers AI binding "AI" is not configured in this deployment.');
    error.status = 503;
    throw error;
  }
  const candidates = [...new Set([preferredModel, fallbackModel, ...CF_FALLBACK_MODELS].filter(Boolean))];
  let lastError;

  for (const model of candidates) {
    try {
      const result = await env.AI.run(model, payload);
      return { result, model };
    } catch (error) {
      lastError = error;
      console.error(`Workers AI model ${model} failed`, error);
    }
  }

  const message = String(lastError?.message || lastError || "");
  const error = new Error(/5035|paid plan/i.test(message)
    ? `The configured Workers AI model is unavailable on this plan. Remove CF_MODEL overrides to use ${FREE_CF_MODEL}.`
    : `Workers AI could not run any compatible fallback model. ${message}`.trim());
  error.status = 503;
  throw error;
}

async function handleVision(env, image, input, tool, language, customInstructions, customBot, maxTokens) {
  if (!env.AI) throw new Error("Workers AI is required for image analysis.");
  if (!image.startsWith("data:image/") || image.length > 7_000_000) throw new Error("Invalid or oversized image.");
  const question = [TOOL_PROMPTS[tool] || TOOL_PROMPTS["image-analysis"], LANGUAGE_PROMPTS[language], customBot ? `Bot instructions: ${clean(customBot, 4000)}` : "", customInstructions ? `User preferences: ${clean(customInstructions, 2000)}` : "", `User request: ${input || "Analyze the image."}`].filter(Boolean).join("\n\n");
  const preferredModel = env.CF_VISION_MODEL || VISION_MODEL;
  const { result } = await runCloudflareWithFallback(env, preferredModel, {
    task: "query",
    image,
    question,
    reasoning: true,
    stream: false,
    max_tokens: Math.min(maxTokens, 1200)
  }, VISION_MODEL);
  return result?.answer || result?.caption || result?.response || result?.result || "No image description was returned.";
}

async function searchWeb(env, query, domainFocus = "web", count = 8, request) {
  return publicSearch(query, domainFocus, env, request, count);
}

async function deepSearchWeb(env, query, domainFocus = "web", request) {
  const variants = [query, `${query} evidence analysis`, `${query} limitations alternatives`, `${query} latest developments`];
  const groups = await Promise.all(variants.map(q => searchWeb(env, q, domainFocus, 6, request).catch(() => ({ sources: [] }))));
  const sources = dedupeSources(groups.flatMap(group => group.sources || [])).slice(0, 18).map((item, index) => ({ ...item, index: index + 1 }));
  const result = sourceContext(sources);
  result.context = `Deep Research gathered ${sources.length} deduplicated sources across multiple searches and public data services. Compare evidence, note disagreements, avoid unsupported claims, and cite source numbers.

${result.context}`;
  return result;
}

function focusQuery(query, focus) {
  const prefixes = {
    academic: `(site:arxiv.org OR site:pubmed.ncbi.nlm.nih.gov OR site:semanticscholar.org OR site:openreview.net)`,
    youtube: `site:youtube.com`,
    reddit: `site:reddit.com`,
    code: `(site:github.com OR site:stackoverflow.com OR site:developer.mozilla.org)`
  };
  return prefixes[focus] ? `${prefixes[focus]} ${query}` : query;
}
function dedupeSources(items) { const seen = new Set(); return items.filter(item => { try { const u = new URL(item.url); const key = `${u.hostname}${u.pathname}`.replace(/\/$/, ""); if (seen.has(key)) return false; seen.add(key); return true; } catch { return false; } }); }
function sourceContext(items) { const sources = items.map((item, index) => ({ index: index + 1, ...item })); const context = sources.length ? "Web sources:\n" + sources.map(s => `[${s.index}] ${s.title}\nURL: ${s.url}\nSnippet: ${s.description}`).join("\n\n") : "No usable web sources were returned."; return { context, sources }; }
function appendSources(text, sources) { if (!sources?.length) return text; const block = sources.map(s => `${s.index}. [${s.title}](${s.url})`).join("\n"); return `${String(text || "").trim()}\n\n### Sources retrieved\n${block}`; }
function extractCloudflareText(result) { return String(result?.response || result?.result || result?.answer || result?.text || result?.choices?.[0]?.message?.content || ""); }

function providerOrder(requested, env) {
  const available = { cloudflare: Boolean(env.AI), github: Boolean(env.GITHUB_TOKEN && env.GITHUB_MODEL), openai: Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL), anthropic: Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL), gemini: Boolean(env.GEMINI_API_KEY && env.GEMINI_MODEL), groq: Boolean(env.GROQ_API_KEY && env.GROQ_MODEL) };
  const order = requested === "auto" ? ["cloudflare", "github", "groq", "gemini", "openai", "anthropic"] : [requested, "cloudflare", "github", "groq", "gemini", "openai", "anthropic"];
  return order.filter((item, index) => available[item] && order.indexOf(item) === index);
}

async function runExternal(provider, env, messages, system, maxTokens, temperature, modelProfile = "auto", reasoningMode = "adaptive") {
  const conversation = messages.filter(message => message.role !== "system");

  if (provider === "github") {
    const model = chooseModel(env, "GITHUB", modelProfile, env.GITHUB_MODEL);
    if (!model) throw new Error("Set GITHUB_MODEL before using GitHub Models.");
    const response = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: Math.min(1, Math.max(0, temperature))
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `GitHub Models request failed (${response.status}).`);
    }
    const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
    if (!text) throw new Error("GitHub Models returned an empty response.");
    return { text, model };
  }

  if (provider === "openai") {
    const model = chooseModel(env, "OPENAI", modelProfile, env.OPENAI_MODEL);
    if (!model) throw new Error("Set OPENAI_MODEL before using OpenAI.");
    const payload = { model, instructions: system, input: conversation, max_output_tokens: maxTokens };
    if (/^(gpt-5|o\d)/i.test(model)) {
      payload.reasoning = { effort: ({ fast: "minimal", balanced: "low", deep: "high", adaptive: "medium" })[reasoningMode] || "medium" };
    } else {
      payload.temperature = temperature;
    }
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenAI request failed.");
    const text = data.output_text || data.output?.flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text).join("") || "";
    return { text, model };
  }
  if (provider === "anthropic") {
    const model = chooseModel(env, "ANTHROPIC", modelProfile, env.ANTHROPIC_MODEL);
    if (!model) throw new Error("Set ANTHROPIC_MODEL before using Anthropic.");
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model, system, messages: conversation, max_tokens: maxTokens, temperature }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Anthropic request failed.");
    return { text: (data.content || []).filter(item => item.type === "text").map(item => item.text).join("\n"), model };
  }
  if (provider === "gemini") {
    const model = chooseModel(env, "GEMINI", modelProfile, env.GEMINI_MODEL);
    if (!model) throw new Error("Set GEMINI_MODEL before using Gemini.");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: conversation.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: String(message.content || "") }] })), generationConfig: { temperature, maxOutputTokens: maxTokens } }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini request failed.");
    return { text: extractGeminiText(data), model };
  }
  if (provider === "groq") {
    const model = chooseModel(env, "GROQ", modelProfile, env.GROQ_MODEL);
    if (!model) throw new Error("Set GROQ_MODEL before using Groq.");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq request failed.");
    const text = data.choices?.[0]?.message?.content || "";
    return { text, model };
  }
  throw new Error(`Provider ${provider} is unavailable.`);
}


function chooseModel(env, prefix, profile, fallback) {
  const suffix = String(profile || "auto").toUpperCase();
  return env[`${prefix}_MODEL_${suffix}`] || env[`${prefix}_MODEL`] || fallback;
}

function extractGeminiText(data) {
  const texts = [];
  for (const candidate of data?.candidates || []) {
    for (const part of candidate?.content?.parts || []) {
      if (typeof part?.text === "string") texts.push(part.text);
    }
  }
  // Keep compatibility with alternate/legacy gateway response shapes.
  for (const step of data?.steps || []) {
    for (const content of step?.content || []) {
      if (typeof content?.text === "string") texts.push(content.text);
    }
  }
  return texts.join("\n").trim();
}
function routeMode(requested, tool, input) {
  if (["fast", "smart", "coding"].includes(requested)) return requested;
  if (["code-explainer", "bug-finder", "sql-generator", "regex-helper"].includes(tool) || /```|traceback|exception|syntax error|debug|function|class\s+/i.test(input)) return "coding";
  if (["deep-reasoning", "roadmap-builder", "project-builder", "interview-prep"].includes(tool) || input.length > 5500) return "smart";
  return "fast";
}
function sanitizeHistory(history) { return Array.isArray(history) ? history.slice(-14).filter(item => item && ["user", "assistant"].includes(item.role)).map(item => ({ role: item.role, content: clean(item.content, 14000) })).filter(item => item.content) : []; }
function clean(value, max) { return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : ""; }
function clamp(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }
async function usage(request, env, feature, model, inputChars, outputChars) { const user = await getUser(request, env); await logUsage(env, { userId: user?.id, ip: request.headers.get("CF-Connecting-IP"), feature, model, inputChars, outputChars }); }
