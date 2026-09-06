#!/bin/bash
set -euo pipefail
ROOT=/data/proj/AI-NOTES-MAKER/mobile
ASSETS=$ROOT/assets
RES=$ROOT/android/app/src/main/res

echo "=== source assets ==="
for f in icon.png adaptive-icon.png splash.png notification-icon.png; do
  magick identify "$ASSETS/$f"
done

# ---------------------------------------------------------------------------
# 1. Launcher icons (legacy square + round) : 48/72/96/144/192 px
# ---------------------------------------------------------------------------
set -- mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192
for pair in "$@"; do
  d=${pair%%:*}; px=${pair##*:}
  mkdir -p "$RES/mipmap-$d"
  magick "$ASSETS/icon.png" -alpha on -background none -resize ${px}x${px}^ -gravity center -extent ${px}x${px} "$RES/mipmap-$d/ic_launcher.png"
  # round variant: circular mask
  magick "$RES/mipmap-$d/ic_launcher.png" \
    \( +clone -alpha extract -draw "fill black polygon 0,0 0,${px} ${px},0 fill white circle $((px/2)),$((px/2)) $((px/2)),0" \
       -alpha off \) -compose CopyOpacity -composite "$RES/mipmap-$d/ic_launcher_round.png"
done

# ---------------------------------------------------------------------------
# 2. Adaptive icon foreground : 108dp -> 108/162/216/324/432 px
#    Foreground art must sit inside the safe zone (inner 66dp of 108dp),
#    so the source art is scaled to ~62% and padded transparently.
# ---------------------------------------------------------------------------
set -- mdpi:108 hdpi:162 xhdpi:216 xxhdpi:324 xxxhdpi:432
for pair in "$@"; do
  d=${pair%%:*}; px=${pair##*:}
  inner=$(( px * 62 / 100 ))
  mkdir -p "$RES/mipmap-$d"
  magick "$ASSETS/adaptive-icon.png" -alpha on -background none -resize ${inner}x${inner} \
    -gravity center -extent ${px}x${px} "$RES/mipmap-$d/ic_launcher_foreground.png"
done

# ---------------------------------------------------------------------------
# 3. Splash screen logo : ~200dp wide, contain mode
# ---------------------------------------------------------------------------
set -- mdpi:200 hdpi:300 xhdpi:400 xxhdpi:600 xxxhdpi:800
for pair in "$@"; do
  d=${pair%%:*}; px=${pair##*:}
  mkdir -p "$RES/drawable-$d"
  magick "$ASSETS/splash.png" -alpha on -background none -resize ${px}x${px} "$RES/drawable-$d/splashscreen_logo.png"
done
# default-density fallback so @drawable/splashscreen_logo always resolves
mkdir -p "$RES/drawable"
magick "$ASSETS/splash.png" -alpha on -background none -resize 400x400 "$RES/drawable/splashscreen_logo.png"

# ---------------------------------------------------------------------------
# 4. Notification icon : must be a white-on-transparent silhouette.
#    24/36/48/72/96 px
# ---------------------------------------------------------------------------
set -- mdpi:24 hdpi:36 xhdpi:48 xxhdpi:72 xxxhdpi:96
for pair in "$@"; do
  d=${pair%%:*}; px=${pair##*:}
  mkdir -p "$RES/drawable-$d"
  magick "$ASSETS/notification-icon.png" -alpha on -background none -resize ${px}x${px} \
    -fill white -colorize 100 "$RES/drawable-$d/notification_icon.png"
done
magick "$ASSETS/notification-icon.png" -alpha on -background none -resize 48x48 -fill white -colorize 100 "$RES/drawable/notification_icon.png"

# ---------------------------------------------------------------------------
# 5. Debug keystore (real binary, standard AOSP debug credentials)
# ---------------------------------------------------------------------------
KS=$ROOT/android/app/debug.keystore
rm -f "$KS"
keytool -genkeypair -v \
  -keystore "$KS" \
  -storetype PKCS12 \
  -storepass android \
  -keypass android \
  -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -dname "CN=Android Debug,O=Android,C=US" 2>&1 | tail -5

chmod +x "$ROOT/android/gradlew"

echo
echo "=== generated resource files ==="
find "$RES" -type f | sort
echo
echo "=== keystore verification ==="
keytool -list -v -keystore "$KS" -storepass android 2>/dev/null | head -12
