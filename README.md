# ZOSUF

Advanced privacy-first QR template studio, scanner, Image-to-QR tools and poster maker by [@markzosuf](https://instagram.com/markzosuf).

Everything — image processing, QR generation, optical verification, scanning and
saved templates — runs in the browser. There is no API, no server function, no
database, no environment variable, no binding and no login.

## Local development

```bash
npm install
npm run typecheck   # strict tsc --noEmit
npm test            # static audit + QR payload contract + Pages deep-link smoke
npm run build       # emits ./web and stamps the service worker
npm run preview
npm run verify      # build, then the full test suite
```

Node.js 22 or newer. The build and the full test suite are verified on Node 22
(`.nvmrc`).

## Cloudflare Pages

```text
Framework preset: Vite
Build command:    npm ci && npm run build
Output directory: web
Root directory:   /
```

No environment variables, Functions, Workers or bindings are required.

### How SPA deep links are handled

Cloudflare Pages does **not** silently fall back to `index.html` for unknown
paths — without a rule it serves its own 404 page, which is what used to break
`/qr-scanner`, `/prank-qr`, `/image-to-qr` and `/p?d=…` on reload or QR scan.

`scripts/ensure-pages-fallback.mjs` runs after every build and writes
`web/_redirects`:

```text
/* /index.html 200
```

That rewrite (status `200`, not a redirect) is what makes every client route
resolve to the SPA shell while keeping the original URL and its query string.
The same script stamps `web/sw.js` with a build id derived from the emitted
asset hashes, so each deploy ships a byte-different service worker and browsers
are forced to drop the previous cache instead of serving a stale page. The
script fails the build if any required deploy artefact is missing.

`npm test` includes `tests/pages-smoke.mjs`, which replays Cloudflare Pages'
file-resolution order and `_headers` precedence against the built `web/`
directory and asserts that every deep route returns `200` with the SPA shell.

### Wrangler

```bash
npm ci
npm run build
npx wrangler pages deploy web --project-name zosuf
```

`wrangler.toml` already sets `pages_build_output_dir = "./web"`.

## What the studio includes

Local templates, frames, shapes, logos and text layers, with final-artwork
optical verification and PNG/JPEG/WebP/SVG-wrapper export. Your design is
rendered as configured; a flattened high-contrast fallback is applied **only**
if the styled code fails to decode locally, and the UI says so when that
happens.

See `FIX_REPORT.md` for the full audit and verification results.
