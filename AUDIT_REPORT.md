# Audit report — StudyResearch-AI-Fixed → Advanced

Severity: Critical / High / Medium / Low. All listed issues were resolved
unless noted under "Remaining risks".

## Original issues

| # | Severity | Issue | Affected files | Resolution |
|---|---|---|---|---|
| 1 | Critical | Pipeline ignored `study_mode`: any provider with `web_search` searched the web even in Document Study Mode; an OpenAI user who disabled "Live web research" still triggered web search | services/research/pipeline.py, routes/research.py | Pipeline gates on `row.study_mode == "full_research"` plus provider capability; route decides mode strictly; document mode requires ≥1 owned document; follow-ups inherit mode; tests prove no-search behavior |
| 2 | Critical | Full Research with a generation-only provider silently degraded mid-run instead of a clean rejection | routes/research.py, pipeline.py | Route rejects with structured `WEB_SEARCH_NOT_SUPPORTED` before quota/session; pipeline fails safe as defense in depth |
| 3 | High | Claims marked "verified" when a source ID merely existed; no document citation support; no page references | services/research/citations.py, prompts.py, models | Dual `[n]`/`[Dn]`/`[Dn:pX]` model, existence + non-empty excerpt matching, honest statuses, document refs stored on `research_fact` |
| 4 | High | `AI_FEATURES_ENABLED` never enforced; missing key consumed quota and created doomed sessions/jobs | routes/research.py, routes/chat.py, routes/notes.py, services/ai/factory.py | `require_ai_ready()` gate before quota/session/job on every AI operation; tests assert quota untouched |
| 5 | High | No account UI: logout/change-password/logout-all routes unreachable from the frontend | templates/base.html, static/js/app.js, app.css | Account menu + dialogs with confirmation, autocomplete, loading states, keyboard support; integration + static tests |
| 6 | High | ConversationMessage written but never read; chat prompts had no history, no trust delimiters, unbounded growth potential | routes/chat.py, prompts.py, research.js | Bounded history endpoint + inclusion, strict delimiters, untrusted-history rules, frontend history rendering with states |
| 7 | High | "Adaptive" quiz was a label: no attempts stored, no version progression, invalid MCQs stored (3 options, answer outside options), empty quizzes created silently | routes/quiz.py, models, research.js, services/research/artifacts.py | `QuizAttempt` table, thresholds, new-version generation, central `validate_mcqs`, `QUIZ_EMPTY` 422, adaptive UI buttons |
| 8 | High | Duplicate flashcards (incl. case/whitespace variants) could violate the session/content uniqueness constraint and fail the pipeline; regeneration deleted cards and progress | routes/flashcards.py, pipeline.py, models | Normalized case-folded hashes, in-response dedupe, per-card nested-transaction inserts, archive-not-delete regeneration (`is_current`), progress preserved |
| 9 | High | Malformed PDF/DOCX/PPTX could raise uncaught parser exceptions → 500 with internals; concurrent duplicate uploads → IntegrityError 500 | services/documents/parser.py, routes/documents.py | Broad parser exception normalization to structured 4xx (no paths/stack traces/XML), BytesIO-based parsing (handles closed), uniqueness race → safe reuse + temp cleanup |
| 10 | High | No liveness/readiness split; `/api/health` always 200; Docker healthcheck never failed on degraded state | routes/system.py, Dockerfile, docker-compose.yml | `/api/health/live` + `/api/health/ready` (DB, Redis-when-required, config; 503 on failure; never calls provider); healthchecks + compose `service_healthy` gating |
| 11 | High | Migration revision used `db.metadata.create_all()`/`drop_all()` | migrations/versions/0001_initial.py | Explicit `0001_initial` (all tables/keys/indexes) + ordered `0002_adaptive_study`; parity + upgrade/downgrade tests |
| 12 | Medium | Enqueue failure left sessions permanently queued; no stuck-session recovery; no retry path | services/jobs.py, routes/research.py, app.py | JOB_ENQUEUE_FAILED + quota refund, `flask recover-stuck`, `POST /api/research/<id>/retry` |
| 13 | Medium | Document filenames and source titles were interpolated into prompts unsanitized (delimiter-breaking prompt injection) | pipeline.py, utils/security.py | `sanitize_prompt_text` strips angle brackets/control chars and bounds length |
| 14 | Medium | `provider_status` lacked enabled/ready state; frontend never disabled research when unconfigured | services/ai/factory.py, static/js/app.js, index banner | Extended status; banner + submit disabled with server-safe message |
| 15 | Medium | Frontend gaps: no chat history render, no adaptive buttons, no flashcard regenerate, thin empty/loading/error states | research.html, research.js, app.css | All added; textContent-only rendering preserved; reduced-motion and focus states kept |
| 16 | Medium | Compose started web/worker before DB/Redis were ready; no restart policies; no `.dockerignore`; inline gunicorn flags | docker-compose.yml, Dockerfile, gunicorn.conf.py, .dockerignore | Healthchecks + `depends_on: service_healthy`, `unless-stopped`, config file, ignore rules |
| 17 | Low | One-line dense code style, missing docstrings/type hints on complex paths | most backend files | Reformatted, docstrings on security/research-critical functions, logic moved to services/artifacts |
| 18 | Low | Docs claimed features that did not exist; docs/VALIDATION.md described a different sandbox | docs/*, README.md | 12 docs + 6 ADRs rewritten to match implementation; reports at repo root |

## Dead code / mismatches found

- `services/ai/openai_compatible.py` re-export shim — kept (harmless, importable alias).
- `Quiz.score` retained as a denormalized latest score; authoritative history lives in `quiz_attempt`.
- Route/frontend mismatches fixed: research workspace now handles null `quiz_id`/`note_id`, failed-session retry, and provider-unavailable submission state.
- No unused models remained after wiring `ConversationMessage` into chat history.

## Remaining risks

1. Document-parse timeout is cooperative (in-process); a true subprocess
   isolation with hard kill is documented as future work (docs/THREAT_MODEL.md).
2. Citation grounding is heuristic (exact/approximate excerpt matching) and is
   labeled as such everywhere; it is not independent factual verification.
3. The dev thread executor is not crash-safe; production requires RQ
   (enforced by startup validation).
4. SSE requires proxy buffering disabled; documented in DEPLOYMENT.md.
