# Security

## Secret handling

AI, search, storage, SMTP and OAuth credentials exist only in backend settings.
Ordinary users never enter an API key, and no secret is packaged into the APK or
AAB. `EXPO_PUBLIC_*` values are compiled into the app bundle and are therefore
treated as public; `npm run config:check` fails if one looks like a secret.

## Transport

Production requires public HTTPS. The mobile client validates its base URL at
startup and refuses missing URLs, plain HTTP, localhost, `127.0.0.1`, `10.0.2.2`
and private LAN ranges with an explicit configuration error. Android release
builds set `cleartextTrafficPermitted="false"`; cleartext exists only in the
debug source set for the emulator loopback.

## Android hardening

`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` were
removed - scoped storage and the system share/save sheet cover PDF download and
sharing. `allowBackup` is disabled so tokens and cached notes are not copied off
the device. Release builds are signed with an upload key supplied at build time;
the debug keystore can no longer sign a release, and no keystore or password is
in source control.

## Server-side request forgery

Source retrieval blocks private and link-local address space, validates DNS
resolution, limits redirects, caps content size, validates MIME types and applies
timeouts. Self-hosted AI base URLs must match an administrator allow-list; users
cannot supply arbitrary endpoints.

## Authentication

Argon2 password hashing, short-lived access tokens with rotating refresh tokens,
email verification, password reset, logout and session revocation. Tokens are
stored in the platform secure store, never in plain AsyncStorage. Google and
Apple sign-in use the official flows (state, nonce, PKCE where applicable) with
backend token verification and an explicit account-linking/collision policy. No
OAuth client secret ships in the mobile app.

## Authorization and isolation

Every note, job, research run and generated PDF is owner-scoped. Job and note
endpoints resolve the record by id **and** owner, so cross-account access returns
404 rather than leaking existence. PDF downloads are authenticated and served via
short-lived signed URLs.

## Content safety

Rendered HTML is escaped and sanitized. Only `http(s)` links are opened, with
`rel="noopener noreferrer nofollow"`. Numeric expression evaluation runs in a
sandbox with builtins stripped and a token blacklist.

## Reporting

Please report vulnerabilities privately to the maintainers rather than opening a
public issue.
