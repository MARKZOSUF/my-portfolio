# Changelog - Final rescan fix

All eight blocking defects from `STUDYFORGE-FINAL-RESCAN-REPORT.md` are fixed in
the project source. Verification status for each item is in `TEST-REPORT.md`;
nothing requiring a device, network, database or live OAuth was executed here and
none of it is claimed as passing.

## P0-3 Missing debug keystore (Android Studio build failure)

- **Added `mobile/android/app/debug.keystore`** (PKCS12, 2666 bytes, alias
  `androiddebugkey`, RSA 2048, valid 30 years). `app/build.gradle` already
  referenced this exact path, so its absence made `:app:validateSigningDebug`
  fail on a clean checkout.
  SHA-1 `6E:8E:D7:C4:C4:04:43:CC:41:C8:F4:EE:88:D7:64:F3:97:65:61:99`.
- **Hardened `signingConfigs.debug`**: the keystore is now resolved through
  `studyforgeDebugKeystore`, and if the file is ever missing again Gradle falls
  back to the Android SDK default debug keystore with an explanatory message
  instead of failing the build. The release config is unchanged.
- Added `scripts/bootstrap-debug-keystore.sh` to regenerate it, and
  `scripts/windows-android-doctor.ps1` which pre-flights the keystore, JDK,
  SDK path, `NODE_ENV` (the previous Windows log warned it was unset),
  `node_modules` and `mobile/.env`.

## P0-1 Real Google Sign-In

Backend:
- `backend/app/services/google_identity.py` - real ID-token verification:
  RS256 only (rejects `alg:none` and HMAC confusion), JWKS fetched over HTTPS
  with a TTL cache, stale-serve fallback and forced refetch on unknown `kid`,
  plus `aud`, `iss`, `exp`/`iat`/`nbf` with configurable clock skew, nonce
  equality and mandatory `email_verified`.
- `POST /auth/google` and `GET /auth/providers` in
  `backend/app/api/v1/auth/routes.py`. Returns 404 when disabled; failures audit
  `auth.google_failed` and return a generic 401 so the endpoint is not an oracle.
- Identities are linked by `(provider, subject)` via the new `UserIdentity`
  model, never by email alone. New users get a password-less account, profile and
  verified-email record; lockout counters reset on success.
- Additive migration `0013_google_identity_user_identities.py` creating
  `user_identities` with unique constraints on `(provider, subject)` and
  `(user_id, provider)`.

Mobile:
- `mobile/services/auth/googleSignIn.ts` - `expo-auth-session` implicit ID-token
  flow, 32-byte random nonce sent to Google only as a SHA-256 hash, redirect
  `ai-notes-maker://oauth/google`, and typed `GoogleSignInError` codes
  (`unavailable` / `cancelled` / `failed`).
- `loginWithGoogle()` and `googleAvailable` on the AuthProvider; new users are
  routed to onboarding, returning users to the dashboard.
- `mobile/features/auth/GoogleSignInButton.tsx` on both the login and signup
  screens. It renders nothing when unconfigured, is silent on cancellation, and
  alerts on real failures.
- Added `expo-auth-session`, `expo-web-browser`, `expo-crypto`,
  `expo-application`; client IDs surfaced through `app.config.ts` and
  `constants/config.ts`. No client secret exists in the app.

See `GOOGLE-APPLE-AUTH-SETUP.md`. Apple Sign-In remains **not implemented** and
is documented as such.

## P0-2 / P0-4 Environment-variable mismatches

- Canonical names with backwards-compatible `AliasChoices`, so existing
  deployments keep booting: `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`,
  `STORAGE_BACKEND`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`,
  `S3_SECRET_KEY` all still accept their legacy `*_EXPIRE_*` / `STORAGE_*` forms.
- The 20 documented-but-unused names are now either real, consumed settings or
  removed. Newly implemented **and wired**:
  `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW`, `DATABASE_POOL_TIMEOUT`,
  `DATABASE_POOL_RECYCLE` (into `create_async_engine`), `CELERY_RESULT_BACKEND`
  (into the Celery app) and `SMTP_USE_TLS` (into `aiosmtplib.send`).
- Google/Apple settings added, with production guards that fail startup if a
  provider is enabled without credentials.
- Rewrote `backend/.env.example` (141 lines), **created the missing root
  `.env.example`** that `scripts/validate_project.py` requires, and extended
  `mobile/.env.example`.
- `scripts/validate_environment.py` now requires the canonical `S3_*` names,
  treats `GOOGLE_CLIENT_SECRET` / `APPLE_PRIVATE_KEY` as secrets, and validates
  provider-enabled-without-credentials.
- `backend/tests/test_env_parity.py` fails the build on any future drift.

## P0-7 Study Pack is now the primary generation flow

- The advanced Study Pack screen was previously **unreachable**: it was not
  declared in the tab layout at all. `studypack/index` is now the **Create**
  tab.
- `workspace/index` is removed from the tab bar and added to the hidden route
  list. The route still resolves, but now `Redirect`s to Study Pack preserving
  `?topic=`, so old deep links do not dead-end. The previous implementation is
  retained unrendered at `mobile/features/workspace/LegacyWorkspaceScreen.tsx`.
- Dashboard weak-topic recommendations now open Study Pack.
- Study Pack accepts a prefilled `?topic=`.
- `ROUTES.main.studypack` added; `ROUTES.generate` is the single source of truth
  for "start a generation"; `workspace` is marked `@deprecated`.

## P0-8 Bundled Hindi PDF fonts

- No font binary was bundled anywhere, so Hindi PDFs rendered Devanagari as
  `.notdef` boxes. Now bundled in `backend/app/pdf/fonts/`:
  `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf` (static instances generated from
  the Noto Sans variable font at weights 400/700) and
  `DroidSansDevanagari-Regular.ttf` for Devanagari.
- `renderer.py` now prefers bundled faces over host fonts, and its
  "no Devanagari font found" warning no longer misdescribes the situation. The
  old host probe path (`NotoSans[wdth,wght].ttf`) was wrong and never matched.
- Apache-2.0 license and NOTICE texts ship in
  `backend/app/pdf/fonts/LICENSES/`, as redistribution requires.
- The bundled Devanagari face has **no bold companion**; this is documented
  rather than silently faked.

## P0-9 Obsolete billing documentation removed

- Deleted `docs/BILLING.md` and its `PROJECT_MANIFEST.json` entry.
- Corrected `FINAL_IMPLEMENTATION_REPORT.md` (billing is REMOVED, not "partially
  implemented"), `docs/MIGRATIONS.md` (also: thirteen revisions, not ten),
  `docs/COMPLETE_AUDIT.md`, both production-readiness docs and
  `AI-PROVIDER-CONFIGURATION.md`.
- `backend/tests/test_no_billing_docs.py` scans every Markdown file, the
  manifest, settings and both dependency manifests to keep billing out.

## P0-6 Replaced the unreliable async test runner

- The old `backend/tests/run_tests.py` called every test synchronously, so an
  `async def` test returned a never-awaited coroutine, its body never ran, and it
  was **counted as a pass**. That is why "53 passed" could not be trusted.
- The rewritten runner awaits coroutine tests on a fresh event loop, executes any
  returned awaitable, promotes
  `RuntimeWarning: coroutine ... was never awaited` to an error so the bug cannot
  return, reports fixture/parametrized tests as ERROR instead of skipping them
  silently, and exits non-zero on any failure or error.
- `pytest` remains the preferred runner and is pinned in `requirements.txt`; the
  built-in runner exists for bare offline environments.

## P0-5 Project validation passes

`python scripts/validate_project.py` now exits 0. Fixed: the missing root
`.env.example`, and the prohibited-placeholder false positives from
`docs/BILLING.md` and `FINAL_IMPLEMENTATION_REPORT.md`.
