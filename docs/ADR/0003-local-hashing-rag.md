# ADR-003: Local hashing-based RAG

**Status:** Accepted

## Context

Contextual chat needs retrieval over session evidence. An embedding API would
break the one-key architecture; a vector database adds operational weight.

## Decision

Deterministic signed-hashing embeddings (384 dims, SHA-256 token hashing)
over chunked source/document text, cosine similarity, in-memory per request.
Chunk labels follow the citation model (`[n]`, `[Dn]`).

## Consequences

No extra keys or services; reproducible; adequate for session-scale corpora.
Trade-off: weaker semantics than model embeddings and no cross-session index.
If corpus sizes grow, revisit with a local ANN index (still key-free).
