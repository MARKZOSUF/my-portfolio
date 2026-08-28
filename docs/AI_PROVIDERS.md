# AI providers

## Interface

All providers implement `services/ai/base.py::AIProvider`:

- `generate(messages, *, max_tokens, temperature) -> AIResponse`
- `stream(messages, *, max_tokens)` — optional; raises `STREAMING_NOT_SUPPORTED`
- `search_web(query, *, max_results) -> list[SearchHit]` — optional; raises
  `WEB_SEARCH_NOT_SUPPORTED`

## Capability matrix (explicit adapter declarations)

| Provider | Generation | Streaming | Web search | Effective mode |
|---|---:|---:|---:|---|
| OpenAI | ✓ | ✓ | ✓ | full_research |
| Perplexity | ✓ | — | ✓ | full_research |
| Gemini | ✓ | — | — | document_study |
| OpenRouter | ✓ | — | — | document_study |
| Groq | ✓ | — | — | document_study |
| DeepSeek | ✓ | — | — | document_study |
| Anthropic | ✓ | — | — | document_study |

Capabilities are declared in code, never inferred from key prefixes or model
names. Provider/model entitlements can change upstream; a search request
against a generation-only provider fails with `WEB_SEARCH_NOT_SUPPORTED` and
never fabricates URLs.

## Request/response normalization

- `SafeHTTPClient` (`services/ai/http.py`): HTTPS-only credential-free base
  URL (validated at startup), connect/read timeouts, bounded retries with
  backoff+jitter on 5xx/timeouts, no redirects, no environment proxies
  (`trust_env=False`).
- Error normalization: 401/403 → PROVIDER_AUTH_FAILED, 429 →
  PROVIDER_QUOTA_EXCEEDED, 4xx → PROVIDER_REQUEST_REJECTED, 5xx/timeout →
  PROVIDER_ERROR / PROVIDER_TIMEOUT. Provider response bodies are never
  included in client-facing errors or logs.
- Malformed JSON → INVALID_PROVIDER_OUTPUT after one corrective retry at the
  pipeline level.

## Readiness gate

`require_ai_ready()` (services/ai/factory.py) runs before quota, session
creation, or job enqueue: `AI_FEATURES_ENABLED` must be on, the provider must
be supported, and `AI_API_KEY` must be present. `provider_status()` exposes
provider/configured/enabled/capabilities/mode/ready — never any key material.

## Provider testing strategy

Tests use scripted `FakeProvider` doubles and monkeypatched HTTP layers. No
test ever performs a real provider call or consumes credits. Contract tests
verify capability flags, timeout normalization, and key non-leakage.
