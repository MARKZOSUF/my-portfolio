#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a disposable PostgreSQL/pgvector database}"
alembic upgrade head
PYTHONPATH=backend python scripts/verify_schema.py
alembic downgrade base
alembic upgrade head
PYTHONPATH=backend python scripts/verify_schema.py
alembic stamp 0002_ultra
alembic upgrade head
PYTHONPATH=backend python scripts/verify_schema.py
