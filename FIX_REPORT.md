# ZOSUF — Deep Scan & Production Fix Report

Scope: full source audit, QR payload correctness, Cloudflare Pages deep-link
reliability, scanner flows, strict TypeScript, and an automated test suite.
No API, no Worker, no new runtime or build dependency was added.

---

## 1. Image-to-QR now encodes a real HTTPS link

**Before:** the "Embedded / Direct" mode was conceptually built around putting
image bytes into the matrix. A `data:image/...;base64,` payload encodes fine but
virtually no stock phone camera will open one, and it exceeds QR capacity long
before the picture is legible.

**Now:**

- `ImageToQR` builds its payload with `buildSiteLinkPayload(siteConfig.productionUrl)`,
  which always yields the absolute canonical link `https://markzosuf.pages.dev`.
- The uploaded image is still processed and previewed entirely on-device.
- `QRRenderer` carries a hard guard (`isUnscannablePayload`): a `data:` URI can
  never reach the encoder, no matter which screen calls it.
- `QRGenerator`'s `custom-url` type rejects `data:`, `javascript:`, `vbscript:`
  and `file:` while still allowing legitimate app schemes (`upi:`, `spotify:`, `geo:`).
- Download buttons are disabled unless the payload is an absolute `http(s)` URL
  *and* the rendered code has been optically decoded back.
- The misleading "Image preview is local-only" error (which rendered inside a
  red *payload too large* box that could never trigger) was replaced with an
  honest note showing the exact URL that will be encoded.

New helpers in `src/utils/qrPayloads.ts`: `isUnscannablePayload`,
`isPhoneScannableLink`, `buildSiteLinkPayload`.

---

## 2. Designs, templates, frames and logos are preserved

**This was the most damaging defect found.** `qrSafety.makeSafeQRConfig` ran on
*every* render and unconditionally overwrote `dotType`, `cornerSquareType`,
`cornerDotType`, both corner colours, the gradient, and forced error correction
to `H`. The 77 pre-made templates, 41 frames, logo settings and every colour
choice were being silently discarded in both the preview and the export.

**Now a two-stage pipeline:**

1. **Attempt the user's design.** `enforceQRMinimums` / `enforceShapesMinimums`
   apply only physical necessities: a quiet-zone floor, a logo-area cap derived
   from the selected EC level (L 10% / M 14% / Q 20% / H 28%), and correction of
   a genuinely undecodable palette (contrast below 2.2:1). Dot shapes, corner
   shapes, gradients, brand colours, EC level, frames and labels are untouched.
2. **Repair only after a real decode failure.** If local optical verification
   fails, `repairQRConfig` / `repairShapesConfig` render a flattened
   high-contrast fallback and the UI shows an **"Auto-repaired for scannability"**
   badge explaining what to change. Frames, labels and text layers survive even
   this path. If neither version decodes, the original design is restored on
   screen and the failure is reported honestly rather than faked.

Applies to both `QRRenderer` (Image-to-QR, Prank QR) and `StudioLivePreview`
(QR Design Studio). Exports and the frame compositor read the config that was
actually verified, so a download always matches what was checked.

---

## 3. Cloudflare Pages: no 404, no stale reload — static only

- `web/_redirects` → `/* /index.html 200`, written by the post-build script.
- **Service worker is build-stamped.** `public/sw.js` ships a
  `__ZOSUF_BUILD_ID__` placeholder; `scripts/ensure-pages-fallback.mjs` replaces
  it with a hash of the emitted asset filenames. Every deploy therefore produces
  a byte-different `sw.js`, which is what forces browsers to install the new
  worker and drop the old cache. **This was the root cause of stale reloads** —
  the previous worker had a hand-written `zosuf-shell-v4` constant that never
  changed between deploys.
- **Strategy per request type:** navigations are network-first with the cached
  shell as offline fallback; `/assets/*` (content-hashed) are cache-first;
  everything else is stale-while-revalidate. Cross-origin requests are ignored,
  and **any request carrying a query string is never cached** so one visitor's
  `/p?d=…` prank payload can never be served to another.
- `main.tsx` reloads exactly once on `controllerchange`, and only when a worker
  was already controlling the page, so a first install no longer reloads a
  perfectly fresh page. The registration also re-checks for a new deploy when
  the tab becomes visible.
- `public/_headers` gained an explicit revalidate rule for every SPA route
  (`/`, `/qr-scanner`, `/prank-qr`, `/image-to-qr`, …), `no-store` for `/p`, and
  kept `immutable` for `/assets/*` and `no-store` for `/sw.js`.
- `scripts/ensure-pages-fallback.mjs` is now **fail-loud**: it verifies the
  bundle emitted, the SW placeholder was replaced, all deploy artefacts exist,
  `index.html` no longer points at the dev entry, and that no `functions/`
  directory has appeared. Any of these fails the build.
- `robots.txt` now disallows `/p`; `RouteMeta` marks `/p` and unknown routes
  `noindex` and gives `/p` a proper title (it previously rendered as
  "Page Not Found — ZOSUF" despite working).

---

## 4. Scanner, prank and studio flows

- **Camera selection.** Device enumeration before permission returns empty
  labels, and the old code then picked `videoInputs[0]` — on most phones the
  **front** camera. It now stays on `facingMode: { ideal: 'environment' }` until
  the user explicitly chooses, and re-enumerates once labels are readable.
- **Camera errors.** A stale `deviceId` with `exact` throws
  `OverconstrainedError`; there is now a `facingMode` retry before giving up.
  Distinct messages for `NotAllowedError`, `NotFoundError`, `NotReadableError`
  and insecure-origin (`navigator.mediaDevices` absent) replace one generic
  string. Failed starts now fully tear down the stream instead of leaving
  `isScanning` true.
- **Clipboard** copies are awaited and caught (they reject on insecure origins).
- **Safety gate** anchors can never receive a non-`http(s)` scheme.
- **Riddle template**: the advertised "Tap to Reveal Answer" was never
  implemented — `showRiddleAnswer` was dead state. The answer is now split from
  the message and stays hidden behind a tap.
- **Choose-a-box**: `selectedBox` was set but never read, so picking a box gave
  no feedback. The chosen box is now highlighted and marked "Opened".
- **Image-to-QR** surfaced neither `isProcessing` nor `processError` — image
  failures were silently swallowed. Both are now rendered.
- **`MyTemplatesTab`** received an `onSaveCurrentAsTemplate` prop wired to an
  empty function; the vestigial prop was removed (saving is handled locally).
- **`ZosufWordmark`** accepted a `className` and never applied it.
- **`canvasComposer`**: with several text layers enabled, `availableH` could go
  negative and push the matrix above the frame, clipping it. `qrY` is now
  clamped inside the card. Two unused height pre-computations were removed.
- **`StudioLivePreview` UI**: the toolbar used `text-slate-300` on a
  `bg-slate-50` panel (invisible), and the light/dark stage toggle switched
  between two light backgrounds. Both fixed, along with the verification card's
  dark-theme colours that were unreadable on the studio's light panel.

---

## 5. Build health

- `tsconfig.json` now enables `strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch` and `forceConsistentCasingInFileNames`.
  **`tsc --noEmit` reports 0 errors.**
- Dead imports removed from 20 files (lucide icons, unused types, `React`
  defaults in files using only named hooks).
- `engines` relaxed to `>=20` and `.nvmrc` set to `22` — that is the Node
  version this build and full test suite were actually verified on. If your
  Pages project already builds green on Node 24, set `.nvmrc` back to `24`.
- No dependency added or removed.

---

## 6. Test suite

`npm test` runs three suites; `npm run verify` runs `build` then `test`.

| Suite | File | Covers |
|---|---|---|
| Static API-free audit | `tests/static-audit.mjs` | core files, 77 templates, 41 frames, no `functions/`, no forbidden deps, strict TS, payload + SW + headers rules |
| QR payload contract | `tests/qr-payload.mjs` | 34 assertions |
| Pages smoke + deep-link reload | `tests/pages-smoke.mjs` | 31 assertions |

`tests/qr-payload.mjs` bundles the **real source modules** with the project's own
Vite toolchain and exercises them in Node, so assertions run against shipping
code rather than a copy. No test dependency was added.

`tests/pages-smoke.mjs` serves `./web` using Cloudflare Pages' own resolution
order (exact file → `path/index.html` → `path.html` → `_redirects`) and applies
`_headers` with real specificity precedence, then asserts deep routes, reload
stability and cache correctness.

### Results

```
Static API-free audit ....... PASS   9 core files, 77 templates, 41 frames, strict TS, no API/Worker
QR payload contract ......... PASS   34 assertions
Cloudflare Pages smoke ...... PASS   31 assertions
tsc --noEmit ................ PASS   0 errors (strict)
npm run build ............... PASS   SPA fallback written, sw build id stamped
```

Deep routes verified to return `200` + SPA shell (not `404`):
`/qr-scanner`, `/prank-qr`, `/image-to-qr`, `/qr-generator`, `/image-tools`,
`/poster-maker`, `/about`, `/faq`, `/privacy`, `/terms`,
`/p?d=eyJ2IjoxfQ`, `/p?d=abc&utm_source=qr`, and nested unknown routes.
Reload stability confirmed on `/qr-scanner`, `/image-to-qr` and `/p?d=…`.

---

## 7. Deploying

Cloudflare Pages → connect the repo, then:

- Build command: `npm run build`
- Build output directory: `web`
- No environment variables, no Functions, no Workers, no bindings.

`wrangler.toml` already declares `pages_build_output_dir = "./web"` for
`wrangler pages deploy`. The prebuilt `web/` directory is included in this
archive, so it can also be drag-and-dropped into the Pages dashboard as-is.
