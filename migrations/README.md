# Database migrations

Alembic/Flask-Migrate owns all schema changes. Revisions are explicit
(`op.create_table`, `op.add_column`, ...); `db.metadata.create_all()` and
`db.metadata.drop_all()` are never used inside revisions.

## Revisions

| Revision | Purpose |
|---|---|
| `0001_initial` | Full initial schema: all tables, keys, constraints, indexes |
| `0002_adaptive_study` | `flashcard.is_current`, document references on `research_fact`, `quiz_attempt` table |

## Commands

```bash
flask db upgrade        # apply (run during deployment before workers start)
flask db downgrade      # revert one revision (test on a disposable backup)
flask db migrate -m "description"   # create a new reviewed revision
```

## Validation policy

Every schema change must pass, on a disposable database:

1. `flask db upgrade` from an empty database
2. `flask db downgrade` back to base
3. `flask db upgrade` again
4. The automated schema-parity check in `tests/test_migrations.py`, which
   compares the migrated schema against the SQLAlchemy models.

SQLite is used for tests; PostgreSQL-specific SQL (for example JSON server
defaults) is gated on the bind dialect inside the revision.
