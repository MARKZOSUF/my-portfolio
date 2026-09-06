"""Alembic runtime environment for StudyForge.

The application runs on asyncpg, so DATABASE_URL normally looks like
``postgresql+asyncpg://...``. Alembic's migration engine is synchronous, so we
detect an async driver and drive it through ``connection.run_sync``. A plain
sync URL (psycopg/psycopg2) still works unchanged.

No credential lives in alembic.ini: the URL always comes from the environment.
"""
import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection

# Revision scripts do `from database.migrations.helpers import ...`, which needs
# the repository root importable even when alembic is invoked from elsewhere.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Revisions are hand-written raw DDL, so there is no model metadata to compare
# against and autogenerate is deliberately unused.
target_metadata = None

ASYNC_DRIVERS = ("+asyncpg", "+aiosqlite", "+asyncmy", "+aiomysql")


def _database_url() -> str:
    """Resolve the URL from the environment, failing loudly if unset."""
    url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url", "")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Export it before running alembic, e.g.\n"
            "  export DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/studyforge"
        )
    return url


def _is_async(url: str) -> bool:
    return any(driver in url for driver in ASYNC_DRIVERS)


def run_migrations_offline() -> None:
    """Emit SQL to stdout without connecting (alembic upgrade head --sql)."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def _run_async_migrations(url: str) -> None:
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(url, poolclass=pool.NullPool)
    try:
        async with engine.connect() as connection:
            await connection.run_sync(_do_run_migrations)
    finally:
        await engine.dispose()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    url = _database_url()

    if _is_async(url):
        asyncio.run(_run_async_migrations(url))
        return

    from sqlalchemy import create_engine

    engine = create_engine(url, poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            _do_run_migrations(connection)
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
