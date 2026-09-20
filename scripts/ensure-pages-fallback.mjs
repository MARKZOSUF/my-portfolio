/**
 * Cloudflare Pages post-build guard (no API, no Worker, no extra dependency).
 *
 * 1. Writes the SPA fallback so every deep link (/qr-scanner, /prank-qr,
 *    /image-to-qr, /p?d=...) is rewritten to index.html with a 200 instead of
 *    returning the Pages 404 page.
 * 2. Stamps the service worker with a build id derived from the emitted asset
 *    filenames, so each deploy ships a byte-different sw.js and browsers are
 *    forced to install it and drop the previous cache.
 * 3. Fails the build loudly if any required deploy artefact is missing.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'web';
const REDIRECTS = '/* /index.html 200\n';

mkdirSync(OUT, { recursive: true });

const problems = [];

// --- 1. SPA fallback -------------------------------------------------------
writeFileSync(join(OUT, '_redirects'), REDIRECTS);

// --- 2. Service worker build stamp ----------------------------------------
const assetsDir = join(OUT, 'assets');
let buildId = 'dev';
if (existsSync(assetsDir)) {
  const names = readdirSync(assetsDir).sort().join('|');
  buildId = createHash('sha256').update(names).digest('hex').slice(0, 12);
} else {
  problems.push('web/assets directory is missing — the bundle did not emit.');
}

const swPath = join(OUT, 'sw.js');
if (existsSync(swPath)) {
  const stamped = readFileSync(swPath, 'utf8').replaceAll('__ZOSUF_BUILD_ID__', buildId);
  if (stamped.includes('__ZOSUF_BUILD_ID__')) problems.push('sw.js build id placeholder was not replaced.');
  writeFileSync(swPath, stamped);
} else {
  problems.push('web/sw.js is missing — public/sw.js was not copied.');
}

// --- 3. Deploy artefact guard ---------------------------------------------
for (const required of ['index.html', '_headers', '_redirects', 'manifest.webmanifest', 'robots.txt']) {
  if (!existsSync(join(OUT, required))) problems.push(`web/${required} is missing.`);
}

if (existsSync('functions')) {
  problems.push('A functions/ directory exists — this project must deploy as static Pages output only.');
}

const indexHtml = existsSync(join(OUT, 'index.html')) ? readFileSync(join(OUT, 'index.html'), 'utf8') : '';
if (indexHtml.includes('/src/main.tsx')) {
  problems.push('web/index.html still points at the dev entry (/src/main.tsx) instead of a hashed bundle.');
}

if (problems.length) {
  console.error('\nCloudflare Pages output check FAILED:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Cloudflare Pages output ready: web/ (SPA fallback written, sw build id ${buildId}).`);
