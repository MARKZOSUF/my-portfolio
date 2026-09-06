/*
 * Optional Cloudflare Pages Function: server-side proxy for the single API key.
 *
 * Use this only if you do NOT want users to paste their own key. Set these
 * environment variables in the Pages dashboard (Settings -> Environment variables):
 *
 *   AI_API_KEY   (required)  any provider key
 *   AI_BASE_URL  (optional)  defaults to the OpenAI-compatible endpoint
 *   AI_MODEL     (optional)  default model when the client does not send one
 *   AI_DIALECT   (optional)  "openai" (default) or "anthropic"
 *
 * If AI_API_KEY is absent the endpoint returns 501 and the browser simply keeps
 * using the user's own key. Nothing crashes, and the site still builds and deploys.
 */

const SCHEME = 'https' + '://';
const DEFAULT_BASE = SCHEME + 'api.openai.com/v1';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    configured: Boolean(env && env.AI_API_KEY),
    model: (env && env.AI_MODEL) || null,
    dialect: (env && env.AI_DIALECT) || 'openai',
  });
}

export async function onRequestPost({ request, env }) {
  const key = env && env.AI_API_KEY;
  if (!key) {
    return json(
      {
        error: {
          message:
            'Server proxy is not configured. Add an AI_API_KEY environment variable in Cloudflare Pages, or turn off "Use the server proxy" in Settings and use your own key.',
        },
      },
      501
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: { message: 'Request body must be valid JSON.' } }, 400);
  }

  const base = String((env.AI_BASE_URL || DEFAULT_BASE)).replace(/\/+$/, '');
  const dialect = (env.AI_DIALECT || 'openai').toLowerCase();
  const model = payload.model || env.AI_MODEL || 'gpt-4o-mini';

  let upstreamUrl;
  let headers;
  let body;

  if (dialect === 'anthropic') {
    upstreamUrl = base + '/messages';
    headers = {
      ...JSON_HEADERS,
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    };
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    body = {
      model,
      max_tokens: payload.max_tokens || 4000,
      temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.3,
      system: system || undefined,
      messages: messages.filter((m) => m.role !== 'system'),
      stream: Boolean(payload.stream),
    };
  } else {
    upstreamUrl = base + '/chat/completions';
    headers = { ...JSON_HEADERS, authorization: 'Bearer ' + key };
    body = { ...payload, model };
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseHeaders = new Headers();
    responseHeaders.set(
      'content-type',
      upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    );
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('cache-control', 'no-store');

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (err) {
    return json({ error: { message: 'Upstream request failed: ' + (err && err.message ? err.message : 'unknown error') } }, 502);
  }
}
