# Test report

Environment: Amazon Linux 2023, Python 3.13, Node 24, OpenJDK 25 (`keytool`
available, `javac` absent), ReportLab and fontTools available, **no network
access**, `pytest` not installable offline.

This report distinguishes three states and never conflates them:

- **PASS** - the command was executed here and succeeded.
- **NOT RUN** - the gate requires a dependency, device or service unavailable in
  this environment. **No claim of success is made.**
- **FAIL** - executed and failed.

## Executed here: PASS

| # | Gate | Command | Result |
| --- | --- | --- | --- |
| 1 | Backend test suite | `python3 tests/run_tests.py` (from `backend/`) | PASS - 93 passed, 0 failed, 3 skipped |
| 2 | Async test actually executes | `python3 tests/run_tests.py tests/test_development_model.py` | PASS - reported `[async]`; previously a false pass |
| 3 | Project structure validation | `python scripts/validate_project.py` | PASS - exit 0 |
| 4 | Python syntax, whole tree | `python -m compileall backend/app database scripts backend/tests` | PASS - exit 0 |
| 5 | Env/code parity | `tests/test_env_parity.py` | PASS - 12 passed, 1 skipped |
| 6 | Bundled fonts and Hindi glyphs | `tests/test_pdf_fonts.py` | PASS - 9 passed |
| 7 | Google auth wiring | `tests/test_google_auth.py` | PASS - 13 passed, 1 skipped |
| 8 | Billing removal scan | `tests/test_no_billing_docs.py` | PASS - 6 passed |
| 9 | Debug keystore is valid | `keytool -list -v -keystore mobile/android/app/debug.keystore` | PASS - alias `androiddebugkey`, PrivateKeyEntry |
| 10 | Keystore fingerprint script | `bash scripts/android-debug-sha1.sh` | PASS - prints SHA1/SHA256 |
| 11 | JSON parse | manifest, `mobile/package.json`, `app.json`, `eas.json` | PASS |
| 12 | Android XML parse | every `mobile/android/**/*.xml` | PASS |
| 13 | Hindi/English/Hinglish PDF render | ReportLab render in `tests/test_pdf_fonts.py` | PASS - real glyphs, no `.notdef` |

### Detail: the three skips are explicit, not hidden

| Skipped test | Reason |
| --- | --- |
| `test_live_settings_model_matches_static_parse...` | `pydantic_settings` not installed |
| `test_service_imports_cleanly_when_dependencies_available` | `httpx` not installed |
| `test_self_hosted_host_allowlist` | `pydantic_settings` not installed |

These are the reason the parity and Google-auth suites verify source structure
with `ast`/text analysis rather than by importing the app: the checks still run
and still fail on regression in a bare environment.

## NOT RUN - no success claimed

| Gate | Blocking reason | How to run it yourself |
| --- | --- | --- |
| **Android `assembleDebug` / `assembleRelease`** | No Android SDK, no network for Gradle/Maven, no `javac`. **The keystore defect is fixed at the file level and the signing config verified by inspection, but no Gradle build was executed.** | `cd mobile && npm ci && cd android && ./gradlew assembleDebug` |
| **Android Studio build** | No IDE/SDK | Open `mobile/android`, Build > Make Project |
| **`npm ci` / dependency install** | No network | `cd mobile && npm ci` |
| **TypeScript `tsc --noEmit`** | Requires `node_modules` | `cd mobile && npm run typecheck` |
| **ESLint** | Requires `node_modules` | `cd mobile && npm run lint` |
| **Jest (mobile tests, incl. the new navigation + Google tests)** | Requires `node_modules` | `cd mobile && npm test` |
| **`expo-doctor` / prebuild** | No network | `cd mobile && npx expo-doctor` |
| **pytest** | Not installable offline; suite was run with the rewritten built-in runner instead | `pip install -r backend/requirements.txt && python -m pytest backend/tests -q` |
| **Alembic migration `0013` upgrade/downgrade** | No PostgreSQL, no `alembic` installed | `cd backend && alembic upgrade head && alembic downgrade -1` |
| **`scripts/test_migrations.sh`** | Needs disposable PostgreSQL + pgvector | `bash scripts/test_migrations.sh` |
| **Celery worker / broker** | No Redis | `celery -A app.workers.celery_app worker -l info` |
| **Live Google OAuth round trip** | Needs a device, a browser and real Google credentials | Follow the smoke test in `GOOGLE-APPLE-AUTH-SETUP.md` |
| **`POST /auth/google` against a live server** | No running API or database | `uvicorn app.main:app` then the `curl` in the setup guide |
| **APK install / cold start / device UI** | No device or emulator | Install the built APK |
| **End-to-end topic -> Study Pack -> PDF** | Needs API, DB, worker, AI provider credentials | Run the stack via `docker-compose` |
| **Docker build / compose** | No Docker daemon | `docker compose up --build` |

## Explicitly corrected claim

The previous report's "53 passed, 0 failed, 1 skipped" was **not trustworthy**.
The old runner invoked tests synchronously, so `async def` tests returned
never-awaited coroutines whose bodies never executed and which were counted as
passes. The rewritten runner awaits them, and promotes
`RuntimeWarning: coroutine ... was never awaited` to an error so this cannot
silently return. The 93 passes above were produced by the corrected runner.

## Verification status per rescan defect

| Defect | Fixed in source | Verified how |
| --- | --- | --- |
| P0-1 Google Sign-In | Yes | Structure/wiring tests PASS. Live OAuth NOT RUN |
| P0-2 / P0-4 Env mismatches | Yes | Parity tests PASS |
| P0-3 Debug keystore | Yes | `keytool` PASS. Gradle build NOT RUN |
| P0-5 Project validation | Yes | `validate_project.py` PASS |
| P0-6 Async test runner | Yes | Async test executes, PASS |
| P0-7 Study Pack primary flow | Yes | Route files asserted by Jest tests, which are NOT RUN here; source verified by inspection |
| P0-8 Hindi fonts | Yes | Font + glyph + render tests PASS |
| P0-9 Billing docs | Yes | Repo-wide scan PASS |
