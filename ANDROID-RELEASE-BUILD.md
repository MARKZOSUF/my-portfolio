# Android release build

## 1. Create an upload key (once)

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore studyforge-upload.keystore \
  -alias studyforge-upload -keyalg RSA -keysize 2048 -validity 10000
```

Store the file outside the repository. `*.jks` and `*.keystore` are gitignored.

## 2. Configure signing

```bash
cp mobile/android/keystore.properties.example mobile/android/keystore.properties
cp mobile/android/local.properties.example mobile/android/local.properties
```

```properties
STUDYFORGE_UPLOAD_STORE_FILE=/absolute/path/studyforge-upload.keystore
STUDYFORGE_UPLOAD_STORE_PASSWORD=...
STUDYFORGE_UPLOAD_KEY_ALIAS=studyforge-upload
STUDYFORGE_UPLOAD_KEY_PASSWORD=...
```

CI may export the same four names as secret environment variables instead.
If any value is missing or still `CHANGE_ME`, `assembleRelease` and
`bundleRelease` fail immediately with an explanatory message. The debug keystore
is never used for a release.

## 3. Configure the production API URL

```bash
cp mobile/.env.production.example mobile/.env.production
# EXPO_PUBLIC_API_URL must be public HTTPS
npm run config:check
```

Release builds have cleartext traffic disabled (`network_security_config.xml`,
`cleartextTrafficPermitted="false"`). A release pointed at `http://10.0.2.2:...`
fails at startup with a clear configuration error instead of silently hanging.

## 4. Build

```bash
cd mobile
npm ci
npx expo prebuild --platform android
cd android
./gradlew clean
./gradlew assembleDebug
./gradlew assembleRelease
./gradlew bundleRelease
```

Artifacts: `app/build/outputs/apk/release/app-release.apk`,
`app/build/outputs/bundle/release/app-release.aab`.

## 5. Verify

```bash
# release JS bundle is embedded
unzip -l app/build/outputs/apk/release/app-release.apk | grep index.android.bundle
# signing identity is the upload key, not the debug key
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
# cold start with Metro stopped
adb install -r app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.studyforge.ainotes/.MainActivity
adb logcat -d | grep -i AnyTypeCache   # must print nothing
```

The `expo.modules.kotlin.types.AnyTypeCache` crash was caused by mismatched Expo
module versions. `mobile/__tests__/android-release.test.ts` guards the pinned
versions, and `npx expo install --check` plus `npx expo-doctor` must pass. Never
use `npm install --force` or `--legacy-peer-deps`.
