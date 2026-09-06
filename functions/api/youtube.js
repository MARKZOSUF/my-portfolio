/*
 * Cloudflare Pages Function: fetch a YouTube transcript without any API key.
 *
 * GET /api/youtube?v=<videoId>  ->  { text, title }
 *
 * Uses only public timedtext endpoints. If no captions exist it returns a
 * friendly 404 message; it never throws, so deployment can never break.
 */

const SCHEME = 'https' + '://';
const WATCH = SCHEME + 'www.youtube.com/watch?v=';
const TIMEDTEXT = SCHEME + 'www.youtube.com/api/timedtext';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600',
    },
  });
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function xmlToText(xml) {
  const parts = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = re.exec(xml))) {
    const line = decodeEntities(match[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (line) parts.push(line);
  }
  return parts.join(' ');
}

function json3ToText(payload) {
  const events = Array.isArray(payload && payload.events) ? payload.events : [];
  const parts = [];
  for (const event of events) {
    const segs = Array.isArray(event.segs) ? event.segs : [];
    const line = segs.map((s) => String(s.utf8 || '')).join('').replace(/\s+/g, ' ').trim();
    if (line) parts.push(line);
  }
  return parts.join(' ');
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export async function onRequestGet({ request }) {
  const id = new URL(request.url).searchParams.get('v');
  if (!id || !/^[\w-]{6,20}$/.test(id)) {
    return json({ error: 'Provide a valid YouTube video id, e.g. /api/youtube?v=dQw4w9WgXcQ' }, 400);
  }

  let title = '';
  let tracks = [];

  try {
    const page = await fetch(WATCH + encodeURIComponent(id), {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
    });
    const html = await page.text();

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) title = decodeEntities(titleMatch[1]).replace(/\s*-\s*YouTube\s*$/, '').trim();

    const listMatch = html.match(/"captionTracks":(\[[\s\S]*?\])/);
    if (listMatch) {
      try {
        tracks = JSON.parse(listMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'));
      } catch {
        tracks = [];
      }
    }
  } catch {
    // fall through to the direct timedtext attempt below
  }

  const candidates = [];
  const preferred =
    tracks.find((t) => t && /^en/i.test(t.languageCode || '') && t.kind !== 'asr') ||
    tracks.find((t) => t && /^en/i.test(t.languageCode || '')) ||
    tracks.find((t) => t && /^hi/i.test(t.languageCode || '')) ||
    tracks[0];
  if (preferred && preferred.baseUrl) {
    const base = String(preferred.baseUrl).replace(/\\u0026/g, '&');
    candidates.push(base + '&fmt=json3');
    candidates.push(base);
  }
  candidates.push(TIMEDTEXT + '?lang=en&v=' + encodeURIComponent(id) + '&fmt=json3');
  candidates.push(TIMEDTEXT + '?lang=en&v=' + encodeURIComponent(id));
  candidates.push(TIMEDTEXT + '?lang=hi&v=' + encodeURIComponent(id));

  for (const url of candidates) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': UA } });
      if (!response.ok) continue;
      const raw = await response.text();
      if (!raw.trim()) continue;

      let text = '';
      if (raw.trim().startsWith('{')) {
        try {
          text = json3ToText(JSON.parse(raw));
        } catch {
          text = '';
        }
      } else {
        text = xmlToText(raw);
      }

      if (text && text.length > 40) {
        return json({ text, title: title || 'YouTube lecture', source: 'timedtext' });
      }
    } catch {
      // try the next candidate
    }
  }

  return json(
    {
      error:
        'No captions were available for this video. Open the video description or slides and upload them as a PDF instead, or type the topic manually.',
      title: title || '',
    },
    404
  );
}
