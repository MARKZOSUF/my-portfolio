# StudyResearch AI

Evidence-grounded Flask study workspace with Full Research Mode, Document
Study Mode, safe source extraction, dual web/document citations, local RAG
chat with bounded history, adaptive quizzes, versioned notes and flashcards,
syllabus coverage, PDF export, accounts with a complete account UI, usage
limits, an admin dashboard, and Docker deployment.

## One-key AI configuration

Exactly one external key is used: `AI_API_KEY`. `SECRET_KEY` is a local Flask
session/CSRF secret, not an external API key. Local hashing embeddings,
document parsing, ClamAV scanning, and PDF export require no other keys.

| Provider | Generation | Streaming | Web search | Effective mode |
|---|---:|---:|---:|---|
| OpenAI | Yes | Yes | Yes | Full Research |
| Perplexity | Yes | No | Yes | Full Research |
| Gemini | Yes | No | No | Document Study |
| OpenRouter | Yes | No | No | Document Study |
| Groq | Yes | No | No | Document Study |
| DeepSeek | Yes | No | No | Document Study |
| Anthropic | Yes | No | No | Document Study |

Capabilities are explicit adapter declarations, not inferred from key
prefixes. Requesting Full Research with a generation-only provider returns a
structured `WEB_SEARCH_NOT_SUPPORTED` error — no silent fallback, no
fabricated URLs. Document Study Mode never performs web search, even with a
search-capable provider, and requires at least one uploaded document.

## Quick start (Linux/macOS)

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"  # put output in SECRET_KEY
flask db upgrade
flask run
```

Windows PowerShell: `py -3.11 -m venv .venv`, `.venv\Scripts\Activate.ps1`,
then the same pip/copy/upgrade/run steps.

## First administrator

Run interactively on the trusted server: `flask create-admin`. The command
prompts for email/password and never accepts a password on the command line.

## Development validation

```bash
python -m compileall .
pytest -q
pytest --cov=. --cov-report=term-missing
node --check static/js/app.js
node --check static/js/research.js
node --check static/js/admin.js
flask db upgrade && flask db downgrade && flask db upgrade   # disposable DB
```

Tests use fake/mocked providers and make no real AI calls.

## Docker

```bash
cp .env.example .env
# REQUIRED: set a real AI_API_KEY, a 32+ char SECRET_KEY, and replace every
# change-this-db-password placeholder in docker-compose.yml
COOKIE_SECURE=true docker compose up --build -d
docker compose exec web flask create-admin
curl -fsS http://localhost:5000/api/health/ready   # readiness smoke check
docker compose logs -f web worker
```

Production validation requires PostgreSQL, Redis/RQ, Redis rate limiting,
secure cookies, and ClamAV. The web container runs `flask db upgrade` before
Gunicorn; web and worker wait for healthy PostgreSQL and Redis; the Docker
healthcheck uses `/api/health/ready` and fails on degraded status.

## Production checklist

HTTPS + HSTS behind a reverse proxy (SSE buffering disabled for
`/api/research/*/events`), `COOKIE_SECURE=true`, random 32+ character secret,
PostgreSQL backups, Redis AOF persistence, RQ workers, ClamAV with fresh
signatures, private upload volume, reviewed migrations (`flask db upgrade`
on deploy), monitoring of `/api/health/ready`, scheduled
`flask cleanup-orphans` and `flask recover-stuck`, dependency scanning, and
tested restore procedures. See docs/DEPLOYMENT.md and docs/OPERATIONS.md.

## Limitations (honest)

- Citation grounding and source quality are labeled heuristics, not
  independent factual verification.
- The document-parse timeout is cooperative (checked between pages/slides),
  not a hard subprocess kill.
- Document Study Mode sends document text to the configured external AI
  provider.
- The development thread executor is not crash-safe; production must use RQ
  (enforced by config validation).
- AI output can be inaccurate; verify high-stakes information against primary
  sources.

## Documentation index

- docs/ARCHITECTURE.md · docs/DATA_FLOW.md · docs/DATA_MODEL.md
- docs/AI_PROVIDERS.md · docs/CITATION_MODEL.md
- docs/SECURITY.md · docs/THREAT_MODEL.md
- docs/DEPLOYMENT.md · docs/OPERATIONS.md · docs/TESTING.md
- docs/API.md · docs/CONFIGURATION.md
- docs/ADR/ (architecture decision records 0001–0006)
- CHANGELOG.md · AUDIT_REPORT.md · VALIDATION_REPORT.md · migrations/README.md
