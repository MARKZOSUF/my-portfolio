# ZOSUF

Advanced privacy-first QR template studio, scanner, Image-to-QR tools and poster maker by [@markzosuf](https://instagram.com/markzosuf).

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run preview
```

Node.js 24 is recommended.

## Cloudflare Pages

```text
Framework: Vite
Build command: npm ci && npm run build
Output directory: web
Root directory: /
NODE_VERSION: 24
```

The build is fully static and contains no API or server functions. No API key, server, database, environment variable, binding, or login is required. Cloudflare Pages can deploy the generated `web` directory directly. SPA deep links work through Cloudflare Pages' automatic fallback because the project intentionally has no `404.html`.

For Wrangler deployment:

```bash
npm ci
npm run build
npx wrangler pages deploy web --project-name zosuf
```

The advanced studio includes local templates, frames, shapes, logos, text layers, final-artwork verification and PNG/JPEG/WebP/SVG-wrapper export. Image processing, QR creation, scanning, and saved templates stay in the browser.
