# Production RAG
Inputs: PDF (per-page + OCR fallback), DOCX paragraphs/tables, PPTX slides, TXT, Markdown, images, notes, and YouTube timestamp segments. Normalization removes NULs and records language. Hierarchical chunks preserve page, slide, section, paragraph range, chunk index, and content hash.

Retrieval is owner-scoped and combines pgvector cosine candidates with PostgreSQL full-text candidates, term-coverage reranking, metadata provenance, duplicate suppression, source filtering, bounded result counts, and character context budgets. Production settings reject the development embedding provider. Vector dimension is pinned to 1536 until a DBA migration changes both schema and provider atomically.
