# Deployment

Create production secrets; configure PostgreSQL/pgvector, Redis, S3, ClamAV, SMTP, LLM, embedding, search; run Alembic; start API and dedicated ingestion/research workers; probe /health and /ready; enable TLS, backups, Sentry, and metrics. Roll back image first and database only using tested migration procedure.
