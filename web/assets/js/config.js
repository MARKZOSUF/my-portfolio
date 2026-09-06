/* StudyForge AI — Single API Key System
 * ONE key runs everything. Provider + default model are auto-detected from the
 * key's own shape, so the user never picks a provider manually.
 */

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    proModel: 'gpt-4o',
    dialect: 'openai',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.0-flash-001',
    proModel: 'anthropic/claude-3.7-sonnet',
    dialect: 'openai',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    proModel: 'llama-3.3-70b-versatile',
    dialect: 'openai',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    proModel: 'gemini-2.5-pro',
    dialect: 'openai',
  },
  anthropic: {
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-haiku-latest',
    proModel: 'claude-3-7-sonnet-latest',
    dialect: 'anthropic',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    proModel: 'deepseek-reasoner',
    dialect: 'openai',
  },
  xai: {
    label: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-2-latest',
    proModel: 'grok-2-latest',
    dialect: 'openai',
  },
  cerebras: {
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    model: 'llama-3.3-70b',
    proModel: 'llama-3.3-70b',
    dialect: 'openai',
  },
  mistral: {
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    proModel: 'mistral-large-latest',
    dialect: 'openai',
  },
  together: {
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    proModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    dialect: 'openai',
  },
  huggingface: {
    label: 'Hugging Face',
    baseUrl: 'https://router.huggingface.co/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    proModel: 'meta-llama/Llama-3.3-70B-Instruct',
    dialect: 'openai',
  },
  server: {
    label: 'Server proxy',
    baseUrl: '/api/ai',
    model: 'server-default',
    proModel: 'server-default',
    dialect: 'openai',
  },
  custom: {
    label: 'Custom OpenAI-compatible',
    baseUrl: '',
    model: 'gpt-4o-mini',
    proModel: 'gpt-4o-mini',
    dialect: 'openai',
  },
};

/* Ordered longest-prefix-first so `sk-or-` never matches plain `sk-`. */
const RULES = [
  [/^sk-or-/i, 'openrouter'],
  [/^sk-ant-/i, 'anthropic'],
  [/^sk-proj-/i, 'openai'],
  [/^gsk_/i, 'groq'],
  [/^csk-/i, 'cerebras'],
  [/^xai-/i, 'xai'],
  [/^hf_/i, 'huggingface'],
  [/^AIza/, 'gemini'],
  [/^tgp_/i, 'together'],
  [/^sk-[0-9a-f]{32,}$/i, 'deepseek'],
  [/^sk-/i, 'openai'],
];

/** Detect provider purely from the key string. Never throws. */
export function detectProvider(rawKey) {
  const key = (rawKey || '').trim();
  if (!key) return null;
  for (const [re, name] of RULES) {
    if (re.test(key)) return name;
  }
  // Gemini keys are 39 chars and alphanumeric with - and _
  if (/^[A-Za-z0-9_-]{39}$/.test(key)) return 'gemini';
  // Mistral keys are 32 chars alphanumeric
  if (/^[A-Za-z0-9]{32}$/.test(key)) return 'mistral';
  return 'custom';
}

const STORE_KEY = 'studyforge.config.v1';
const SERVER_CACHE_KEY = 'studyforge.server.v1';

/* ---------------------------------------------------------------------------
 * Server-key mode (zero-setup for visitors)
 *
 * If the site owner set an AI_API_KEY environment variable in Cloudflare, the
 * /api/ai Pages Function answers { configured: true }. In that case the visitor
 * needs NO key at all: they just type a topic and press generate.
 *
 * A visitor may still paste their own key in Settings; a personal key always
 * wins over the shared server key.
 * ------------------------------------------------------------------------- */

let serverAvailable = null; // null = not probed yet
let serverModel = '';

try {
  const cached = sessionStorage.getItem(SERVER_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    serverAvailable = Boolean(parsed.configured);
    serverModel = parsed.model || '';
  }
} catch {
  /* sessionStorage blocked - probe again below */
}

/** True once the shared server key has been confirmed available. */
export function serverReady() {
  return serverAvailable === true;
}

/** Have we finished checking the server yet? */
export function serverProbed() {
  return serverAvailable !== null;
}

/**
 * Ask /api/ai whether a shared server key is configured.
 * Never throws: on any failure the app simply falls back to "bring your own key".
 */
export async function probeServer() {
  if (serverAvailable !== null) return serverAvailable;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch('./api/ai', {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.ok) {
      const data = await response.json();
      serverAvailable = Boolean(data && data.configured);
      serverModel = (data && data.model) || '';
    } else {
      serverAvailable = false;
    }
  } catch {
    serverAvailable = false;
  }
  try {
    sessionStorage.setItem(
      SERVER_CACHE_KEY,
      JSON.stringify({ configured: serverAvailable, model: serverModel })
    );
  } catch {
    /* ignore */
  }
  return serverAvailable;
}

const DEFAULTS = {
  apiKey: '',
  provider: '',        // '' = auto-detect from apiKey
  baseUrl: '',         // '' = provider default
  model: '',           // '' = provider default
  quality: 'deep',     // 'fast' | 'deep' | 'ultra'
  language: 'en',      // 'en' | 'hi' | 'hinglish'
  examBoard: '',       // e.g. 'AKTU B.Tech 1st Year'
  useServerProxy: false,
};

function readRaw() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Full resolved config: stored values + auto-detected provider defaults. */
export function getConfig() {
  const stored = { ...DEFAULTS, ...readRaw() };
  // Personal key wins. Otherwise fall back to the shared server key when one exists.
  const usingServer = stored.useServerProxy || (!stored.apiKey && serverAvailable === true);
  const providerName = usingServer
    ? 'server'
    : stored.provider || detectProvider(stored.apiKey) || 'custom';
  const preset = PROVIDERS[providerName] || PROVIDERS.custom;
  const model = usingServer
    ? stored.model || serverModel || ''
    : stored.model || (stored.quality === 'fast' ? preset.model : preset.proModel || preset.model);
  return {
    ...stored,
    usingServer,
    serverAvailable: serverAvailable === true,
    apiKey: usingServer ? '' : stored.apiKey,
    providerName,
    providerLabel: preset.label,
    dialect: preset.dialect,
    baseUrl: (stored.baseUrl || preset.baseUrl || '').replace(/\/+$/, ''),
    model,
    fastModel: usingServer ? model : preset.model,
    isConfigured: Boolean(usingServer || stored.apiKey),
  };
}

export function saveConfig(patch) {
  const next = { ...DEFAULTS, ...readRaw(), ...patch };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
  return getConfig();
}

export function clearConfig() {
  localStorage.removeItem(STORE_KEY);
}

/** Quick, cheap liveness check for the configured key. */
export async function verifyKey() {
  const { chat } = await import('./ai.js');
  const out = await chat(
    [
      { role: 'system', content: 'Reply with the single word OK.' },
      { role: 'user', content: 'ping' },
    ],
    { maxTokens: 8, temperature: 0, useFast: true }
  );
  return /ok/i.test(out.text || '');
}
