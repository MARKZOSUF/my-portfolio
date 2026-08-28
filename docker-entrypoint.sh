#!/bin/sh
# Container entrypoint.
#
# Ensures ClamAV virus definitions exist before the app starts. Production
# config requires MALWARE_SCANNER=clamav, and `clamscan` exits non-zero when
# no signature database is present, which would make every upload fail with
# MALWARE_SCAN_FAILED (503).
set -e

if [ "${MALWARE_SCANNER}" = "clamav" ]; then
    if [ ! -f /var/lib/clamav/main.cvd ] && [ ! -f /var/lib/clamav/main.cld ]; then
        echo "[entrypoint] ClamAV signature database missing; running freshclam..."
        freshclam --quiet || echo "[entrypoint] WARNING: freshclam failed; uploads will return 503 until definitions are available."
    fi
fi

exec "$@"
