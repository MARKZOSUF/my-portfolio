# Configuration

All values are environment variables (see `.env.example`). Production startup
fails closed on unsafe values (`validate_config`).

| Variable | Default | Notes |
|---|---|---|
| `FLASK_ENV` | development | development / testing / production |
| `SECRET_KEY` | dev placeholder | **Production: random ≥32 chars**; invalidating it ends all sessions |
| `DATABASE_URL` | sqlite (instance/) | sqlite or postgresql(+psycopg) only |
| `AI_PROVIDER` | openai | openai, perplexity, gemini, anthropic, openrouter, groq, deepseek |
| `AI_API_KEY` | empty | **The only external key.** Required in production when AI is enabled; never logged or rendered |
| `AI_BASE_URL` | provider default | Credential-free HTTPS only |
| `AI_MODEL` | provider default | Model id for the selected provider |
| `AI_FEATURES_ENABLED` | true | Master switch; false → structured 503 for AI operations |
| `AI_CONNECT_TIMEOUT` / `AI_READ_TIMEOUT` | 10 / 90 | seconds (bounded 1–60 / 5–300) |
| `AI_MAX_RETRIES` | 2 | bounded 0–4, backoff with jitter |
| `MAX_OUTPUT_TOKENS` | 6000 | synthesis budget (500–16000) |
| `MAX_SOURCES` | 10 | web sources per session (1–25) |
| `MAX_QUERY_LENGTH` | 1000 | characters |
| `FREE_DAILY_RESEARCH_LIMIT` | 5 | per-user daily research runs |
| `CHAT_HISTORY_LIMIT` | 12 | recent turns included in prompts |
| `CHAT_MESSAGE_MAX` | 1000 | characters per chat message |
| `MAX_UPLOAD_MB` | 20 | request body cap (1–50) |
| `MAX_ARCHIVE_FILES` | 1000 | Office ZIP entries |
| `MAX_ARCHIVE_EXPANDED_MB` | 80 | archive-bomb guard |
| `MAX_DOCUMENT_PAGES` | 250 | pages/slides |
| `MAX_DOCUMENT_CHARS` | 500000 | extracted text cap |
| `DOCUMENT_PROCESS_TIMEOUT` | 30 | seconds; cooperative (checked between pages) |
| `UPLOAD_FOLDER` | instance/uploads | private, mode 0700 |
| `MALWARE_SCANNER` | noop | **Production: clamav** |
| `CLAMSCAN_PATH` | clamscan | binary path |
| `SOURCE_MAX_MB` | 8 | per-source download cap |
| `SOURCE_MAX_PDF_PAGES` | 40 | web PDF cap |
| `SOURCE_FETCH_TIMEOUT` | 20 | seconds |
| `SOURCE_REDIRECT_LIMIT` | 3 | validated redirects only |
| `COOKIE_SECURE` | false | **Production: true** (HTTPS) |
| `RATELIMIT_STORAGE_URI` | memory:// | **Production: redis://…** |
| `JOB_BACKEND` | thread | **Production: rq** |
| `REDIS_URL` | redis://redis:6379/0 | RQ queue + optional rate-limit backend |
| `RESEARCH_JOB_TIMEOUT` | 900 | seconds per RQ job |
| `STUCK_SESSION_MINUTES` | 30 | age before `flask recover-stuck` fails a session |
| `PORT` | 5000 | bind port |
| `GUNICORN_WORKERS` / `GUNICORN_THREADS` / `GUNICORN_TIMEOUT` | auto / 4 / 120 | web serving knobs |

Security notes: never commit `.env`; compose placeholders must be replaced;
production additionally requires PostgreSQL, Redis rate limiting, secure
cookies, RQ, and ClamAV or the process refuses to start.
