# Threat model

## Assets

- `AI_API_KEY` (paid provider quota), `SECRET_KEY`, database contents
- User documents and research history (private)
- Service availability and provider budget
- Integrity of generated study artifacts and citations

## Actors

- Anonymous internet user; authenticated user; malicious authenticated user
- Compromised/malicious web source or document content
- Malicious or buggy AI provider output
- Infrastructure operator (trusted but minimized: secrets never logged)

## Trust boundaries

Browser ↔ Flask (session/CSRF); Flask ↔ AI provider (TLS, one key); Flask ↔
web sources (untrusted content, SSRF risk); uploaded files (untrusted binary);
database/Redis (trusted internal); RQ worker (same trust as web).

## STRIDE-style summary

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| Spoofing | Credential theft, session replay | scrypt, session_version invalidation, Secure/HttpOnly/SameSite cookies | Phishing outside scope; MFA not included |
| Tampering | CSRF, prompt injection, stored-content injection | Flask-WTF CSRF, untrusted delimiters, sanitized metadata, schema-checked JSON | Determined injection may still bias summaries; claims carry verification labels |
| Repudiation | — | UsageRecord audit trail (no secrets) | Log access controls are operational |
| Information disclosure | Key leakage, error leakage, cross-user access | SecretFilter logging, structured errors, ownership 404s, no key in health/admin | Provider sees prompts (document text) by design — documented |
| Denial of service | Archive bombs, oversized sources, quota abuse, job floods | Upload limits (size/files/expansion/ratio/pages/chars), source fetch limits, daily quota, rate limits, job timeouts, idempotent claiming | In-process parsing timeout is cooperative, not a hard kill (documented) |
| Elevation of privilege | Admin endpoint access, SSRF to internal network, DNS rebinding | admin_required, public-IP-only URLs, redirect validation, peer-IP consistency | Zero-days in parser libraries; ClamAV signature freshness is operational |

## Residual risks (accepted, documented)

1. Cooperative document-parse timeout (no subprocess isolation by default).
2. Heuristic citation grounding is not factual verification.
3. Document content is sent to the selected external AI provider during
   Document Study Mode — users must be comfortable with that provider.
4. Dev thread executor is not crash-safe; production must use RQ (enforced).
