# Changelog

All notable changes from StudyResearch-AI-Fixed to StudyResearch-AI-Advanced.

## Added

- Dual citation model: web `[n]`, document `[Dn]`, page/slide `[Dn:pX]` /
  `[Dn:slideX]`, taught in the synthesis prompt and validated end to end.
- Claim grounding: existence + non-empty excerpt matching with honest
  statuses (`supported`, `partially_supported`, `needs_verification`,
  `contradicted`); conflicting evidence stays visible.
- Provider readiness gate (`require_ai_ready`): AI-disabled/missing-key/
  unsupported-provider requests fail before quota, session, or job creation.
- `GET /api/research/provider` server-safe capability endpoint; extended
  `provider_status` (supported/enabled/configured/ready/capabilities/mode).
- Account UI: signed-in user menu, logout, change-password dialog,
  logout-all with confirmation, loading/disabled states, autocomplete
  attributes, keyboard accessible, mobile responsive, no inline scripts.
- Chat history: owner-only `GET /api/chat`, bounded history in prompts with
  strict delimiters (system rules / untrusted history / untrusted evidence /
  current question); frontend renders history with empty/loading/error states.
- Adaptive quiz: immutable `QuizAttempt` records, difficulty progression
  (low→easy, medium→medium, high→hard), new-version generation, preserved
  history, frontend "Generate harder quiz" / "Continue at medium" /
  "Review easier questions" buttons.
- Central MCQ validation (question, exactly 4 distinct options, answer ∈
  options, defaulted explanation); empty quiz rejected with `QUIZ_EMPTY`.
- Flashcard versioning: normalized case-folded hashes, in-response dedupe,
  per-card race-tolerant inserts, archive-instead-of-delete regeneration
  preserving study progress, `FLASHCARDS_EMPTY` safe rejection, Regenerate UI.
- Health endpoints: `/api/health/live` and `/api/health/ready` (503 on
  database/Redis/config failures; never calls the paid provider);
  backward-compatible `/api/health`.
- `POST /api/research/<id>/retry` for failed sessions (no extra quota).
- `flask recover-stuck` CLI for stuck queued/running sessions.
- Explicit Alembic revisions `0001_initial` + `0002_adaptive_study` and a
  schema-parity migration test.
- `gunicorn.conf.py`, `.dockerignore`, compose healthchecks with
  `service_healthy` dependencies, restart policies, Redis AOF.
- Docs: DATA_FLOW, DATA_MODEL, AI_PROVIDERS, CITATION_MODEL, THREAT_MODEL,
  OPERATIONS, TESTING, CONFIGURATION, ADR 0001–0006; rewritten README,
  API, SECURITY, DEPLOYMENT, ARCHITECTURE.

## Fixed

- Research pipeline ignored `study_mode`: Document Study with a web-capable
  provider (e.g. OpenAI with live research off) performed web searches.
  Search now runs only when `study_mode == "full_research"` and the provider
  declares web search; document mode without documents is rejected
  (`DOCUMENTS_REQUIRED`); follow-ups inherit the parent mode.
- Claims were marked "verified" when any source ID existed; replaced by
  evidence-grounded statuses.
- `AI_FEATURES_ENABLED` was never enforced.
- Enqueue failure left sessions queued forever; now marked failed with quota
  refund.
- Chat stored messages but never used them; prompts had no trust delimiters.
- Quiz "adaptive" was a label only; invalid MCQs (3 options, answer outside
  options) were stored.
- Duplicate flashcards could violate the uniqueness constraint and fail;
  regeneration deleted cards and study progress.
- Malformed PDF/Office files could surface 500s with parser internals; all
  parser failures now normalize to structured 4xx; upload uniqueness races
  map to safe reuse with temp-file cleanup.
- Docker healthcheck used a non-failing endpoint; compose started web/worker
  before PostgreSQL/Redis were ready; no restart policies.
- Migration used `create_all`/`drop_all`; replaced with explicit operations.

## Security

- Prompt-metadata sanitization for document filenames/source titles
  (`sanitize_prompt_text`) so user metadata cannot break prompt delimiters.
- Provider/health/admin surfaces verified free of key material.
- Readiness, rate limits, ownership checks, SSRF/DNS-rebinding defenses,
  archive-bomb protections, and strict CSP verified and extended by tests.

## Migrations

- `0001_initial`: explicit full schema (tables, keys, constraints, indexes).
- `0002_adaptive_study`: `flashcard.is_current`, document reference columns
  on `research_fact`, new `quiz_attempt` table.

## Tests

- New suites: research modes, citations, provider readiness, account, chat,
  quiz, flashcards, uploads, health, jobs, migrations, frontend static.
- All external AI/network calls mocked; no real provider credits consumed.
