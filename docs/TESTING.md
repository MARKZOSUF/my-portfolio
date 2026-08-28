# Testing

## Strategy

- **Unit tests**: citation parsing/grounding, MCQ validation, flashcard
  normalization, RAG store, URL validation, source-quality heuristics,
  document parser limits.
- **Route integration tests**: auth/account, research mode enforcement,
  provider readiness, chat, quiz, flashcards, uploads, health, ownership.
- **Provider contract tests**: capability flags, timeout normalization,
  key non-leakage — always against scripted fakes/mocks.
- **Background-job tests**: enqueue failure, idempotent duplicate execution,
  provider timeout, malformed JSON, rollback, retry, stuck recovery.
- **Migration tests**: empty → upgrade → downgrade → upgrade, plus
  schema-parity against SQLAlchemy models (SQLite; revisions contain
  dialect-gated PostgreSQL SQL).
- **Frontend static checks**: no inline scripts, no `innerHTML`, template/JS
  id wiring, CSP strictness, required UI surfaces.

All external AI/provider/network calls are mocked. Tests never consume real
provider credits.

## Commands

```bash
python -m compileall .
pytest -q
pytest --cov=. --cov-report=term-missing
node --check static/js/app.js
node --check static/js/research.js
node --check static/js/admin.js
flask db upgrade && flask db downgrade && flask db upgrade   # disposable DB
docker compose config
docker build .
```

## Coverage expectations

Routes, pipeline, citations, and parser modules should stay above ~80% line
coverage; provider adapters are covered by contract tests with mocked HTTP.

## Browser / visual QA checklist

Run the app locally and verify at ~390px and desktop widths: home signed out,
home signed in, account menu (logout, change password, logout-all confirm),
research loading (SSE), completed research, failed research + retry, notes
edit/preview, quiz submit + adaptive buttons, flashcards + regenerate,
sources panel, empty states, keyboard-only navigation, focus visibility, and
`prefers-reduced-motion`.
