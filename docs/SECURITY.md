# Security

## Authentication

Session-cookie auth (HttpOnly, SameSite=Lax, Secure in production). Passwords
are scrypt-hashed, length-capped at 128, emails normalized with casefold.
`session_version` invalidates all sessions on password change and logout-all.
Registration races map to 409. Login uses constant-shape errors.

## Authorization

Every resource lookup is ownership-scoped (see docs/DATA_MODEL.md);
cross-user access returns 404. Admin endpoints require `is_admin`. No
password hashes, session internals, or key material appear in any response.

## CSRF

Flask-WTF CSRF on all mutations; failures return structured JSON
(`CSRF_FAILED`). The token is read from a meta tag; no cookies are read by
JavaScript.

## CSP and output safety

Strict CSP: `default-src 'self'; script-src 'self'` (no inline scripts,
no unsafe-inline/eval). All AI output is rendered via `textContent` or the
safe local markdown renderer — never `innerHTML`. Security headers:
X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy,
Permissions-Policy, no-store on API responses.

## SSRF and DNS rebinding

Source URLs: credential-free public HTTP(S) only, standard ports, globally
routable IPs, alternate numeric IP forms blocked, local/internal hostnames
blocked, bounded validated redirect chains, and connected-peer IP compared
against the validated DNS answers (rebinding defense). Provider base URLs
must be credential-free HTTPS and are validated at startup.

## Document security

Random private stored names; extension + MIME + magic-signature checks;
streamed size-limited writes; Office ZIP inspection (entry count, expansion
size, compression ratio, encrypted entries, path traversal); page/character
count limits; cooperative processing timeout (checked between pages/slides).
Malformed files return structured 4xx errors — never stack traces, local
paths, XML content, or parser internals. Duplicate uploads dedupe by sha256;
uniqueness races map to safe reuse. ClamAV is mandatory in production
(startup fails closed otherwise). Orphan cleanup: `flask cleanup-orphans`.

## Prompt injection

Evidence, documents, notes, and conversation history are always wrapped in
explicit untrusted delimiters; system rules state that such content can never
override instructions. Document filenames and source titles are sanitized
(`sanitize_prompt_text`: strips angle brackets/control characters, bounds
length) so user metadata cannot break prompt delimiters. Structured provider
output is JSON-parsed with one corrective retry, then rejected.

## Secrets

One external key (`AI_API_KEY`), server-side only. A logging filter rewrites
the key to `[REDACTED]` in every log record. Health and admin endpoints expose
capability booleans only. `.env` is git- and docker-ignored.

## Rate limits

Per-user (or per-IP when anonymous) limits; expensive AI operations have
stricter caps (research 10/hour, chat 30/hour, notes/quiz/cards 10/hour,
login/register stricter). Production requires the Redis backend.
