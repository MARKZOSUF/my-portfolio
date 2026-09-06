# Quick start on Windows (PowerShell)

## Prerequisites

- Python 3.11+, Node.js 20+, Git
- Docker Desktop (for Postgres and Redis) or local installations
- Android Studio with SDK 36 and JDK 17 (only for Android builds)

## Backend

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
docker compose up -d postgres redis
python scripts\validate_environment.py --environment development
alembic -c database\alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
```

In a second terminal:

```powershell
celery -A app.workers.celery_app worker -l info --pool=solo --workdir backend
```

(`--pool=solo` is required on Windows.)

## Mobile

```powershell
cd mobile
copy .env.example .env
npm ci
npm run config:check
npx expo start
```

The Android emulator reaches your machine at `http://10.0.2.2:8000/api/v1`, which
is allowed **only** in a development build. A physical device needs your LAN IP
in `EXPO_PUBLIC_API_URL` and a development build.

## Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| `API configuration error: EXPO_PUBLIC_API_URL is not set` | no `.env` | copy `.env.example` |
| Requests hang on a device | device cannot reach `10.0.2.2` | use your LAN IP |
| `Release signing is not configured` | no `keystore.properties` | see `ANDROID-RELEASE-BUILD.md` |
| `sdk.dir` missing | no `local.properties` | copy `local.properties.example` |
