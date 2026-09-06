# Configuration setup

Every setting, where it goes, and whether it is secret. **No real credentials
appear anywhere in this repository.**

Legend - *Mobile?* means "may this value be exposed to the mobile app". Anything
marked **no** must never appear in an `EXPO_PUBLIC_*` variable, because those are
compiled into the APK/AAB and are trivially readable.

## Where values are entered

| Environment | Location |
| --- | --- |
| Local backend | `backend/.env` (from `backend/.env.example`) |
| Local mobile | `mobile/.env` (from `mobile/.env.example`) |
| Production mobile | `mobile/.env.production` |
| Railway | Service > Variables (`docs/RAILWAY-VARIABLES.example.env`) |
| Docker | `docker compose` env file / `environment:` |
| Android Studio | `mobile/android/local.properties`, `mobile/android/keystore.properties` |
| CI/CD | Repository secrets (`.github/SECRETS.example.md`) |

## Application

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `APP_ENV` | Selects environment behaviour | no | `development` | `production` | no | enum | n/a |
| `DEBUG` | Verbose errors, dev shortcuts | no | `true` | must be `false` | no | bool | n/a |
| `PUBLIC_APP_URL` | Links in emails | no | `http://localhost:8081` | public HTTPS | no | URL | n/a |
| `PUBLIC_API_URL` | Canonical API origin | no | `http://localhost:8000` | public HTTPS | yes (same value) | URL | n/a |
| `LOG_LEVEL` | Log verbosity | no | `INFO` | `INFO`/`WARNING` | no | enum | n/a |

## Security

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SECRET_KEY` | Signs JWTs | **yes** | any 64 chars | >= 48 random chars, not `CHANGE_ME` | no | random string | Rotate to invalidate all sessions; generate with `python -c "import secrets;print(secrets.token_urlsafe(64))"` |
| `DATA_ENCRYPTION_KEY` | Field-level encryption | **yes** | dev value | strong, unique | no | random string | Re-encrypt affected columns before retiring the old key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | no | `15` | `15` | no | int | n/a |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh lifetime | no | `30` | `<= 30` | no | int | n/a |

## Database, queue

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Postgres DSN | **yes** (contains password) | `postgresql+asyncpg://studyforge:studyforge@localhost:5432/studyforge` | managed Postgres, TLS | no | DSN | Change the DB password, then update the variable |
| `DATABASE_POOL_SIZE` / `DATABASE_MAX_OVERFLOW` | Pool sizing | no | `10` / `20` | tune to plan | no | int | n/a |
| `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Queue | **yes** if authenticated | `redis://localhost:6379/0` | managed Redis | no | URL | Rotate the instance password |
| `WORKER_EAGER` | Run jobs inline | no | `false` | `false` | no | bool | n/a |

## AI provider

See `AI-PROVIDER-CONFIGURATION.md` for full semantics.

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AI_PROVIDER` | Selects the router backend | no | `development` | never `development` | no | enum | n/a |
| `AI_BASE_URL` | Cloud endpoint | no | `https://api.openai.com/v1` | HTTPS | no | URL | n/a |
| `AI_API_KEY` | Cloud credential | **yes** | empty | required for cloud providers | **no** | provider token | Create a new key in the provider console, update, revoke the old one |
| `AI_MODEL` / `AI_TASK_MODELS` | Default and per-task models | no | `gpt-4.1-mini` | as licensed | no | string / JSON | n/a |
| `AI_FALLBACK_PROVIDER` | Secondary provider | no | empty | optional | no | string | n/a |
| `AI_TIMEOUT_SECONDS` | Request timeout | no | `90` | `60`-`120` | no | int | n/a |
| `AI_ALLOW_KEYLESS_SELF_HOSTED` | Explicit approval for keyless runtimes | no | `false` | only with a private runtime | no | bool | n/a |
| `AI_SELF_HOSTED_BASE_URL` / `AI_SELF_HOSTED_MODEL` | Self-hosted runtime | no | `http://localhost:11434/v1` | private network | no | URL / string | n/a |
| `AI_SELF_HOSTED_ALLOWED_HOSTS` | SSRF allow-list | no | `localhost,127.0.0.1,ollama,vllm,localai` | minimal list | no | CSV | n/a |

## Research providers

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SEARCH_PROVIDERS` | Enabled adapters | no | `wikipedia,crossref,openalex` | any subset | no | CSV | n/a |
| `TAVILY_API_KEY` / `BRAVE_API_KEY` / `SERPER_API_KEY` | Optional keyed search | **yes** | empty | optional | **no** | token | Rotate in the provider console |
| `CROSSREF_MAILTO` | Polite-pool contact | no | `you@example.com` | real mailbox | no | email | n/a |
| `SEMANTIC_SCHOLAR_API_KEY` | Optional academic search | **yes** | empty | optional | **no** | token | Provider console |

## Storage

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `STORAGE_PROVIDER` | `local` or `s3` | no | `local` | must be `s3` | no | enum | n/a |
| `STORAGE_ENDPOINT` / `STORAGE_REGION` / `STORAGE_BUCKET` | Bucket location | no | empty | required | no | URL / string | n/a |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Bucket credentials | **yes** | `CHANGE_ME` | required | **no** | key pair | Issue a new key pair, update, delete the old pair |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | Download link lifetime | no | `900` | `<= 3600` | no | int | n/a |
| `GENERATED_FILE_RETENTION_DAYS` | PDF retention | no | `90` | per policy | no | int | n/a |

## Email, sign-in, limits

| Setting | Purpose | Secret | Dev example | Production requirement | Mobile? | Format | Rotation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EMAIL_PROVIDER` / `EMAIL_FROM` | Verification and reset mail | no | `development` | `smtp` + verified sender | no | enum / email | n/a |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_USE_TLS` | SMTP transport | no | empty / `587` | required | no | host / int / string / bool | n/a |
| `SMTP_PASSWORD` | SMTP credential | **yes** | `CHANGE_ME` | required | **no** | password | Provider console |
| `GOOGLE_AUTH_ENABLED`, `GOOGLE_*_CLIENT_ID` | Google sign-in | no | empty | from Google Cloud Console > Credentials | yes (client IDs only) | string | Create a new OAuth client |
| `GOOGLE_CLIENT_SECRET` | Server-side verification | **yes** | `CHANGE_ME` | required if enabled | **no** | secret | Google Cloud Console |
| `APPLE_AUTH_ENABLED`, `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` | Apple sign-in | no | empty | from Apple Developer | yes (client ID only) | string | n/a |
| `APPLE_PRIVATE_KEY` | Apple `.p8` key | **yes** | `CHANGE_ME` | required if enabled | **no** | PEM contents | Revoke the key in Apple Developer and issue a new one |
| `CORS_ORIGINS` | Allowed browser origins | no | `http://localhost:8081` | explicit list, never `*` | no | CSV | n/a |
| `MAX_UPLOAD_MB` / `MAX_PDF_PAGES` / `PDF_RENDERER` | Limits and renderer | no | `50` / `1000` / `platypus` | as needed | no | int / enum | n/a |
| `SENTRY_DSN` | Error reporting | no (public DSN) | empty | optional | yes | URL | Rotate in Sentry |

## Mobile variables

| Setting | Purpose | Secret | Production requirement |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend base URL | no | **public HTTPS**; localhost, `127.0.0.1`, `10.0.2.2` and private LAN are rejected |
| `EXPO_PUBLIC_APP_ENV` | Build mode | no | `production` |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, `EXPO_PUBLIC_APPLE_CLIENT_ID` | Public OAuth client IDs | no | required if sign-in enabled |
| `EXPO_PUBLIC_SENTRY_DSN` | Public DSN | no | optional |

## Android signing

`STUDYFORGE_UPLOAD_STORE_FILE`, `STUDYFORGE_UPLOAD_STORE_PASSWORD`,
`STUDYFORGE_UPLOAD_KEY_ALIAS`, `STUDYFORGE_UPLOAD_KEY_PASSWORD` - all **secret**,
read from the untracked `mobile/android/keystore.properties` or CI secrets.
Rotation means generating a new upload key and (for Play App Signing) requesting
an upload-key reset.

## Validation

```powershell
python scripts\validate_environment.py --environment development
python scripts\validate_environment.py --environment production
cd mobile; npm run config:check
```

These report missing settings by **name** and never print a secret value.
