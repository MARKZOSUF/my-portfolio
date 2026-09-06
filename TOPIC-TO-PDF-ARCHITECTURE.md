# Topic-to-PDF architecture

## Contract

```
POST   /api/v1/studypack/jobs                 { topic, profile? }  -> { task_id, status }
GET    /api/v1/studypack/jobs/{task_id}       -> status, progress, stage, result
POST   /api/v1/studypack/jobs/{task_id}/cancel
POST   /api/v1/studypack/jobs/{task_id}/retry
GET    /api/v1/studypack/jobs/{task_id}/events (SSE)
GET    /api/v1/studypack/stages
POST   /api/v1/studypack/classify
GET    /api/v1/studypack/notes/{note_id}
```

`topic` is the only required field. Every profile field is optional.
An `Idempotency-Key` header (or the derived key) prevents duplicate jobs.

The legacy research job API is unified on the same shape:
`POST /api/v1/research/jobs`, `GET|POST /api/v1/research/jobs/{task_id}[/cancel|/events]`.

## Stages

| # | Key | User-facing label |
| --- | --- | --- |
| 1 | `understanding` | Understanding topic |
| 2 | `subject` | Detecting subject |
| 3 | `planning` | Planning research |
| 4 | `discovery` | Finding sources |
| 5 | `retrieval` | Reading sources |
| 6 | `evidence` | Comparing evidence |
| 7 | `outline` | Building outline |
| 8 | `writing` | Writing notes |
| 9 | `factcheck` | Checking facts |
| 10 | `formulas` | Verifying formulas |
| 11 | `numericals` | Solving numericals |
| 12 | `questions` | Creating questions |
| 13 | `resources` | Creating flashcards and quiz |
| 14 | `pdf` | Rendering PDF |
| 15 | `saving` | Saving |
| 16 | `completed` | Completed |

Each stage checks for cancellation, writes status/progress/stage to
`BackgroundTask`, appends a `JobEvent`, and commits. Because state lives in the
database, closing the app does not affect the job: the client persists the task
id and resumes polling (or the SSE stream) on relaunch.

## Persistence

`BackgroundTask` stores job id, owner id, kind, topic and input configuration,
status, current stage, progress, retry count, structured error, research run id,
result note id, PDF status and created/updated/completed timestamps.
`TaskControl` stores the idempotency key and the cancellation flag.

## PDF

`app/pdf/renderer.py` (`studyforge-pdf/2.0-platypus`) renders the structured
document - never Markdown text - into A4 with a cover page, branding, detected
subject/context, research date, table of contents, typed blocks, headers,
footers and page numbers. Latin and Devanagari faces are registered separately
so English, Hindi and Hinglish all render; if no Devanagari face is available the
renderer records an explicit warning rather than emitting blank glyphs.

Output filename: `StudyForge-{sanitized-topic}-Notes-{YYYY-MM-DD}.pdf`.

The bytes are written to private object storage. Owner id, note id, storage key,
SHA-256 checksum, byte size, renderer version, creation date and generation/error
status are persisted. Downloads are authenticated and owner-scoped, with expiring
signed URLs (`STORAGE_SIGNED_URL_TTL_SECONDS`, default 900s). Production
configuration validation rejects ephemeral application-server storage.
