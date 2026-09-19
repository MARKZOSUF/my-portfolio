# ZOSUF

Privacy-first QR studio, Image-to-QR generator, QR scanner, image tools, safe prank QR creator and poster maker.

Creator: [@markzosuf](https://instagram.com/markzosuf)  
Production URL: `https://zosuf.pages.dev`

Core features require no login, database, external AI API, or QR API.

## Local setup

```bash
npm install
npm run dev
```

## Validate and build

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

## Cloudflare Pages

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Root directory: /
Node version: 20
```

`public/_redirects` provides SPA route fallback. No environment variable is required for core tools.

## Push from VS Code

```bash
git init
git add .
git commit -m "Initial ZOSUF production app"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Connect that repository in Cloudflare Workers & Pages. Future pushes deploy automatically.

## Image-to-QR modes

1. **Public Image URL:** encodes a public HTTPS URL and works without a backend.
2. **Direct Small Image:** compresses locally and only succeeds when the data URL fits QR capacity. Normal photos are too large.
3. **Cloudflare Upload:** optional R2 hosting through Pages Functions.

### Optional R2 setup

1. Create an R2 bucket in Cloudflare.
2. Open the Pages project → Settings → Functions → R2 bucket bindings.
3. Add binding `ZOSUF_IMAGES` and choose the bucket.
4. Redeploy.
5. Optional: add `PUBLIC_R2_DOMAIN=images.example.com` as a Pages environment variable.

Without R2, the cloud option reports unavailable while all core tools keep working. Uploads accept JPG, PNG and WebP up to 10 MB and use random object keys.

## Advertising

Ads are disabled in `src/config/ads.ts`. After AdSense approval, add only the approved publisher and slot IDs and update `public/ads.txt`. Never use fake IDs.

## Branding and domain

Update `src/config/site.ts`, `index.html`, `public/sitemap.xml` and `public/robots.txt` if the final domain changes. Logos are in `src/assets/Logos.tsx` and `public/favicon.svg`.

## Privacy and safe prank links

Image processing and core QR generation run in the browser. Camera frames are not uploaded. Saved styles and optional scan history stay in localStorage and can be cleared from the footer. Prank data is length-limited, URL-safe, rendered as React text and never requests credentials, camera, microphone or location.

## Troubleshooting

- Use Node 20.
- If build fails, delete `node_modules`, run `npm install`, then `npm run typecheck` and `npm run build`.
- If direct routes return 404, confirm `_redirects` is present in `dist`.
- If R2 mode is unavailable, verify the binding name is exactly `ZOSUF_IMAGES` and redeploy.
- Camera scanning requires HTTPS and user permission.
- If direct image QR is too large, use a public URL or R2.
- If QR download is disabled, simplify colors/logo until local verification succeeds.

The source ZIP is a developer delivery artifact only. The live website does not offer project-source or ZIP downloads.
