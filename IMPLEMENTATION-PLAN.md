# Implementation plan

Derived from the static scan report (`STUDYFORGE-TURBO-AI-FULL-SCAN-REPORT.md`)
after verifying **every** reported issue against the actual source, plus defects
found during the independent audit.

Source archive SHA-256: `dcb0d7863f3f806ed498fa90410559c79e055f121813a7cdfb8bae81b6c4a376`
Files inventoried: 522 (436 after junk/backup removal).

## P0 - blocking defects (all confirmed in source, all fixed)

| # | Defect | Verified at | Fix |
| --- | --- | --- | --- |
| P0-1 | Research provider URLs shipped as `{{https://...`, so every keyed provider request was malformed | `backend/app/research/engine.py:40-42` | New `app/research/providers.py` with tested URL constants; engine rewritten around a `SearchRouter` |
| P0-2 | Production build silently fell back to `http://10.0.2.2:8000/api/v1` | `mobile/app.json:110`, `mobile/constants/config.ts:17`, `mobile/services/api/client.ts:2` | `resolveApiUrl()` guard; production requires public HTTPS and rejects localhost/127.0.0.1/10.0.2.2/private LAN/missing URL with an explicit error |
| P0-3 | Cleartext traffic enabled for all builds | `mobile/app.json:98`, `AndroidManifest.xml:17` | Release manifest TLS-only + strict network security config; cleartext confined to the debug source set |
| P0-4 | `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` requested in production; `allowBackup="true"` | `AndroidManifest.xml` | Permissions removed (scoped storage + SAF cover all real features); backup disabled |
| P0-5 | Release builds signed with the debug keystore | `mobile/android/app/build.gradle:115` | Release signing from untracked `keystore.properties` / CI secrets, with a fail-fast error when unconfigured |
| P0-6 | Mobile called `/research` while the backend exposed `/research/jobs` | `mobile/constants/config.ts`, `backend/app/api/v1/research/routes.py` | Unified job contract for research and the new study-pack pipeline; contract asserted by tests |
| P0-7 | AI router raised `RuntimeError('AI_API_KEY required')` and sent `Bearer ` with an empty value to keyless runtimes | `backend/app/ai/models/router.py` | Rewritten router: cloud + approved self-hosted providers, host allow-list, circuit breaker, structured errors; the Authorization header is omitted entirely when keyless |
| P0-8 | PDF export was a primitive line-by-line Helvetica canvas dump | `backend/app/api/v1/export/routes.py` | New ReportLab Platypus renderer with cover page, TOC, running headers/footers, Unicode Latin + Devanagari |

## P1 - product requirements

1. Deterministic topic classification from the topic alone (`app/topics/classifier.py`).
2. Structured note model with the 33-section catalogue, JSON/Markdown/sanitized HTML/PDF renderings (`app/notes/structure.py`).
3. Citation and claim-support validation; unsupported claims removed and disclosed (`app/studypack/builder.py`).
4. Deterministic mathematics validation with exact rational arithmetic and optional SymPy (`app/validation/math_validator.py`).
5. Sixteen-stage resumable job with cancel/retry/idempotency (`app/studypack/pipeline.py`, `app/api/v1/studypack/routes.py`).
6. Responsible exam intelligence: verified-PYQ provenance, transparent priority categories, banned-phrase enforcement, mandatory disclaimer.
7. Free-product cleanup and Alembic migration `0012_free_product`.
8. Structured in-app note viewer replacing raw Markdown.

## P2 - hardening and operations

1. Configuration placeholders for backend, mobile, Android, Railway and CI.
2. `scripts/validate_environment.py` and `npm run config:check`.
3. Complete documentation set and honest `TEST-REPORT.md` / `KNOWN-GAPS.md`.
4. `.gitignore` hardening and a pre-packaging secret scan.
