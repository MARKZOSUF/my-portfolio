# ZOSUF Second-Pass Deep Rescan

## Additional fixes in this build

- Prevented stale verification state from leaving QR downloads enabled after payload or design changes.
- Fixed direct-image sliders so processing failures are caught and shown instead of becoming unhandled promise rejections.
- Added Cloudflare upload MIME and size checks before network upload.
- Made `PUBLIC_R2_DOMAIN` work with or without `https://` and normalized trailing slashes.
- Rejects malformed R2 object keys and adds `nosniff` to image responses.
- Retains and stops ZXing camera decoder controls so scanning loops cannot survive camera shutdown.
- Validates persisted scanner history before rendering it.
- Added image decoder failure handling for scanner uploads.
- Added visible Image Tools validation and processing errors, plus JPG/PNG/WebP and 20 MB limits.
- Removed duplicate QR frame-label drawing.
- Revokes failed QR export object URLs.
- Simplified Vite configuration and removed obsolete AI Studio comments and mojibake.

## Validation

- Archive integrity: passed
- Static audit: passed
- JavaScript/TypeScript/TSX parse: 41 files, 0 syntax failures
- Relative imports: 0 missing
- Forbidden live ZIP/Gemini/API references: none
- Nested ZIPs and generated dependencies: excluded

## Build environment note

The sandbox cannot download this project's npm packages, so final Vite bundling and browser rendering must run after `npm install` locally or on Cloudflare Pages. Source syntax, imports, security markers, archive structure and deterministic static checks passed.
