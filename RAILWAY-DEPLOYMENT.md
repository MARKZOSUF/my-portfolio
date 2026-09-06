# Railway deployment

1. Create a project and add the **Postgres** and **Redis** plugins.
2. Create two services from this repository:
   - **api**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`
   - **worker**: `celery -A app.workers.celery_app worker -l info --workdir backend`
3. Paste the variables from `docs/RAILWAY-VARIABLES.example.env` into both
   services. `DATABASE_URL` and `REDIS_URL` come from the plugins via
   `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}`.
4. Attach an S3-compatible bucket (Railway volume storage is not durable object
   storage) and set `STORAGE_PROVIDER=s3` plus the bucket credentials.
5. Run migrations once from the service shell:
   `alembic -c database/alembic.ini upgrade head`
6. Validate: `python scripts/validate_environment.py --environment production`
7. Point the mobile app at the public HTTPS domain in `mobile/.env.production`.

Never store secrets in the repository; Railway variables are the source of truth.
Rotate by editing the variable and redeploying - no code change is required.
