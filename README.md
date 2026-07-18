# MARKZOSUF AI NEXUS V18.0 — COMMAND CENTER

Open the floating **Nexus Command Center** button to access 30 advanced AI missions across Study, Coding, Creation, Agents and Monetization. Shortcut: `Ctrl + Shift + K`.

# MARKZOSUF AI NEXUS v18.0.0

Advanced responsive production build for mobile, tablet and desktop.

# MARKZOSUF AI NEXUS V15.1.0

A production-oriented Cloudflare Pages AI workspace with multi-provider chat, live research, projects, file storage, scheduled tasks, image tools, accounts and optional payments.

## What works without server configuration

- Responsive chat UI, local conversations, prompts, bots, notebooks and artifacts
- Browser file library, CSV/JSON Data Lab and code preview
- PWA installation and offline application shell
- Local reminders, voice input where supported and export tools

## What requires Cloudflare bindings or secrets

| Capability | Required configuration |
|---|---|
| AI chat and images | Workers AI binding `AI`, or a supported provider key plus model name |
| Accounts, sync, usage and limits | D1 binding `DB` and `schema.sql` |
| Cloud files | R2 binding `FILES` |
| Rate limiting | KV binding `RATE_LIMIT`, or the D1 rate-limit table |
| Login protection | Turnstile site and secret keys |
| Email verification/recovery | Resend key and sender |
| Full-web research | Brave, Tavily or Serper key |
| Payments | Verified Stripe or Razorpay configuration and `ENABLE_PAYMENTS=true` |
| Background tasks | Separate Cron Worker in `scheduled-worker.js` |

Optional integrations stay disabled until configured. Provider names shown in the UI reflect the public `/api/config` capability response; secrets are never returned to the browser.

## V11.1 production fixes

- Authentication, integration and expensive AI routes now have shared rate limits and access checks.
- Guest AI is denied by default; enable it explicitly with `ALLOW_GUEST_AI=true`.
- Turnstile is connected to login, signup, recovery and verification UI.
- Google sign-in accepts only verified Google email claims.
- Admin integrations require an admin account or constant-time checked admin token.
- Drive redirects are allowlisted; public share input and uploaded files are owner-scoped.
- Stripe webhooks and Razorpay signatures are verified before a plan is upgraded.
- Paid plans expire correctly for fixed-period Razorpay purchases.
- Sessions store their own IP, country and device instead of showing unrelated login events.
- Provider/model profiles, research source availability and billing labels are honest about configuration.
- Security headers, PWA caching, HTML validation, CI checks and deployment documentation are included.

## Deploy

Read [SETUP-CLOUDFLARE.md](SETUP-CLOUDFLARE.md). Do not use the Cloudflare dashboard drag-and-drop uploader for this build: it does not compile the `functions/` directory. Deploy through a Git-connected Pages project or Wrangler.

Quick outline:

```bash
cp wrangler.toml.example wrangler.toml
npx wrangler d1 execute markzosuf-ai-nexus --remote --file=schema.sql
npx wrangler pages deploy . --project-name=markzosuf-ai-nexus
```

Replace all placeholder IDs before deployment and keep secrets in Cloudflare, not in Git.

## Updating an existing database

- New database: run only `schema.sql`.
- Existing V10/V11 database: run `MIGRATE-V11-1.sql` once.
- Older database: run the historical migrations in version order, then `MIGRATE-V11-1.sql` once.

Back up D1 first. Migration files containing `ALTER TABLE` are intentionally one-time operations.

## Validation

```bash
npm install
npm run check
```

The check parses project JavaScript, validates CSS/HTML/JSON, imports every Pages Function module, exercises core API responses, verifies bundled browser libraries, and tests service-worker installation plus offline navigation.

Optional real-browser smoke test (Microsoft Edge or Google Chrome):

```bash
npm run check:browser
```

## Security notes

- Keep `ALLOW_GUEST_AI=false` for public deployments unless anonymous AI usage is intentional.
- Set `PUBLIC_HOSTNAME` when Turnstile is enabled.
- Enable payments only after webhook/signature testing in the provider sandbox.
- Owner tokens for Google Workspace, Notion and webhooks make those integrations single-owner features. They are admin-only in this build.
- Review [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md) and [TERMS.md](TERMS.md) before launching publicly.

## Project structure

```text
assets/                  Frontend CSS, JavaScript and images
functions/api/           Cloudflare Pages API routes
functions/_shared/       Authentication, security and live-service helpers
schema.sql               New D1 database schema
MIGRATE-V11-1.sql        One-time V11.1 database upgrade
scheduled-worker.js      Optional Cron Worker
wrangler*.toml.example   Deployment templates
scripts/*.mjs            Project, API, service-worker, vendor and browser checks
```

© 2026 MARK ZOSUF. Review the included terms before public or commercial use.

## V11.2 reliability fixes

- `FILES` R2 and `RATE_LIMIT` KV are optional. Local browser files and safe fallback rate limiting remain available.
- Turnstile activates only when both keys are configured and `REQUIRE_TURNSTILE=true`; the starter config keeps it off.
- Workers AI automatically falls back across compatible Cloudflare models.
- Gemini responses now parse the provider's `candidates[].content.parts[]` format.
- Open `/api/health` after deployment to check AI, DB, R2, KV and D1 schema status without exposing secrets.
- The release ZIP is flat: `index.html` is at the archive root.


## V11.3 guest AI repair

- Fixed `Sign in is required to use AI services` for signed-out visitors.
- Guest AI is enabled by default.
- Added explicit `REQUIRE_SIGN_IN_FOR_AI` override.
- Added configurable guest and per-minute limits.
- `/api/config` and `/api/health` now show the effective guest-access status.


## V11.4 stable responsive release

- Rebuilt the final desktop and mobile page grid so chat messages never sit beneath the composer.
- Fixed clipped desktop login/sign-up controls and narrow-laptop topbar collisions.
- Added bounded, scrollable code blocks with language labels, copy feedback and desktop expand/collapse.
- Fixed mobile keyboard viewport resizing, safe-area composer positioning and horizontal action overflow.
- Added a deterministic greeting response so short messages such as `hlo` cannot produce unrelated code.
- Added a latest-message priority rule to prevent stale coding/research context from taking over a new topic.
- Preserved guest AI, realtime services, projects, files, artifacts and provider fallbacks.
- Bumped the service-worker cache to V11.4.


## V15.1.0 production stability release

- Replaced the browser-incompatible Highlight.js CommonJS URL that caused `require is not defined`.
- Bundled Markdown, sanitization, syntax-highlighting, and PDF assets so core features do not depend on a public CDN.
- Added final desktop/mobile viewport, safe-area, sidebar, dialog, overflow, and touch-target fixes.
- Rebuilt the V15.1.0 service-worker cache and offline navigation recovery.
- Enabled same-origin camera capture on mobile while keeping other permissions restricted.
- Added API, service-worker, vendor, asset-version, DOM-reference, and CSS validation.
