#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?}"; : "${1:?backup dump required}"; sha256sum -c "$1.sha256"; pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$1"; alembic upgrade head; PYTHONPATH=backend python scripts/verify_schema.py
