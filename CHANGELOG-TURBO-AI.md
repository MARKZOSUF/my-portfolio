# Changelog - Turbo AI transformation

## P0 fixes

- **Research provider URLs.** Replaced the malformed `{{https://...` literals with
  tested constants in the new `backend/app/research/providers.py`; rebuilt
  `engine.py` around a `SearchRouter` that reports `providers_used` and
  `research_limitations`.
- **Production API URL.** Removed the `http://10.0.2.2:8000/api/v1` fallback from
  `mobile/constants/config.ts`, `mobile/services/api/client.ts` and
  `mobile/app.json`. Added `resolveApiUrl()` with production rejection of missing
  URLs, plain HTTP, localhost, `127.0.0.1`, `10.0.2.2` and private LAN ranges.
- **Cleartext traffic.** Disabled in release; added strict and debug-only network
  security configurations plus a debug manifest override.
- **Permissions.** Removed `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` and
  `SYSTEM_ALERT_WINDOW`; set `allowBackup="false"`.
- **Release signing.** Release builds now use an upload key from the untracked
  `keystore.properties` or CI secrets and fail fast when it is missing.
- **Route contracts.** Unified `/research/jobs...` and added the `/studypack/...`
  job contract; asserted by tests on both sides.
- **AI router.** Rewritten: cloud and approved self-hosted providers, per-task
  models, fallback, circuit breaker, structured errors, host allow-list, and the
  `Authorization` header omitted entirely for keyless runtimes.
- **PDF export.** Replaced the line-by-line Helvetica canvas dump with a
  Platypus document renderer.

## New backend modules

`app/research/providers.py`, `app/topics/classifier.py`,
`app/validation/math_validator.py`, `app/notes/structure.py`,
`app/pdf/renderer.py`, `app/studypack/builder.py`, `app/studypack/pipeline.py`,
`app/api/v1/studypack/routes.py`, `app/workers/studypack_tasks.py`,
`backend/scripts/validate_environment.py`.

## Rewritten or patched

`app/research/engine.py`, `app/ai/models/router.py`,
`app/ai/models/openai_compatible.py`, `app/config/settings.py`,
`app/api/v1/export/routes.py`, `app/api/v1/router.py`.

## Database

`0012_free_product_remove_billing` drops `entitlements`, `subscriptions` and
`plan_definitions` child-first with existence guards, and can be downgraded.

## Free product

Removed `billing_provider` and `billing_webhook_secret` settings and every
subscription/premium/paywall/upgrade surface. Neutral AI usage accounting and
fair-use limits are preserved.

## Mobile

New topic-only screen with the 16-stage progress UI, cancel, retry and
close/reopen recovery (`app/(main)/studypack/index.tsx`,
`features/studypack/useStudyPack.ts`); structured note viewer with TOC,
collapsible sections, typed blocks, search, bookmarks, font scaling, dark mode
and sanitized links (`components/notes/StructuredNoteViewer.tsx`); Jest
regression tests for configuration and Android release settings.

## Configuration and documentation

All eight placeholder files, a hardened `.gitignore`, environment validation for
backend and mobile, and the full documentation set including an honest
`TEST-REPORT.md` and `KNOWN-GAPS.md`.

## Cleanup

Removed `mobile/.git`, `mobile/.idea`, `android-broken-20260829-120406`,
`node_modules`, `.expo`, Gradle/CXX caches, build outputs, `__pycache__`, stray
`.env`/`local.properties` files and backup copies: 522 files reduced to the
cleaned project tree.
