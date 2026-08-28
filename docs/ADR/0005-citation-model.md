# ADR-005: Web and document citation model

**Status:** Accepted

## Context

Document Study Mode produced claims with no valid citation scheme (numeric
IDs implied web sources only), and "verified" previously meant only "an ID
exists" — an honesty bug.

## Decision

Dual labels: `[n]` for web sources, `[Dn]` for documents, `[Dn:pX]` /
`[Dn:slideX]` for page/slide pinpoints. Claims carry web and document
reference lists. Grounding checks require reference existence AND a non-empty
excerpt matching the referenced extracted content (exact or ≥70% token
overlap). Statuses: supported / partially_supported / needs_verification /
contradicted. All labeling is heuristic and says so.

## Consequences

Document-only research can produce `supported` claims; mismatched evidence is
visibly marked. Trade-off: approximate matching can false-positive on short
excerpts; documented as heuristic, never marketed as factual verification.
