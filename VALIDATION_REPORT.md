# Validation report

Environment: sandbox with Python 3.13, Node 24, pypdf/python-docx/python-pptx/
reportlab/requests/beautifulsoup4 available; **no outbound network**, so Flask,
pytest, redis, rq, and Docker could not be installed or run here. Every command
below is marked honestly; anything not executed is NOT RUN with the exact
command for local verification.

| Command | Result | Notes |
|---|---|---|
| `python -m compileall .` | **PASS** | All Python sources compile (exit 0) |
| `node --check static/js/app.js` | **PASS** | Syntax valid |
| `node --check static/js/research.js` | **PASS** | Syntax valid |
| `node --check static/js/admin.js` | **PASS** | Syntax valid |
| Offline pure-module checks | **PASS** | 27/27: citation model (web/doc/page refs, supported/partially_supported/needs_verification/contradicted, excerpt matching, backward compat), MCQ validation, flashcard normalization/dedupe, document parser (malformed PDF → 422 DOCUMENT_PARSE_FAILED, archive-bomb ratio, encrypted-archive flag, bad ZIP → 415, invalid UTF-8 → 422, empty → 422, real DOCX round-trip), URL/SSRF blocklist, domain-spoof scoring, prompt-metadata sanitization, local RAG, syllabus analysis, PDF export smoke |
| `docker-compose.yml` YAML parse | **PASS** | Parsed with PyYAML; healthchecks/depends_on/restart policies present |
| ZIP integrity (`unzip -t`) | **PASS** | Final archive verified after packaging |
| Secret scan of tree | **PASS** | No `.env`, no keys, no `instance/`, no `__pycache__`, no `*.db` in the archive |
| `pytest -q` | **NOT RUN** | Flask/pytest not installable (no network). Run after `pip install -r requirements.txt`. Suite: 18 files, ~90 tests incl. all spec-mandated cases; all provider/network calls mocked |
| `pytest --cov=. --cov-report=term-missing` | **NOT RUN** | Same reason; config in `pyproject.toml` |
| `flask db upgrade` / `downgrade` / `upgrade` | **NOT RUN** | Flask unavailable here. `tests/test_migrations.py` automates exactly this plus schema parity; revisions use explicit `op.*` operations only |
| `docker compose config` | **NOT RUN** | Docker unavailable; YAML validated instead |
| `docker build .` | **NOT RUN** | Docker unavailable |
| `docker compose up` smoke test | **NOT RUN** | Docker unavailable; smoke steps documented in docs/DEPLOYMENT.md |
| Browser visual QA | **NOT RUN** | No browser + no app runtime (Flask missing). Static checks cover no-inline-script, no-innerHTML, DOM-id wiring, CSP, touch targets, reduced motion |

## Local verification commands

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m compileall .
pytest -q
pytest --cov=. --cov-report=term-missing
node --check static/js/app.js && node --check static/js/research.js && node --check static/js/admin.js
flask db upgrade && flask db downgrade && flask db upgrade
docker compose config && docker build . && docker compose up --build -d
curl -fsS http://localhost:5000/api/health/live
curl -fsS http://localhost:5000/api/health/ready
```
