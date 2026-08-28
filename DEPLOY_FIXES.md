# Deploy Fixes Applied

Scan date: 2026-08-28

## What was scanned

- 120 files, ~15k lines
- Python syntax compile of every module (`compileall`) - clean
- Every local import resolved against the module that defines it - no broken imports
- All 32 routes across 9 blueprints inventoried
- Templates + static assets referenced vs present - all present
- Third-party imports vs `requirements.txt` - all runtime deps pinned
- 13 model classes vs 13 migration tables - aligned

## Blockers found and fixed

### 1. ClamAV had no virus definitions (would break ALL uploads)

`config.py` forces `MALWARE_SCANNER=clamav` in production, and
`services/documents/storage.py` shells out to `clamscan`. The old Dockerfile
installed the `clamav` package but never fetched a signature database.
`clamscan` exits non-zero with no database, and `scan_file()` maps that to
`MALWARE_SCAN_FAILED` (503) - so every single document upload would fail.

Fixed:
- Added the `clamav-freshclam` package.
- Run `freshclam` at build time (non-fatal, so the build still succeeds on
  networks that block the ClamAV mirrors).
- Added `docker-entrypoint.sh`, which retries `freshclam` at container start
  if the database is still missing.
- Created and chowned `/var/lib/clamav` and `/var/log/clamav` for the
  non-root `app` user.

### 2. Database password hard-coded in three places

`docker-compose.yml` repeated the same Postgres password in the `web`,
`worker`, and `db` services, with a comment telling you to remember to change
all of them. Easy to desync, and it committed a credential to the repo.

Fixed: all three now read `${POSTGRES_PASSWORD}` from `.env`. The `db`
service uses `${POSTGRES_PASSWORD:?...}` so compose fails fast with a clear
message instead of silently starting with an empty password.

### 3. Missing `instance/` directory

`.gitignore` referenced `!instance/.gitkeep` but neither the directory nor the
file existed. Added `instance/.gitkeep` and `instance/uploads/.gitkeep`.

### 4. `.env` housekeeping

- Added `POSTGRES_PASSWORD` (required by the compose fix above).
- Mirrored the key into `.env.example`.
- Replaced the misleading "everything is set" comment with an explicit
  ACTION REQUIRED note.

## YOU MUST DO THIS BEFORE DEPLOYING

Open `.env` and set your real provider key:

    AI_API_KEY=PASTE-YOUR-REAL-API-KEY-HERE   <-- still a placeholder

The app WILL boot with the placeholder (validation only checks that the value
is non-empty), but every AI call will fail with a 401 from the provider.

Also rotate these before going live - they shipped inside the zip, so treat
them as compromised:
- `SECRET_KEY`
- `POSTGRES_PASSWORD`

Generate a new secret with:

    python3 -c "import secrets; print(secrets.token_urlsafe(48))"

## Deploy

    docker compose up -d --build
    docker compose logs -f web

Readiness probe: `GET /api/health/ready` (503 until Postgres + Redis are up).

## Honest limitation

The sandbox that produced this zip had no network access, so Flask and the
other dependencies could not be installed. That means the bundled test suite
(22 test files) was NOT executed and the app was never actually booted. All
findings above come from static analysis. Run this locally before trusting
production:

    pip install -r requirements.txt
    pytest -q
