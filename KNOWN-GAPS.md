# Known gaps

An honest list of everything that could **not** be verified in the offline build
sandbox, plus the deliberate limits of the implementation. Nothing here is
claimed to work; each item states exactly what to run to confirm it.

## Blocked by the sandbox (no network, no SDKs, no services)

| Gap | Impact | How to verify |
| --- | --- | --- |
| `npm ci`, `expo install --check`, `expo-doctor`, `tsc`, ESLint, Jest, production export | Mobile code is committed but never compiled or bundled here. Type errors or a dependency drift would only surface on a networked machine. | `cd mobile && npm ci && npx expo install --check && npx expo-doctor && npm run typecheck && npm test` |
| Gradle `clean` / `assembleDebug` / `assembleRelease` / `bundleRelease` | No APK or AAB was produced, so none is attached to this delivery. | Follow `ANDROID-RELEASE-BUILD.md` on a machine with SDK 36 and JDK 17 |
| Release APK cold start with Metro stopped; `expo.modules.kotlin.types.AnyTypeCache` regression | The historical startup crash is guarded statically (pinned Expo module versions) but not observed on a device. | `adb install -r app-release.apk` then `adb logcat -d \| grep -i AnyTypeCache` |
| Alembic `upgrade head` from empty, `0012 -> 0013`, downgrade, foreign-key integrity | Migrations through `0013_google_identity` (which creates `user_identities`) compile and are inspector-guarded, but have not been executed against Postgres. | `alembic -c database/alembic.ini upgrade head` against a scratch database |
| Full end-to-end topic-to-PDF run | The pipeline is unit-tested stage by stage; it has never executed as a whole against a live database, worker, storage bucket and AI provider. | Bring up the stack per `BACKEND-DEPLOYMENT.md` and submit a topic |
| Live Google sign-in | Google Sign-In is fully implemented (real ID-token verification against Google's JWKS). No provider credentials or network exist here, so the live OAuth round trip is **NOT RUN**. Apple Sign-In is **not implemented** at all. | Configure the client IDs per `GOOGLE-APPLE-AUTH-SETUP.md` and run the flow on a device |
| Live search providers | Tavily, Brave and Serper are exercised only through mocked transports, since no keys and no network exist. The keyless MediaWiki/Crossref/OpenAlex adapters are likewise unit-tested only. | Set the keys and run a real job |

| Gradle debug signing | The missing `debug.keystore` that broke `:app:validateSigningDebug` is now committed and was validated with `keytool`, but **no Gradle build was executed here**, so the Android Studio build itself is unverified. | `cd mobile/android && ./gradlew assembleDebug` |
| Mobile Jest suites | The new `mobile/__tests__/navigation.test.ts` and `googleSignIn.test.ts` assert the Study Pack routing and Google wiring, but Jest needs `node_modules`, which cannot be installed offline. | `cd mobile && npm ci && npm test` |

## Deliberate implementation limits

- **Apple Sign-In is not implemented.** Settings, the provider-agnostic
  `user_identities` table and the `/auth/providers` response are ready, and it
  reports `apple: false`. There is no verification service or endpoint. Apple
  requires Sign in with Apple for iOS apps offering other third-party sign-in, so
  this must be built before an App Store release.
- **The bundled Devanagari face has no bold weight.** `DroidSansDevanagari-Regular.ttf`
  ships without a bold companion, so Hindi headings use the regular weight rather
  than a synthesised or silently-substituted bold. Replace it with Noto Sans
  Devanagari (regular + bold) if you need real bold Devanagari.
- **The legacy workspace screen is retained but deprecated.** `/(main)/workspace`
  now redirects to Study Pack so old deep links do not dead-end; the previous
  implementation is kept unrendered for reference.

## Missing Python packages in this sandbox

| Package | Consequence | Status |
| --- | --- | --- |
| `sympy` | Symbolic equation-equivalence checks return `not_run` rather than a verdict. All numeric, matrix, eigenpair, Cayley-Hamilton and dimensional checks still ran here using exact `Fraction` arithmetic. | Pinned as `sympy==1.13.3` in `backend/requirements.txt`; full symbolic validation activates on install |
| `pytest` | Suites were executed by the rewritten `backend/tests/run_tests.py`, which is a real runner: it awaits coroutine tests and promotes never-awaited-coroutine warnings to errors. The previous version silently passed unawaited async tests. | The same test files run unchanged under real `pytest`; `pytest` could not be installed offline |
| `pydantic_settings` | One test (`test_self_hosted_host_allowlist`) skips because it must import the real settings object. | Skipped honestly; it is not counted as a pass |
| `httpx`, `tenacity` | Imported lazily behind guards so the modules can be unit-tested offline. Both remain hard requirements. | Listed in `backend/requirements.txt` |

## Deliberate product limits (not defects)

- **Keyless research is a baseline, not a web index.** With no commercial search
  key configured, only MediaWiki, Crossref and OpenAlex are used. Coverage of
  very recent material is limited and paywalled sources are inaccessible. The
  note says so explicitly in its limitations section.
- **Cloud AI is not free forever.** The app never charges a user, but an
  administrator pays their own provider. Fair-use limits, quotas and caching
  exist for that reason.
- **No syllabus is invented.** With a topic alone the academic context is labelled
  general/inferred. University-, board- or exam-specific content appears only
  when the profile supplies it and evidence supports it, otherwise the section is
  marked *Insufficient Evidence*.
- **PYQ labelling is conservative.** A question is a verified PYQ only with full
  provenance. Generated practice questions, probable patterns and mock questions
  are labelled separately and never presented as real past papers.
- **Deterministic validation is scoped.** Mathematics that the validator cannot
  express is marked `not_run` rather than "verified".
- **Font coverage.** The renderer embeds the best available Latin and Devanagari
  faces and records a warning if a script has no face. Ship Noto Sans and Noto
  Sans Devanagari in `backend/app/pdf/fonts/` for the best typography; the
  sandbox used DejaVu Sans plus Droid Sans Devanagari, and both rendered cleanly.
- **Diagrams are structured placeholders with labels and captions**, not generated
  artwork. They render as labelled blocks in both the viewer and the PDF.
- **`app/services/storage.py` local backend has no signed URLs.** That is
  intentional: production configuration validation requires S3-compatible durable
  storage for generated PDFs, and local storage falls back to the authenticated
  download endpoint.

## Not attempted

- OpenAPI schema generation and contract testing between mobile and backend is
  asserted by hand-written path tests on both sides rather than generated from a
  live schema, because the FastAPI app cannot boot offline to emit `openapi.json`.
- No load, performance or accessibility audit was run.
