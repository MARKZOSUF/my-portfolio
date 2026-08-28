# ADR-001: Single selected AI provider

**Status:** Accepted

## Context

The product promise is "one external AI key": operators configure exactly one
provider account. Supporting multiple simultaneous providers would multiply
secret-management, quota, and failure-mode complexity.

## Decision

One configured provider (`AI_PROVIDER` + `AI_API_KEY` + `AI_BASE_URL` +
`AI_MODEL`) behind the `AIProvider` interface. All AI work flows through it.
Local subsystems (RAG embeddings, parsing, malware scanning, PDF export)
deliberately avoid external keys.

## Consequences

Simple operations and auditing; provider switch is a config change. Full
Research Mode is unavailable when the selected provider lacks web search —
surfaced explicitly via capability flags and structured errors rather than
silent degradation.
