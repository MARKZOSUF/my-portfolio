# ADR-002: Explicit capability declarations

**Status:** Accepted

## Context

Provider features (generation, streaming, web search) vary and change
upstream. Inferring capabilities from names or probing live endpoints is
fragile and leaks configuration.

## Decision

Each adapter declares a frozen `ProviderCapabilities`. Routes and the pipeline
gate on `capabilities.web_search`/`generation` and on the readiness gate
(`require_ai_ready`). Mode is decided at request time from these declarations
and enforced again in the pipeline.

## Consequences

Predictable behavior, safe structured errors (`WEB_SEARCH_NOT_SUPPORTED`),
accurate `provider_status`, and frontend gating without exposing keys. Cost:
new providers require an explicit adapter with an honest capability matrix.
