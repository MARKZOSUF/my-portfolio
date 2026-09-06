# Production readiness

| Area | Status | Evidence / limitation |
|---|---|---|
| Preserved architecture | PASS | Expo Router + TypeScript + FastAPI + PostgreSQL/pgvector + Alembic + Redis/Celery + Docker remain. |
| Deep research control flow | PASS | Multi-query plan, provider fallback, safe fetch, source scoring, evidence graph, SSE events, cancel, explicit capability states. |
| Real search providers | NOT TESTED | No Tavily/Brave/Serper credentials were available. |
| AI synthesis | NOT TESTED | No production LLM credential was available; development mode refuses to claim researched synthesis. |
| RAG core | PASS | Hybrid lexical/vector ranking, metadata provenance, owner isolation, dedupe, context budget. |
| Document extraction | PARTIAL | Static/core validation ran; scanned PDF/provider/malware staging tests are NOT TESTED. |
| Auth lifecycle | PARTIAL | Rotation/reset implementation exists; SMTP and database-backed API tests NOT TESTED. |
| Security | PARTIAL | SSRF, MIME, archive, request size, ownership, headers, secret guards added; distributed rate limit/pentest pending. |
| Mobile | PARTIAL | Syntax parsed; real Android/iOS, offline interruption, accessibility, and store builds NOT TESTED. |
| Database migration | NOT TESTED | Requires clean PostgreSQL/pgvector service. |
| Docker | NOT TESTED | Docker daemon unavailable/not exercised. |
| CI/CD | PASS | PR workflow covers syntax, tests, migration config, mobile checks, secrets/dependencies. |
| Admin/push | FAIL | Architecture is not production-complete. Billing is out of scope. |

## Required external services
PostgreSQL 16 + pgvector, Redis, Celery workers, S3-compatible storage, ClamAV, SMTP transaction provider, one production LLM, one production embedding provider, Tavily/Brave/Serper, Sentry/metrics sink, APNs/FCM/Expo credentials, Apple/Google signing identities, and backup storage.

## Launch decision
**NO-GO for public production.** The project is a materially upgraded, security-aware staging candidate, not a claim of fully tested production completion. Clear capability failures replace fake outputs when providers are absent.
