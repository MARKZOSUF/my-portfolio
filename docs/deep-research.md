# Deep research
`POST /api/v1/research/jobs` creates an idempotent job. The worker executes Plan → seven search intents → provider fallback → DNS/IP protected retrieval → extraction → quality scoring → content-hash dedupe → exact-quote claim/evidence records → citation verification → synthesis → marker/coverage critique → final result. `GET .../events` is SSE with event IDs and reconnect cursor; status and cancel endpoints support partial recovery.

Adapters: Tavily, Brave, Serper. Configure an ordered `SEARCH_PROVIDERS` list and provider keys. No configured provider returns `capability_unavailable`; no external-research claim is made. Fetch blocks non-http schemes, credentials, localhost/private/link-local addresses, and unsafe redirects. Source text is wrapped/treated as untrusted data.

Evidence schema: `ResearchRun → ResearchSource/Source → Claim → Evidence → Citation`; unknown citation markers reject synthesis. Current limitation: semantic conflict extraction is persisted but only basic disagreement handling is implemented.
