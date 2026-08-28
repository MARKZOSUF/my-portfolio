# ADR-006: SQLAlchemy plus explicit Alembic migrations

**Status:** Accepted

## Context

The original initial migration called `db.metadata.create_all()` /
`drop_all()`, which is unreviewable, hides schema drift, and is unsafe for
production upgrades.

## Decision

SQLAlchemy models remain the application schema authority, but every Alembic
revision is explicit (`op.create_table`, `op.add_column`, constraints,
indexes). `0001_initial` builds the full original schema; later model changes
land as ordered revisions (`0002_adaptive_study`). Dialect-specific SQL (JSON
defaults) is gated on the bind. `tests/test_migrations.py` enforces
upgrade/downgrade/upgrade plus model parity and rejects any revision using
create_all/drop_all.

## Consequences

Reviewable diffs, safe downgrades, SQLite-tested with PostgreSQL-compatible
types. `AUTO_CREATE_DB` remains for development convenience only and is off
in production.
