# Architecture

Mobile Expo Router clients call a versioned FastAPI API. PostgreSQL/pgvector is authoritative; Redis/Celery handles long jobs; provider adapters isolate AI/search/storage/email/OCR. Ownership is enforced at query boundaries.
