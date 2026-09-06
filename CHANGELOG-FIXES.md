# CHANGELOG-FIXES

Every file added, edited, or deleted while making this project build an Android APK/AAB.

**Totals: 119 added, 9 edited, 28 deleted.** Baseline: `AI-NOTES-MAKER-ULTRA-FINAL-VALIDATED.zip` (346 files) -> 437 files.

> ## KNOWN GAP (read first)
> `mobile/android/gradle/wrapper/gradle-wrapper.jar` is **NOT** in this zip. It is a binary that
> can only be produced by Gradle or downloaded, and the build sandbox had no network access and no
> `gradle` on PATH. Everything else is complete. Create it with ONE command:
>
> ```bash
> cd mobile/android && gradle wrapper --gradle-version 8.13 --distribution-type all
> ```
>
> Or simply open `mobile/android` in Android Studio, which regenerates the wrapper on first sync.

---

## PART A - Android native + Gradle (ADD)

| File | Reason |
| --- | --- |
| `mobile/android/settings.gradle` | ADD - Expo autolinking + RN settings plugin; without it no native module is linked. |
| `mobile/android/build.gradle` | ADD - Root build script: AGP, Kotlin, expo-root-project, SDK/NDK versions. |
| `mobile/android/gradle.properties` | ADD - JVM heap, AndroidX, `newArchEnabled`, `hermesEnabled`, ABI list, Expo flags. |
| `mobile/android/gradle/wrapper/gradle-wrapper.properties` | ADD - Pins Gradle 8.13 (`-all` distribution). |
| `mobile/android/gradlew` | ADD - POSIX wrapper launcher (mode 755); fails with a clear message if the jar is absent. |
| `mobile/android/gradlew.bat` | ADD - Windows wrapper launcher (CRLF). |
| `mobile/android/local.properties.example` | ADD - Template for `sdk.dir`; real `local.properties` is machine-specific. |
| `mobile/android/.gitignore` | ADD - Excludes `local.properties`, `build/`, `.cxx/`, keystores. |
| `mobile/android/app/build.gradle` | ADD - App module: namespace/applicationId `com.studyforge.ainotes`, versionCode 1, versionName 1.0.0, `autolinkLibrariesWithApp()`, JVM 17, debug+release signing with safe fallback, minify/shrink, ABI splits, bundle config. |
| `mobile/android/app/proguard-rules.pro` | ADD - Keep rules for RN, Hermes, OkHttp, expo-notifications/sqlite/camera, Reanimated. |
| `mobile/android/app/debug.keystore` | ADD - Real PKCS12 keystore so a fresh clone can build a debug APK immediately. |
| `mobile/android/app/src/main/AndroidManifest.xml` | ADD - Permissions, exported MainActivity, splash theme, deep links, notification meta-data, network security config. |
| `mobile/android/app/src/debug/AndroidManifest.xml` | ADD - Debug-only cleartext traffic for the dev server. |
| `mobile/android/app/src/main/java/com/studyforge/ainotes/MainActivity.kt` | ADD - ReactActivity + delegate, splash screen, edge-to-edge. |
| `mobile/android/app/src/main/java/com/studyforge/ainotes/MainApplication.kt` | ADD - ReactApplication, DefaultReactNativeHost, SoLoader, New Architecture + Hermes. |
| `mobile/android/app/src/main/res/values/strings.xml` | ADD - `app_name` = StudyForge AI, splash resize mode. |
| `mobile/android/app/src/main/res/values/styles.xml` | ADD - `AppTheme`, `Theme.App.SplashScreen`, `ResetEditText`. |
| `mobile/android/app/src/main/res/values/colors.xml` | ADD - Splash `#F9F8F7`, notification `#2783DE`, launcher background. |
| `mobile/android/app/src/main/res/values-night/colors.xml` | ADD - Dark-mode variants (app is `userInterfaceStyle: automatic`). |
| `mobile/android/app/src/main/res/xml/network_security_config.xml` | ADD - Allows cleartext to `10.0.2.2` in dev only. |
| `mobile/android/app/src/main/res/drawable/splashscreen.xml` | ADD - Splash layer-list (background + centred logo). |
| `mobile/android/app/src/main/res/drawable/ic_launcher_background.xml` | ADD - Adaptive-icon background layer. |
| `mobile/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` | ADD - Adaptive icon (API 26+). |
| `mobile/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml` | ADD - Round adaptive icon. |
| `mobile/android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` | ADD (5) - Legacy launcher icons, 48/72/96/144/192 px, generated from `assets/icon.png`. |
| `mobile/android/app/src/main/res/mipmap-{mdpi..xxxhdpi}/ic_launcher_round.png` | ADD (5) - Round variants with circular alpha mask. |
| `mobile/android/app/src/main/res/mipmap-{mdpi..xxxhdpi}/ic_launcher_foreground.png` | ADD (5) - Adaptive foreground, 108-432 px, 62% safe zone. |
| `mobile/android/app/src/main/res/drawable-{mdpi..xxxhdpi}/splashscreen_logo.png` | ADD (5) - Splash logo per density. |
| `mobile/android/app/src/main/res/drawable/splashscreen_logo.png` | ADD - Density-independent fallback. |
| `mobile/android/app/src/main/res/drawable-{mdpi..xxxhdpi}/notification_icon.png` | ADD (5) - White silhouettes; Android tints notification icons. |
| `mobile/android/app/src/main/res/drawable/notification_icon.png` | ADD - Fallback notification icon. |
| `tools/generate-android-assets.sh` | ADD - The ImageMagick + keytool script that produced every PNG and the debug keystore. |

## PART B - Mobile JS build config

| File | Reason |
| --- | --- |
| `mobile/babel.config.js` | ADD - Was missing; Metro could not bundle. `babel-preset-expo` + worklets plugin LAST. |
| `mobile/metro.config.js` | ADD - Was missing; registers `svg`/`db`/`bin` as asset extensions. |
| `mobile/.env.example` | ADD - `app.config.ts` reads `EXPO_PUBLIC_API_URL`; documents the `10.0.2.2` emulator rule. |
| `mobile/package.json` | EDIT - Added `react-native-worklets` (required by Reanimated 4 for its Babel plugin - build would fail without it), `expo-build-properties`, dev deps `@babel/core` + `babel-preset-expo`, and scripts `prebuild:android`, `build:apk`, `build:aab`, `clean:android`. |
| `mobile/app.json` | EDIT - Added `android.edgeToEdgeEnabled` and the `expo-build-properties` plugin pinning compileSdk/targetSdk 36, minSdk 24, Build-Tools 36.0.0, NDK 27.1.12297006, Kotlin 2.1.20. |

## PART C - Filled empty mobile folders (all ADD)

| File | Reason |
| --- | --- |
| `mobile/constants/config.ts` | ADD - API path map, storage keys, timeouts, feature list. |
| `mobile/constants/routes.ts` | ADD - Route constants + deep-link host mapping matching `app.json`. |
| `mobile/constants/index.ts` | ADD - Barrel export. |
| `mobile/utils/format.ts` | ADD - Counts, percents, minutes, bytes, truncation, mastery labels. |
| `mobile/utils/dates.ts` | ADD - Due/overdue logic, relative time, ISO helpers for revision scheduling. |
| `mobile/utils/errors.ts` | ADD - Maps `ApiError` to user-facing copy; retryability. |
| `mobile/utils/validation.ts` | ADD - Zod schemas for auth, generation, study plans, YouTube URLs. |
| `mobile/utils/index.ts` | ADD - Barrel export. |
| `mobile/hooks/useDebounce.ts` | ADD - Debounced value + callback for search inputs. |
| `mobile/hooks/useAsync.ts` | ADD - Cancel-safe async state for one-shot actions. |
| `mobile/hooks/useNetworkStatus.ts` | ADD - NetInfo wrapper driving the offline banner. |
| `mobile/hooks/useNotifications.ts` | ADD - Permission flow + revision reminder scheduling. |
| `mobile/hooks/index.ts` | ADD - Barrel export. |
| `mobile/components/charts/{BarChart,SparkLine,index}` | ADD (3) - Dependency-free progress charts. |
| `mobile/components/navigation/{HeaderBar,EmptyState,index}` | ADD (3) - Shared header and empty-state. |
| `mobile/components/documents/{DocumentListItem,index}` | ADD (2) - Document row with processing status. |
| `mobile/components/flashcards/{FlashcardTile,index}` | ADD (2) - Flip card with SM-2 grade buttons. |
| `mobile/components/formulas/{FormulaCard,index}` | ADD (2) - Formula with variable legend. |
| `mobile/components/quiz/{QuestionCard,index}` | ADD (2) - Handles every `QuizQuestion` type. |
| `mobile/components/research/{EvidenceList,index}` | ADD (2) - Cited evidence with source hosts. |
| `mobile/components/tutor/{ChatBubble,index}` | ADD (2) - Tutor chat bubble. |
| `mobile/features/notes/useNotes.ts` | ADD - List/get/delete notes with offline cache fallback. |
| `mobile/features/documents/useDocuments.ts` | ADD - Upload + poll processing status. |
| `mobile/features/quiz/useQuiz.ts` | ADD - Generate quiz, score, submit attempt. |
| `mobile/features/flashcards/useFlashcards.ts` | ADD - Due queue + review submission. |
| `mobile/features/revision/useRevision.ts` | ADD - Due cards and ranked recommendations. |
| `mobile/features/progress/useProgress.ts` | ADD - Mastery, streaks, weak topics. |
| `mobile/features/study-plan/useStudyPlan.ts` | ADD - Plan tasks, transitions, adapt. |
| `mobile/features/research/useResearch.ts` | ADD - Research job start + event polling. |
| `mobile/features/tutor/useTutor.ts` | ADD - Tutor chat session state. |
| `mobile/features/search/useSearch.ts` | ADD - Debounced RAG search. |
| `mobile/features/youtube/useYoutube.ts` | ADD - YouTube -> study package. |
| `mobile/features/exam/useExams.ts` | ADD - Exam analysis and priorities. |
| `mobile/features/memory/useMemoryTricks.ts` | ADD - Mnemonic generation. |
| `mobile/features/settings/useSettings.ts` | ADD - Profile + preferences, privacy export/delete. |
| 25 x `.gitkeep` | DELETE - Superseded by real files in every folder listed above. |

## PART D - Backend fixes

| File | Reason |
| --- | --- |
| `backend/app/ai/vision/__init__.py` | ADD - Missing package marker; import would fail. |
| `backend/app/api/v1/learning/__init__.py` | ADD - Missing package marker for an already-registered router. |
| `backend/app/api/v1/privacy/__init__.py` | ADD - Missing package marker for an already-registered router. |
| `backend/app/knowledge/__init__.py` | ADD - Missing package marker. |
| `backend/app/knowledge/artifacts.py` | ADD - Shared `StudyArtifact` router factory (generate/list/get/delete) reused by 5 routers. |
| `backend/app/api/v1/definitions/routes.py` | ADD - `routes.py` was missing though mobile already called it. |
| `backend/app/api/v1/derivations/routes.py` | ADD - Same. |
| `backend/app/api/v1/formulas/routes.py` | ADD - Same. |
| `backend/app/api/v1/numericals/routes.py` | ADD - Same. |
| `backend/app/api/v1/questions/routes.py` | ADD - Artifact generation plus normalised `questions` table endpoints. |
| `backend/app/api/v1/pyq/routes.py` | ADD - PYQ listing, ingest, and repeat-pattern analysis. |
| `backend/app/api/v1/revision/routes.py` | ADD - `/revision/due`, `/recommendations`, `/upcoming`. |
| `backend/app/api/v1/study_plan/routes.py` | ADD - Plan CRUD, task generation, `/adapt` rollover. |
| `backend/app/api/v1/router.py` | EDIT - Registered the 8 new routers (19 -> 27). |
| `backend/app/memory_engine/__init__.py` + `mnemonics.py` | EDIT/ADD - Implemented acronym, acrostic, chunking, peg and story mnemonics. |
| `backend/app/translation/__init__.py` + `service.py` | EDIT/ADD - Hindi/Hinglish handling that masks technical terms and math before translation. |
| `backend/app/voice/__init__.py` + `speech.py` | EDIT/ADD - Markdown/LaTeX to speakable text, TTS chunking, transcript cleanup. |
| `backend/app/collaboration/__init__.py` + `sharing.py` | EDIT/ADD - Role ranking, share-token hashing, link validity. |
| `backend/app/ai/caching/__init__.py` + `cache.py` | EDIT/ADD - Deterministic prompt keys + thread-safe TTL cache. |
| `backend/app/ai/memory/__init__.py` + `conversation.py` | EDIT/ADD - Token-budgeted tutor memory with evicted-turn summary. |
| `database/migrations/versions/0011_study_artifacts_study_artifacts.py` | ADD - **`study_artifacts` existed in `models.py` but no migration ever created it.** The table backs all 8 new routers, so they would have failed at runtime. |
| `backend/app/api/v1/study-plan/README.md` | DELETE - README-only duplicate; `study_plan/` is the real package. |
| `backend/app/exam-intelligence/README.md` | DELETE - README-only duplicate of `exam_intelligence` behaviour. |
| `backend/app/memory-engine/README.md` | DELETE - README-only duplicate; `memory_engine/` is the real package. |

## Root

| File | Reason |
| --- | --- |
| `CHANGELOG-FIXES.md` | ADD - This file. |

---

## Deviations from the brief (disclosed, not silent)

1. **compileSdk / targetSdk 36, not 35.** Expo SDK 54 requires 36; forcing 35 breaks the build.
   Override via `android.compileSdkVersion` / `android.targetSdkVersion` in `gradle.properties`.
2. **`react-native-worklets` added as a dependency.** Reanimated 4 ships its Babel plugin there.
   The brief did not list it, but bundling fails without it.
3. **Migration 0011 added.** The brief said migrations 0001-0010 were fine. They are internally
   consistent, but they never create `study_artifacts`, which `models.py` declares.
4. **`react-native-worklets` version `~0.5.1` is unverified** - no registry access to confirm the
   exact SDK 54 pin. Run `npx expo install --fix` after `npm install` to correct it if needed.
