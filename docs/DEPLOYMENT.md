# Deployment

## Development

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"  # SECRET_KEY
flask db upgrade
flask run
```

## Production (Docker)

1. `cp .env.example .env` and set: `FLASK_ENV=production`, a random 32+
   character `SECRET_KEY`, one `AI_API_KEY`, provider/base/model,
   `COOKIE_SECURE=true`, `JOB_BACKEND=rq`, Redis URLs, `MALWARE_SCANNER=clamav`.
2. Replace every `change-this-db-password` placeholder in
   `docker-compose.yml` (the app fails closed on weak config).
3. `docker compose up --build -d` — the web container runs `flask db upgrade`
   before Gunicorn starts; web/worker wait for healthy PostgreSQL and Redis.
4. `docker compose exec web flask create-admin` (interactive, no CLI secrets).
5. Smoke check: `curl -fsS http://host:5000/api/health/live` and
   `curl -fsS http://host:5000/api/health/ready` (503 when degraded).

The Dockerfile healthcheck hits `/api/health/ready` and fails on any non-2xx.
Restart policies: `unless-stopped` on all services. Redis runs with AOF
persistence so queued/failed RQ jobs survive restarts. Uploads live on a
dedicated volume, written by the non-root `app` user (mode 0700).

## ClamAV

The image installs ClamAV. Update signatures with `freshclam` (schedule it or
bake it into image builds). Scanning is local; no API key. Production refuses
to boot with `MALWARE_SCANNER` unset to `clamav`.

## Reverse proxy

Terminate HTTPS, enable HSTS, disable response buffering for
`/api/research/*/events` (SSE), set proxy read timeouts above the 300s stream
cap, and cap request body size at the upload limit.

## Backups and restore

Back up the PostgreSQL volume (`pg_dump` nightly) and the uploads volume.
Restore: provision fresh services, restore the dump, run `flask db upgrade`,
restore uploads, then start web/worker. Test restores regularly.

## Rollback

Deploy the previous image; run `flask db downgrade` to the matching revision
on a verified backup if the schema changed. Revisions are ordered and
idempotent; `0001_initial` → `0002_adaptive_study`.

## Key rotation

Rotate `AI_API_KEY` via the secret manager and restart web/worker. Rotate
`SECRET_KEY` knowing it invalidates all sessions and CSRF tokens.
