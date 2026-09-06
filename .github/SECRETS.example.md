# CI/CD secrets template

These are the repository secrets the workflows expect. Add them under
**Settings > Secrets and variables > Actions**. Never paste real values into
any file in the repository.

## Backend deployment

| Secret | Purpose |
| --- | --- |
| `RAILWAY_TOKEN` | Deploy the API and worker services |
| `BACKEND_SECRET_KEY` | JWT signing key for the deployed environment |
| `BACKEND_DATA_ENCRYPTION_KEY` | Field-level encryption key |
| `AI_API_KEY` | Administrator-configured AI provider key (server-side only) |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Durable object storage for generated PDFs |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | Transactional email |
| `SENTRY_DSN` | Error reporting (optional) |

## Android release signing

| Secret | Purpose |
| --- | --- |
| `STUDYFORGE_UPLOAD_STORE_FILE_BASE64` | Base64 of the upload keystore, decoded at build time |
| `STUDYFORGE_UPLOAD_STORE_PASSWORD` | Keystore password |
| `STUDYFORGE_UPLOAD_KEY_ALIAS` | Key alias |
| `STUDYFORGE_UPLOAD_KEY_PASSWORD` | Key password |

The Gradle build reads the four `STUDYFORGE_UPLOAD_*` names from either
`android/keystore.properties` or the environment, and fails a release build with
an explicit message when they are missing. The debug keystore is never used to
sign a release.

## Never store as a secret used by the mobile app

`EXPO_PUBLIC_*` values are embedded in the shipped bundle. AI keys, database
passwords, storage secrets, the Google client secret, the Apple private key and
signing passwords must never be exposed that way.
