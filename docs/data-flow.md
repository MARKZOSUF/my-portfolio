# Data flow
Mobile UI → typed API client (request ID, timeout, refresh lock, offline queue) → FastAPI validation/auth/ownership → PostgreSQL → Celery job/control/events → AI/search/RAG provider → verified result → polling/SSE → mobile states. Upload bytes are size/MIME/archive/malware checked before object storage; workers extract, chunk, embed, and atomically report progress.
