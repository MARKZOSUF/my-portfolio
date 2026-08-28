"""Migration validation: upgrade from empty, downgrade, upgrade again, and
schema parity between Alembic revisions and the SQLAlchemy models."""
import pytest
from sqlalchemy import inspect

from app import create_app
from extensions import db

flask_migrate = pytest.importorskip("flask_migrate")


@pytest.fixture
def migrated_app(tmp_path):
    app = create_app(
        "testing",
        {
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'migrated.db'}",
            "AUTO_CREATE_DB": False,
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        },
    )
    return app


def _tables():
    return set(inspect(db.engine).get_table_names())


def _model_columns():
    return {name: {c.name for c in table.columns} for name, table in db.metadata.tables.items()}


def test_upgrade_downgrade_upgrade_and_parity(migrated_app):
    with migrated_app.app_context():
        flask_migrate.upgrade()
        migrated = _tables()
        expected = set(_model_columns())
        assert expected <= migrated, f"missing tables: {expected - migrated}"

        # Column-level parity for every model table.
        inspector = inspect(db.engine)
        for table, columns in _model_columns().items():
            actual = {c["name"] for c in inspector.get_columns(table)}
            assert columns <= actual, f"{table} missing columns: {columns - actual}"

        flask_migrate.downgrade(revision="base")
        assert _tables() == {"alembic_version"}

        flask_migrate.upgrade()
        assert expected <= _tables()


def test_initial_revision_is_explicit():
    """Revisions must not use metadata create_all/drop_all shortcuts."""
    import pathlib

    versions = pathlib.Path("migrations/versions")
    for revision in versions.glob("*.py"):
        body = revision.read_text()
        assert "create_all" not in body
        assert "drop_all" not in body
        assert "op.create_table" in body or "op.add_column" in body
