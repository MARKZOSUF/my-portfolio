# V17.0.0 — Nexus Command Center

- Added advanced Study OS, Coding Lab, Creator Studio, Agent Hub and Monetization modules.
- Added 30 launchable AI missions connected to the existing chat composer.
- Added local XP, AI credits, learning streak, mission tracking and daily rewards.
- Added responsive command-center interface and keyboard shortcut Ctrl/⌘ + Shift + K.
- Added monetization-ready native ad placeholder without enabling intrusive ads.
- Preserved existing Cloudflare AI, authentication, payments, PWA and responsive features.

# Changelog

## 15.1.0 - Desktop and mobile reliability release

- Replaced the broken browser-incompatible Highlight.js CommonJS URL with a bundled browser build.
- Bundled markdown, sanitization, syntax highlighting, and PDF runtime assets for reliable core loading without a CDN.
- Added final mobile/desktop viewport, overflow, safe-area, dialog, sidebar, and touch-target fixes.
- Added an accessible mobile sidebar scrim and synchronized dynamic dialog accessibility state.
- Reworked the service worker with a new cache version, deterministic pre-cache checks, offline navigation fallback, and cache-first static assets.
- Enabled same-origin camera access for the mobile capture workflow.
- Added API module smoke tests and stronger validation for asset versions, DOM references, local browser dependencies, and service-worker coverage.

## 11.5.0 — 2026-07-14

- Production stability, responsive UI, streaming and service-worker hardening.
- Browser storage and optional external-service recovery.

## 11.2.0 — 2026-07-14

- Fixed Turnstile misconfiguration locking login, signup and guest chat.
- Added KV/D1/in-memory rate-limit fallback so optional bindings do not crash the API.
- Made R2 cloud storage optional while preserving local browser file storage.
- Added multiple Workers AI fallback models and clearer paid-plan model errors.
- Fixed Gemini response extraction for the current candidates/content/parts response shape.
- Added `/api/health` for safe binding and D1 schema diagnostics.
- Bumped all PWA asset versions and flattened the release ZIP root.
- Updated CI to Node 24 and package engine requirements.

## 11.1.0 — 2026-07-14

- Added shared authentication, admin authorization, rate limiting and safe error middleware.
- Closed unauthenticated owner integration and guest-plan bypasses.
- Added verified Stripe and Razorpay payment activation flows.
- Added plan expiry, payment, rate-limit and accurate session metadata schema changes.
- Improved Drive redirect validation, file downloads, share validation and task ownership.
- Corrected provider configuration, model profiles, reasoning labels and research availability.
- Added Turnstile lifecycle support to all authentication entry points.
- Updated PWA cache coverage, manifest metadata, security headers and deployment guidance.
- Added HTML/JavaScript validation, CI, privacy/terms templates and security policy.

## 16.0.0 — Advanced Responsive Rebuild
- Added a single authoritative responsive layout layer to stop legacy CSS collisions.
- Fixed desktop content mixing by enforcing a stable two-column shell.
- Changed the workspace panel to a non-destructive overlay on desktop and tablet.
- Rebuilt mobile navigation as a solid, sharp panel with no blur or backdrop filter.
- Added phone, portrait-tablet, landscape-tablet, compact-desktop, and wide-desktop safeguards.
- Improved topbar overflow, message/code wrapping, composer sizing, safe areas, dialogs, and landscape mode.
- Updated service-worker cache and production asset versions.
