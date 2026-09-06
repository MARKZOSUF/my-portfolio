# Vector retrieval

Production uses PostgreSQL + pgvector. Collection ownership is enforced by `owner_id` metadata filters before similarity ranking. HNSW cosine indexes are created by the migration. A deterministic development embedder exists only for local plumbing tests; production deployments must configure a semantic embedding provider.
