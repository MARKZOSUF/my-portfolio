# AI provider configuration

Ordinary users never enter an API key. An administrator configures one provider
(optionally with a fallback) in backend settings only.

## Cloud, OpenAI-compatible

```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4.1-mini
AI_TASK_MODELS={"notes":"gpt-4.1-mini","factcheck":"gpt-4.1","questions":"gpt-4.1-mini"}
AI_FALLBACK_PROVIDER=
AI_TIMEOUT_SECONDS=90
```

Azure-style gateways use the same shape with `AI_PROVIDER=azure-compatible` and
the deployment URL as `AI_BASE_URL`.

## Approved self-hosted (Ollama / vLLM / LocalAI)

```env
AI_PROVIDER=ollama
AI_SELF_HOSTED_BASE_URL=http://ollama:11434/v1
AI_SELF_HOSTED_MODEL=llama3.1:8b
AI_SELF_HOSTED_ALLOWED_HOSTS=localhost,127.0.0.1,ollama,vllm,localai
AI_ALLOW_KEYLESS_SELF_HOSTED=true
```

Rules enforced in code:

- Keyless access must be enabled explicitly; otherwise the configuration is rejected.
- When keyless, the `Authorization` header is **omitted entirely** - never sent as
  `Bearer ` with an empty value.
- The base URL host must match `AI_SELF_HOSTED_ALLOWED_HOSTS`. Users cannot choose
  arbitrary base URLs, which is what keeps this from becoming an SSRF path.

## Per-task models, fallback, resilience

`AI_TASK_MODELS` maps a task name to a model. `AI_FALLBACK_PROVIDER` is tried when
the primary fails. A circuit breaker stops hammering a dead provider, retries use
bounded jittered backoff, and provider errors are returned as structured payloads
(provider, status code, detail) rather than stack traces.

## No generative model configured

The pipeline does not fabricate content. It falls back to an extractive,
citation-first note built strictly from retrieved passages, labels the result, and
adds "No generative model is configured..." to the research-limitations section.
The API returns a useful configuration status instead of crashing.

## Fair-use limits (no billing: StudyForge is a free product)

`AI_DAILY_TOKEN_LIMIT`, `AI_MONTHLY_TOKEN_LIMIT` and `AI_DAILY_REQUEST_LIMIT`
protect the deployment. Token and request accounting plus response caching reduce
cost. None of this gates study features, and there is no paid tier. Cloud AI
capacity is not free forever - the administrator pays their provider - which is
why these limits exist.
