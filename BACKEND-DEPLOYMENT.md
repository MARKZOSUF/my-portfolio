# Backend deployment

## Services

1. **API** - `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`
2. **Worker** - `celery -A app.workers.celery_app worker -l info --workdir backend`
3. **Postgres** (with pgvector) and **Redis**
4. **S3-compatible object storage** for generated PDFs

## Steps

```bash
pip install -r backend/requirements.txt
python scripts/validate_environment.py --environment production
alembic -c database/alembic.ini upgrade head        # head: 0012_free_product
```

Production configuration is rejected when `DEBUG` is true, secrets are weak or
still `CHANGE_ME`, the AI or email provider is `development`, CORS contains a
wildcard, `PUBLIC_API_URL` is not HTTPS, or `STORAGE_PROVIDER` is not `s3`
(generated PDFs must not live on ephemeral application-server disk).

## Health and operations

- `GET /health` - liveness; `GET /api/v1/health/ready` - dependencies
- Long jobs run on the worker; the API stays responsive
- Retention: generated files older than `GENERATED_FILE_RETENTION_DAYS` are purged
- Scale workers horizontally; job state lives in Postgres so restarts are safe

## Docker (local parity)

```bash
docker compose up --build
```
