#!/usr/bin/env bash
# Print the SHA-1 / SHA-256 fingerprints of the debug keystore.
#
# Google Cloud Console requires the SHA-1 of the signing certificate when you
# create an Android OAuth client. Run this, copy the SHA1 line, and paste it into
# the Android OAuth client alongside the package name com.studyforge.ainotes.
set -euo pipefail

KEYSTORE="${1:-$(dirname "$0")/../mobile/android/app/debug.keystore}"

if [ ! -f "$KEYSTORE" ]; then
  echo "debug keystore not found: $KEYSTORE" >&2
  echo "Run scripts/bootstrap-debug-keystore.sh first." >&2
  exit 1
fi

keytool -list -v \
  -keystore "$KEYSTORE" \
  -alias androiddebugkey \
  -storepass android \
  -keypass android \
  | grep -E 'Alias|Valid|SHA1|SHA256'
