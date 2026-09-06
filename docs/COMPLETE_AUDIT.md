# Complete evidence-based audit

## Scope and method
The supplied ZIP was inspected before modification. The audit traced mobile screen → mobile API call → FastAPI route → ownership/authentication → business logic → persistence → worker → AI/search/RAG → response. A file or route alone was never treated as completion.

## Baseline findings
The supplied archive was a coherent starter, not a production-complete SaaS. The deepest gaps were a disabled one-pass “research” shell; generic wrappers for 16 study tools; acknowledgement-only password reset; client-trusted upload MIME; vector-only RAG; only document/YouTube workers; local-only rate limiting; development model fallbacks; and thin tests. No claim/evidence/citation graph, rotating token families, source quality record, SSE research events, structured task controls, AI usage ledger, portable data export, or production configuration rejection existed.

## Current feature matrix
| Feature | UI | API | Logic/data/worker | AI/RAG/provider | Tests | Classification |
|---|---|---|---|---|---|---|
| Signup/login | Yes | Yes | Password hashing and ownership | N/A | Partial | Implemented |
| Refresh/logout/sessions | Partial mobile | Yes | Rotating family, replay revocation | N/A | Unit coverage | Implemented backend; partial UI |
| Password reset/verification | Reset request UI only | Yes | Hashed expiring one-time tokens; SMTP/dev outbox | External email NOT TESTED | Unit coverage | Implemented path; provider NOT TESTED |
| Deep research | Dedicated progress/source UI | Job/SSE/status/cancel | 7-query plan, retrieval, ranking, dedupe, exact-quote graph | Tavily/Brave/Serper adapters; production LLM synthesis | Core unit tests | Implemented architecture; external credentials NOT TESTED |
| Citation verification | Research UI | Embedded result | Claim → Evidence → Source → URL; unknown markers reject final | Exact-quote verification; unsupported paragraph scan | Unit coverage | Implemented |
| Conflict detection | Result schema | Persistence table | Table exists; cautious prompt | Automated semantic conflict clustering is not complete | No integration | Partially implemented |
| RAG | Notes/tools/search UI | Yes | Hybrid lexical/vector, owner filters, reranking, dedupe, budget | Production embedding guarded | Core tests | Implemented core; scale benchmark NOT TESTED |
| Documents | Upload/scan/status | Yes | PDF/DOCX/PPTX/TXT/MD/image, OCR fallback, MIME/magic, archive limits, malware hook, dedupe, retries/progress | Local OCR; HTTP/cloud OCR adapter not complete | Security/unit | Partial production implementation |
| YouTube | URL/status UI | Yes | normal/short/youtu.be, language list, timestamp segments, explicit unavailable | Transcript provider real; title/channel/chapters limited | URL tests | Partially implemented |
| Notes modes | Mobile workspace | Yes | Existing quick/detailed/exam/everything retained | Evidence-aware RAG | Existing tests | Implemented baseline; nine-mode taxonomy partial |
| Numericals/derivations/formulas/etc. | Dedicated labelled routes | `/generate/{kind}` | Domain prompts and output checks | Deterministic numerical verifier remains incomplete | Thin | Partial; not safe to call fully production-complete |
| Quiz/flashcards | Yes | Yes | Attempts + deterministic SM-2 scheduler | Model generation with development-safe fallback | Core tests | Implemented baseline |
| Tutor/voice | Yes | Yes | Context ownership; device permissions | Provider credentials server-side | Thin | Partial |
| Study plan/revision/progress | Dedicated UI/routes | Yes | Deterministic schedule and mastery prioritization | N/A | Core | Implemented baseline |
| PYQ/exam priorities | Dedicated UI | Yes | Uses only stored source-linked PYQs; probabilistic labels | No fabricated data | Core | Implemented baseline; importer partial |
| Collaboration | UI | Yes | Existing expiring least-privilege share records | N/A | Thin | Partial |
| Offline sync | Banner/local queue | Yes | Queue, retry, automatic replay | User-specific conflict UI incomplete | Mobile syntax only | Partial; production blocker for high-conflict editing |
| Search | UI | Yes | Notes/cards + semantic sources, bounded results | Hybrid retrieval | Unit | Implemented core |
| Export/delete | Settings | Yes | Portable JSON; account cascade and storage deletion | N/A | Thin | Implemented baseline |
| Admin/notifications | Shell architecture only | Limited | No complete operational console or push sender. Billing is out of scope: StudyForge is free. | N/A | None | Missing/partial |
| Observability | N/A | Request IDs/health | Sentry hook, structured app logs | Provider metrics incomplete | Static | Partial |
| CI/CD/docs | N/A | N/A | Workflow and runbooks added | N/A | Executed static checks | Implemented scaffolding |

## Security risks and production blockers
1. Production launch requires unique secrets, TLS/reverse proxy, production PostgreSQL/pgvector, Redis/Celery, object storage, malware scanning, SMTP, AI/embedding/search credentials, backup targets, and monitoring.
2. External provider behavior, mobile devices, APNs/FCM, App Store/Play signing, cloud storage, Docker builds, migration round trip, and load benchmarks are **NOT TESTED** in this environment.
3. Local rate limiting is not sufficient for multi-instance abuse prevention; a distributed gateway or Redis policy is required.
4. Semantic conflict classification, AI usage enforcement, admin console, push delivery, cloud OCR, and complete offline merge UX remain incomplete. Billing is intentionally absent.
5. The migration uses metadata-driven creation for added tables; a DBA-reviewed explicit migration is recommended before production.

## Recommended improvement order
1. Provision an isolated staging stack and run migration upgrade → downgrade → upgrade.
2. Configure one production LLM, embedding, search, SMTP, S3-compatible storage, and ClamAV; run provider contract tests.
3. Complete AI usage enforcement, structured output schemas for every study tool, conflict extraction, and numerical verification.
4. Add mobile merge/conflict UX, encrypted local user scoping, device automation, TalkBack/VoiceOver checks.
5. Complete admin, push sender, retention automation, and disaster-recovery drills.
