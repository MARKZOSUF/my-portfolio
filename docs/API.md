# API

All mutations use same-origin session cookies plus the `X-CSRFToken` header.
Errors are always `{"success": false, "error": {"code": "CODE", "message": "Safe message"}}`.
List endpoints accept `page` / `page_size` (max 50). Every resource lookup
enforces ownership; cross-user access returns 404.

## Auth — `/api/auth`
| Method | Path | Notes |
|---|---|---|
| POST | `/register` | 201; 409 EMAIL_EXISTS |
| POST | `/login` | 401 INVALID_CREDENTIALS |
| POST | `/logout` | Clears the session |
| POST | `/password` | auth; rotates session_version (other devices signed out) |
| POST | `/logout-all` | auth; invalidates every session |
| GET | `/me` | `{authenticated, user}` — never includes hashes/session internals |

## Research — `/api/research`
| Method | Path | Notes |
|---|---|---|
| GET | `` | paginated history |
| POST | `` | 202. Readiness gate first: 503 AI_DISABLED / PROVIDER_NOT_CONFIGURED; then 422 WEB_SEARCH_NOT_SUPPORTED / DOCUMENTS_REQUIRED; 429 DAILY_LIMIT_REACHED; 503 JOB_ENQUEUE_FAILED (quota refunded) |
| GET/DELETE | `/<id>` | 404 when not owned; 409 RESEARCH_RUNNING |
| GET | `/<id>/sources` | validated source list with heuristic quality labels |
| POST | `/<id>/continue` | 202; inherits study_mode and documents |
| POST | `/<id>/retry` | 202; failed sessions only (409 otherwise); no extra quota |
| GET | `/<id>/events` | SSE progress stream (heartbeat every 2s, 300s cap) |
| GET | `/provider` | server-safe capability report |

## Documents — `/api/documents`
`GET `` (paginated), `POST /upload` (multipart; 201 or 200 `reused`; errors:
413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE/MIME_MISMATCH/INVALID_FILE_SIGNATURE,
400 EMPTY_FILE, 422 DOCUMENT_PARSE_FAILED/DOCUMENT_EMPTY/DOCUMENT_ENCRYPTED/
ARCHIVE_BOMB/INVALID_ARCHIVE/DOCUMENT_PAGE_LIMIT/DOCUMENT_TIMEOUT,
422 MALWARE_DETECTED, 503 MALWARE_SCAN_UNAVAILABLE), `GET|DELETE /<id>`.

## Notes — `/api/notes`
`GET|PUT /<id>`, `POST /generate` (reuse unless `regenerate`),
`POST /<id>/rewrite` `{style}`, `POST /<id>/translate` `{language}`,
`POST /<id>/export/pdf`.

## Quiz — `/api/quiz`
`POST /generate` `{research_id, difficulty?, regenerate?}` (422 QUIZ_EMPTY),
`GET /<id>`, `POST /<id>/submit` `{answers}` → `{score, results,
next_difficulty, version}`; attempts are preserved.

## Flashcards — `/api/flashcards`
`GET ?research_id=`, `POST /generate` (`regenerate` archives, never deletes),
`POST /<id>/status` `{status: new|review|known}`.

## Chat — `/api/chat`
`GET ?research_id=` (owner-only history, bounded), `POST` `{research_id,
message}` (409 RESEARCH_NOT_READY until complete).

## System — `/api`
`GET /health` (composite, 200), `GET /health/live` (liveness, 200),
`GET /health/ready` (200 ready / 503 not_ready with per-check detail),
`GET /usage` (daily allowance + provider status).

## Admin
`GET /admin` (dashboard page), `GET /admin/api/stats` (admin only;
capability booleans, never secrets).

## Rate limits

Per authenticated user (or IP): global 300/hour; register 5/min; login
10/min; research create 10/hour; continue/retry 5/hour; chat 30/hour;
notes/quiz/flashcards/uploads 10/hour. 429 RATE_LIMITED when exceeded.
