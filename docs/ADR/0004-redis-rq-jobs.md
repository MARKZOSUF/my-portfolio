# ADR-004: Redis/RQ for production jobs

**Status:** Accepted

## Context

Research runs take far longer than a request. Development needs zero-infra
simplicity; production needs durability, timeouts, and restart survival.

## Decision

`JOB_BACKEND=thread` (labeled in-process executor) for development only;
`JOB_BACKEND=rq` with Redis for production — enforced by startup validation.
Sessions carry `job_id`; the pipeline claims only `queued` sessions
(idempotent); enqueue failures mark the session failed and refund quota;
`flask recover-stuck` handles stuck sessions; RQ `failure_ttl` retains
failure records for 7 days.

## Consequences

Durable, inspectable jobs with clean recovery semantics. Cost: Redis is a
required production dependency (also used for rate limiting).
