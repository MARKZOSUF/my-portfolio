#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?}"; DEST=${BACKUP_DIR:-/backups}; RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}; mkdir -p "$DEST"; file="$DEST/studyforge-$(date -u +%Y%m%dT%H%M%SZ).dump"; pg_dump --format=custom --no-owner --file="$file" "$DATABASE_URL"; pg_restore --list "$file" >/dev/null; find "$DEST" -name 'studyforge-*.dump' -mtime +"$RETENTION_DAYS" -delete; sha256sum "$file" > "$file.sha256"; echo "$file"
