#!/usr/bin/env bash
# Create mobile/android/app/debug.keystore if it is missing.
#
# app/build.gradle references this file. A missing keystore is what made
# :app:validateSigningDebug fail with "Keystore file ... not found". The file is
# committed to this repository, so normally you never need to run this; use it
# after a clean checkout that stripped binaries, or to regenerate the keystore.
#
# These are the standard, well-known Android debug credentials. They are NOT
# secret and MUST NOT be used to sign a release build.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/../mobile/android/app" && pwd)"
KEYSTORE="$DIR/debug.keystore"

if [ -f "$KEYSTORE" ]; then
  echo "debug.keystore already exists: $KEYSTORE"
  exit 0
fi

command -v keytool >/dev/null 2>&1 || {
  echo "keytool not found. Install a JDK (Android Studio bundles one)." >&2
  exit 1
}

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -storetype PKCS12 \
  -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass android -keypass android \
  -dname 'CN=Android Debug, O=Android, C=US'

echo "Created $KEYSTORE"
