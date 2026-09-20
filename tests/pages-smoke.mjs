/**
 * Cloudflare Pages smoke test + deep-link reload test.
 *
 * Serves ./web with the same resolution order Cloudflare Pages uses for a
 * static project:
 *   1. exact file            2. <path>/index.html
 *   3. <path>.html           4. the _redirects rules (SPA fallback, 200)
 * Then asserts the deep routes that used to 404 now return the SPA shell,
 * that a reload on those routes behaves identically, and that headers from
 * _headers are applied with the right precedence.
 *
 * No Worker, no API, no dependency.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = 'web';
const failures = [];
const notes = [];

function check(label, condition, detail = '') {
  if (condition) notes.push(`  PASS  ${label}`);
  else failures.push(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
}

// ---------------------------------------------------------------- _redirects
function parseRedirects() {
  const file = join(ROOT, '_redirects');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/);
      return { from, to, status: Number(status || 302) };
    });
}

// ------------------------------------------------------------------ _headers
function parseHeaders() {
  const file = join(ROOT, '_headers');
  if (!existsSync(file)) return [];
  const rules = [];
  let current = null;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { path: raw.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const idx = raw.indexOf(':');
      if (idx > 0) current.headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
    }
  }
  return rules;
}

const redirects = parseRedirects();
const headerRules = parseHeaders();

function matchPath(pattern, pathname) {
  if (pattern.endsWith('/*')) return pathname.startsWith(pattern.slice(0, -1));
  if (pattern === '/*') return true;
  return pattern === pathname;
}

function headersFor(pathname) {
  // Cloudflare merges every matching rule; more specific paths win.
  const applicable = headerRules
    .filter((rule) => matchPath(rule.path, pathname))
    .sort((a, b) => a.path.length - b.path.length);
  return Object.assign({}, ...applicable.map((rule) => rule.headers));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveStatic(pathname) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidates = [
    join(ROOT, safe),
    join(ROOT, safe, 'index.html'),
    join(ROOT, `${safe}.html`),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  let file = resolveStatic(pathname);
  let status = 200;

  if (!file) {
    const rule = redirects.find((r) => matchPath(r.from, pathname));
    if (rule) {
      file = resolveStatic(rule.to);
      status = rule.status;
    }
  }

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const body = readFileSync(file);
  res.writeHead(status, {
    'content-type': MIME[extname(file)] || 'application/octet-stream',
    ...headersFor(pathname),
  });
  res.end(body);
});

const PORT = 8788;

async function get(path, options = {}) {
  const response = await fetch(`http://localhost:${PORT}${path}`, options);
  const text = await response.text();
  return { status: response.status, headers: response.headers, text };
}

await new Promise((resolve) => server.listen(PORT, resolve));

try {
  if (!existsSync(join(ROOT, 'index.html'))) {
    throw new Error('web/index.html is missing. Run `npm run build` first.');
  }

  const shell = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const bundle = shell.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  check('index.html references a hashed entry bundle', Boolean(bundle));

  // ------------------------------------------------- deep routes (no 404)
  const deepRoutes = [
    '/qr-scanner',
    '/prank-qr',
    '/image-to-qr',
    '/qr-generator',
    '/image-tools',
    '/poster-maker',
    '/about',
    '/faq',
    '/privacy',
    '/terms',
    '/p?d=eyJ2IjoxfQ',
    '/p?d=abc&utm_source=qr',
    '/some/unknown/nested/route',
  ];

  for (const route of deepRoutes) {
    const res = await get(route);
    check(`GET ${route} -> 200 SPA shell`, res.status === 200 && res.text.includes('<div id="root">'), `status ${res.status}`);
  }

  // ------------------------------------------------- reload behaviour
  for (const route of ['/qr-scanner', '/image-to-qr', '/p?d=eyJ2IjoxfQ']) {
    const first = await get(route);
    const second = await get(route, { headers: { 'cache-control': 'no-cache' } });
    check(
      `reload of ${route} is stable`,
      first.status === 200 && second.status === 200 && first.text === second.text
    );
  }

  // ------------------------------------------------- real assets resolve
  if (bundle) {
    const asset = await get(bundle);
    check(`entry bundle ${bundle} served`, asset.status === 200);
    check(
      'hashed assets are immutable-cached',
      (asset.headers.get('cache-control') || '').includes('immutable')
    );
  }

  for (const file of ['/sw.js', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/favicon.svg']) {
    const res = await get(file);
    check(`GET ${file} -> 200`, res.status === 200, `status ${res.status}`);
  }

  // ------------------------------------------------- caching correctness
  const swRes = await get('/sw.js');
  check('sw.js is never cached', (swRes.headers.get('cache-control') || '').includes('no-store'));
  check('sw.js carries a stamped build id', /const BUILD_ID = '[0-9a-f]{6,}'/.test(swRes.text));
  check('sw.js placeholder was replaced', !swRes.text.includes('__ZOSUF_BUILD_ID__'));

  const shellRes = await get('/qr-scanner');
  check(
    'SPA routes are revalidated, not cached',
    /max-age=0|no-store/.test(shellRes.headers.get('cache-control') || '')
  );
  check('security headers present', shellRes.headers.get('x-content-type-options') === 'nosniff');
  check(
    'camera is permitted for the scanner',
    (shellRes.headers.get('permissions-policy') || '').includes('camera=(self)')
  );

  const prankRes = await get('/p?d=eyJ2IjoxfQ');
  check('prank links are never stored in a shared cache', (prankRes.headers.get('cache-control') || '').includes('no-store'));
} finally {
  server.close();
}

console.log(notes.join('\n'));
if (failures.length) {
  console.error(`\nCloudflare Pages smoke test FAILED (${failures.length}):`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`\nCloudflare Pages smoke test passed: ${notes.length} assertions.`);
