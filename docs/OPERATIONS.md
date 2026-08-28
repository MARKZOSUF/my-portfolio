# Operations

## Monitoring

- Liveness: `GET /api/health/live` (process only, always cheap).
- Readiness: `GET /api/health/ready` (database; Redis when RQ/Redis
  rate-limiting configured; production config sanity). 503 = do not route
  traffic. The paid AI provider is never called by health checks.
- Watch RQ queue depth (`research` queue) and failed-job registry
  (`failure_ttl` is 7 days).

## Logging

Structured-ish application logs include the research public id (never the
query text or secrets). `SecretFilter` rewrites the configured AI key to
`[REDACTED]` in all log records. Provider response bodies are never logged.
Gunicorn access/error logs go to stdout/stderr for the platform collector.

## Job recovery

- Failed research: users retry with `POST /api/research/<id>/retry` (no extra
  quota, rate-limited) or the Retry button in history/workspace.
- Stuck sessions (worker crash, deploy mid-run): `flask recover-stuck` marks
  sessions queued/running longer than `STUCK_SESSION_MINUTES` (default 30) as
  failed with `STALE_JOB_RECOVERED`. Schedule it via cron, e.g. every 15 min:
  `docker compose exec web flask recover-stuck`.
- Enqueue outages: session creation fails with `JOB_ENQUEUE_FAILED` and the
  daily allowance is refunded — no permanently queued sessions.

## Quota policy

One research or follow-up = one daily allowance unit, reserved atomically.
Refunded only when the job could not be queued. Retries of failed sessions
are free but rate-limited (5/hour). Completed-then-failed-midway runs are not
refunded (provider cost was incurred); this is deliberate.

## Cleanup and retention

- `flask cleanup-orphans` removes upload files with no database row.
- Deleting a session cascades all artifacts; deleting a document removes its
  physical file.
- RQ registries expire automatically (result 1 day, failure 7 days).

## Backup / restore

See docs/DEPLOYMENT.md. Nightly `pg_dump` + uploads volume snapshot; verify
restores on a staging stack (`flask db upgrade` after restore).

## Incident handling

1. Provider outage: sessions fail with PROVIDER_* codes; users retry later.
   Readiness stays green (provider is not a readiness dependency) — monitor
   provider failures via UsageRecord `research_failed` counts.
2. Key compromise: rotate `AI_API_KEY`, restart web/worker, review provider
   usage dashboards.
3. Database restore: follow DEPLOYMENT.md; run schema-parity test before
   reopening traffic.

## Key rotation

`AI_API_KEY`: update secret, rolling restart. `SECRET_KEY`: update, restart —
all sessions invalidate (expected). Database password: rotate in PostgreSQL,
update compose/secret, recreate web/worker.
