# Google Sign-In setup (and Apple status)

Google Sign-In is implemented end to end in code: the app obtains a real Google
ID token, and the backend cryptographically verifies it before issuing a
StudyForge session. It is **disabled until you supply credentials**, and it fails
closed: with no client ID configured the button does not render and
`POST /auth/google` returns 404.

> Not verified in this environment: no live OAuth round trip was executed. See
> TEST-REPORT.md. Follow the smoke test at the end of this document to confirm on
> your own machine.

## How it works

1. The app builds an `AuthSession` request with `responseType=id_token`, scopes
   `openid profile email`, and a random 32-byte nonce. Only the SHA-256 hash of
   the nonce is sent to Google.
2. Google returns an ID token to `ai-notes-maker://oauth/google`.
3. The app POSTs `{ id_token, nonce }` to `POST /auth/google`. It never inspects
   or trusts the token itself.
4. The backend fetches Google's JWKS (cached, refetched on unknown `kid`) and
   verifies: RS256 signature, `aud` against your configured client IDs, `iss` in
   `accounts.google.com` / `https://accounts.google.com`, `exp`/`iat`/`nbf` with
   clock skew, the nonce hash, and `email_verified`.
5. The identity is linked by `(provider, subject)` in `user_identities` — never by
   email alone, which would allow account takeover. A first-time user gets a
   password-less account, profile, and a verified-email record.

There is no client secret in the mobile app. `GOOGLE_CLIENT_SECRET` is
backend-only and is not needed for this flow.

## 1. Get your Android SHA-1

Google needs the signing certificate fingerprint.

```bash
bash scripts/android-debug-sha1.sh
```

The committed debug keystore in this repository has:

```
SHA1: 6E:8E:D7:C4:C4:04:43:CC:41:C8:F4:EE:88:D7:64:F3:97:65:61:99
```

Use the fingerprint printed on **your** machine. For Play Store builds you must
also add the SHA-1 from **Play Console -> Release -> Setup -> App signing**,
because Google Play re-signs your app.

## 2. Create the OAuth clients

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Configure the OAuth consent screen (External; add your email as a test user
   while in Testing).
2. **Create Credentials -> OAuth client ID -> Android**
   - Package name: `com.studyforge.ainotes`
   - SHA-1: from step 1
3. **Create Credentials -> OAuth client ID -> Web application**
   - This is the audience used for server-side verification.
4. (iOS only) **Create Credentials -> OAuth client ID -> iOS**
   - Bundle ID: `com.studyforge.ainotes`

## 3. Configure the backend

`backend/.env`:

```env
GOOGLE_AUTH_ENABLED=true
GOOGLE_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=yyyy.apps.googleusercontent.com
# GOOGLE_IOS_CLIENT_ID=zzzz.apps.googleusercontent.com
```

Every configured client ID becomes an accepted `aud`. If `GOOGLE_AUTH_ENABLED` is
true with no client ID, startup validation and
`scripts/validate_environment.py` both fail — by design, since every login would
otherwise be rejected.

## 4. Configure the app

`mobile/.env`:

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=yyyy.apps.googleusercontent.com
```

These are public identifiers and are safe to embed. Never put a client secret in
an `EXPO_PUBLIC_*` variable — it ships inside the APK. A test enforces this.

## 5. Apply the migration

```bash
cd backend && alembic upgrade head   # revision 0013_google_identity
```

The migration is additive: it creates `user_identities` and its indexes and does
not alter existing tables.

## 6. Smoke test

```bash
# Backend reports which providers are live
curl -s http://localhost:8000/api/v1/auth/providers
# => {"google":true,"apple":false,"password":true}

# A forged token must be rejected with a generic 401
curl -s -X POST http://localhost:8000/api/v1/auth/google \
  -H 'Content-Type: application/json' \
  -d '{"id_token":"not-a-real-token-000000"}'
```

Then in the app: launch a dev build, open the login screen, and confirm the
"Continue with Google" button appears (it is hidden when unconfigured). Complete
a sign-in and confirm you land on onboarding (new account) or the dashboard
(returning account), and that a row appears in `user_identities`.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Button does not appear | No `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` in `mobile/.env`; restart Expo after editing |
| `Error 400: redirect_uri_mismatch` | Android client is missing or the SHA-1/package name does not match |
| `POST /auth/google` returns 404 | `GOOGLE_AUTH_ENABLED` is not true on the backend |
| 401 on every attempt | `aud` mismatch: the client ID used by the app is not configured on the backend |
| Works in debug, fails from Play | Add the Play App Signing SHA-1 to the Android OAuth client |

## Apple Sign-In status

**Not implemented.** Settings (`APPLE_AUTH_ENABLED`, `APPLE_CLIENT_ID`,
`APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`) and the
`user_identities` table are provider-agnostic and ready, and
`/auth/providers` already reports `apple: false`. There is no Apple verification
service or endpoint. Do not enable it and expect it to work. Note that Apple
requires Sign in with Apple in iOS apps that offer other third-party sign-in, so
this must be completed before an App Store release.
