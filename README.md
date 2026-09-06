# StudyForge AI

A free, research-first study application. A signed-in user types **one topic**,
presses **Deep Research & Create Notes**, and the backend classifies the topic,
searches legitimate sources, ranks and deduplicates them, extracts evidence,
writes structured notes with citations, deterministically validates the
mathematics, generates exam-style practice material, saves the note to that
user's account and renders a professional A4 PDF.

- **No user API keys.** AI and search credentials are administrator-configured
  and stay server-side. Nothing sensitive ships in the APK/AAB.
- **No subscriptions, paywalls or upgrade prompts.** Fair-use limits protect the
  service; they never gate study features.
- **Nothing is claimed as verified unless a deterministic validator passed.**
- **Google Sign-In is real** and optional: the backend verifies Google ID tokens
  against Google's JWKS. With no client ID configured the button is hidden and
  the endpoint returns 404. See `GOOGLE-APPLE-AUTH-SETUP.md`. Apple Sign-In is
  **not implemented**.
- **Hindi PDFs work offline.** Latin and Devanagari fonts are bundled in
  `backend/app/pdf/fonts/` with their licenses, so rendering does not depend on
  host fonts.

The **Create** tab is the advanced Study Pack screen (`/(main)/studypack`), which
is the single primary generation flow. The older `/(main)/workspace` route is
deprecated and redirects there.

See `CHANGELOG-FINAL-FIX.md` for what changed in this build and `TEST-REPORT.md`
for exactly which gates were executed and which were not.

## Repository layout

```
backend/     FastAPI application, Celery workers, research engine, PDF renderer
mobile/      Expo / React Native app (expo-router)
database/    Alembic migrations (head: 0013_google_identity)
docs/        Deployment and configuration references
scripts/     Environment validation, keystore bootstrap, Windows Android doctor
```

## Quick start

```bash
# backend
cp backend/.env.example backend/.env      # then fill in values
pip install -r backend/requirements.txt
python scripts/validate_environment.py --environment development
alembic -c database/alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
celery -A app.workers.celery_app worker -l info --workdir backend

# mobile
cd mobile
cp .env.example .env
npm ci
npm run config:check
npx expo start
```

Windows users: see `QUICKSTART-WINDOWS.md`.

## The topic-to-PDF pipeline

`TOPIC-TO-PDF-ARCHITECTURE.md` documents the 16 stages. `RESEARCH-AND-CITATION-SYSTEM.md`
documents source priority, deduplication, claim support and the honest limitation
reporting used when only the keyless public-source baseline is available.

## Documentation index

| File | Contents |
| --- | --- |
| `IMPLEMENTATION-PLAN.md` | Audit findings and the P0/P1/P2 plan |
| `CONFIGURATION-SETUP.md` | Every setting: purpose, secrecy, format, rotation |
| `AI-PROVIDER-CONFIGURATION.md` | Cloud and approved self-hosted AI setup |
| `TOPIC-TO-PDF-ARCHITECTURE.md` | Job stages, persistence, recovery |
| `RESEARCH-AND-CITATION-SYSTEM.md` | Sources, evidence, fact checking |
| `ANDROID-RELEASE-BUILD.md` | Signing and release builds |
| `BACKEND-DEPLOYMENT.md` / `RAILWAY-DEPLOYMENT.md` | Deployment |
| `SECURITY.md` / `PRIVACY-AND-RETENTION.md` | Security and data handling |
| `TEST-REPORT.md` | What was actually executed, with output |
| `KNOWN-GAPS.md` | What could **not** be verified here |
| `CHANGELOG-TURBO-AI.md` | Everything changed in this transformation |
