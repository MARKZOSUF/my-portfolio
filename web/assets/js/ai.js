/* Unified AI client. One API key, any provider.
 * Handles the OpenAI chat-completions dialect and the Anthropic messages
 * dialect behind a single `chat()` / `chatStream()` surface.
 */
import { getConfig } from './config.js';

export class AIError extends Error {
  constructor(message, status, provider) {
    super(message);
    this.name = 'AIError';
    this.status = status;
    this.provider = provider;
  }
}

function friendly(status, detail, provider) {
  if (status === 401 || status === 403) {
    return `Your API key was rejected by ${provider}. Open Settings and paste a valid key.`;
  }
  if (status === 404) {
    return `${provider} does not recognise the selected model. Pick another model in Settings.`;
  }
  if (status === 429) {
    return `${provider} rate limit hit. Wait a few seconds and try again.`;
  }
  if (status >= 500) {
    return `${provider} is having a server problem (${status}). Retrying usually works.`;
  }
  return `${provider} error ${status}: ${detail}`.slice(0, 400);
}

async function readError(response, provider) {
  let detail = '';
  try {
    const data = await response.json();
    detail = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || data);
  } catch {
    try {
      detail = await response.text();
    } catch {
      detail = response.statusText;
    }
  }
  return new AIError(friendly(response.status, detail.slice(0, 300), provider), response.status, provider);
}

function buildRequest(messages, opts, cfg) {
  const model = opts.model || (opts.useFast ? cfg.fastModel : cfg.model);
  const headers = { 'Content-Type': 'application/json' };

  // Shared server key: the Pages Function itself is the endpoint and it holds
  // the key, so the browser sends no credentials and no model is required.
  if (cfg.usingServer) {
    return {
      url: cfg.baseUrl || '/api/ai',
      headers,
      body: {
        ...(model ? { model } : {}),
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens || 4000,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        ...(opts.stream ? { stream: true } : {}),
      },
    };
  }

  if (cfg.dialect === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const rest = messages.filter((m) => m.role !== 'system');
    if (cfg.apiKey) {
      headers['x-api-key'] = cfg.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
    return {
      url: `${cfg.baseUrl}/messages`,
      headers,
      body: {
        model,
        max_tokens: opts.maxTokens || 4000,
        temperature: opts.temperature ?? 0.3,
        ...(system ? { system } : {}),
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
        ...(opts.stream ? { stream: true } : {}),
      },
    };
  }

  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
  if (cfg.providerName === 'openrouter') {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'StudyForge AI';
  }
  return {
    url: `${cfg.baseUrl}/chat/completions`,
    headers,
    body: {
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens || 4000,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      ...(opts.stream ? { stream: true } : {}),
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Non-streaming completion with bounded retry on transient failures. */
export async function chat(messages, opts = {}) {
  const cfg = getConfig();
  if (!cfg.isConfigured) {
    throw new AIError('No API key set yet. Open Settings and paste any AI provider key.', 0, 'StudyForge');
  }
  if (!cfg.baseUrl && !cfg.usingServer) {
    throw new AIError('No API base URL for this key. Add one in Settings → Advanced.', 0, cfg.providerLabel);
  }

  const attempts = opts.retries ?? 3;
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    const { url, headers, body } = buildRequest(messages, opts, cfg);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: opts.signal,
      });
      if (!response.ok) {
        const err = await readError(response, cfg.providerLabel);
        // Auth and model errors will never fix themselves; fail fast.
        if ([400, 401, 403, 404].includes(err.status)) throw err;
        lastError = err;
        await sleep(700 * 2 ** i);
        continue;
      }
      const data = await response.json();
      if (cfg.dialect === 'anthropic') {
        const text = (data.content || []).map((c) => c.text || '').join('');
        return { text, model: data.model || body.model, usage: data.usage || {} };
      }
      const choice = (data.choices || [])[0];
      if (!choice) throw new AIError('Provider returned no choices.', 502, cfg.providerLabel);
      return {
        text: choice.message?.content || '',
        model: data.model || body.model,
        usage: data.usage || {},
      };
    } catch (err) {
      if (err instanceof AIError && [400, 401, 403, 404].includes(err.status)) throw err;
      if (err?.name === 'AbortError') throw err;
      lastError = err;
      await sleep(700 * 2 ** i);
    }
  }
  throw lastError || new AIError('AI request failed.', 0, cfg.providerLabel);
}

/** Streaming completion. `onToken` receives incremental text. */
export async function chatStream(messages, onToken, opts = {}) {
  const cfg = getConfig();
  if (!cfg.isConfigured) {
    throw new AIError('No API key set yet. Open Settings and paste any AI provider key.', 0, 'StudyForge');
  }
  const { url, headers, body } = buildRequest(messages, { ...opts, stream: true }, cfg);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    // Streaming blocked (CORS/proxy) — fall back to a normal request.
    const out = await chat(messages, opts);
    onToken(out.text);
    return out;
  }
  if (!response.ok || !response.body) {
    const err = await readError(response, cfg.providerLabel);
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let json;
      try {
        json = JSON.parse(payload);
      } catch {
        continue;
      }
      let piece = '';
      if (cfg.dialect === 'anthropic') {
        piece = json.delta?.text || '';
      } else {
        piece = json.choices?.[0]?.delta?.content || '';
      }
      if (piece) {
        full += piece;
        onToken(piece);
      }
    }
  }
  return { text: full, model: body.model, usage: {} };
}

/** Ask for strict JSON and parse it defensively. */
export async function chatJson(messages, opts = {}) {
  const out = await chat(messages, { ...opts, json: true, temperature: opts.temperature ?? 0.2 });
  return parseLooseJson(out.text);
}

export function parseLooseJson(text) {
  const raw = (text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[[{]/);
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/** Fetch the live model list for the configured key (Settings dropdown). */
export async function listModels() {
  const cfg = getConfig();
  if (!cfg.isConfigured || cfg.usingServer || cfg.dialect === 'anthropic') return [];
  try {
    const response = await fetch(`${cfg.baseUrl}/models`, {
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data || [])
      .map((m) => m.id)
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}
