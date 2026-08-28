"""Health endpoint tests (spec section 9). The AI provider is never called."""
import pytest

from app import create_app
from extensions import db


@pytest.fixture
def rq_app(tmp_path):
    app = create_app(
        "testing",
        {"UPLOAD_FOLDER": str(tmp_path / "uploads"), "JOB_BACKEND": "rq", "REDIS_URL": "redis://127.0.0.1:6399/0"},
    )
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_liveness(client):
    response = client.get("/api/health/live")
    assert response.status_code == 200
    assert response.json["status"] == "alive"


def test_readiness_healthy_database(client):
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    assert response.json["checks"]["database"] is True
    assert "redis" not in response.json["checks"]  # not required for thread backend


def test_readiness_failed_database(client, monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(db.session, "execute", broken)
    response = client.get("/api/health/ready")
    assert response.status_code == 503
    assert response.json["checks"]["database"] is False


def test_readiness_redis_required_but_unavailable(rq_app):
    response = rq_app.test_client().get("/api/health/ready")
    assert response.status_code == 503
    assert response.json["checks"]["redis"] is False


def test_readiness_does_not_depend_on_provider_key(client, app):
    app.config.update(AI_API_KEY="")
    response = client.get("/api/health/ready")
    assert response.status_code == 200  # missing AI key is not a readiness failure


def test_liveness_independent_of_readiness(client, app, monkeypatch):
    app.config.update(AI_API_KEY="", AI_FEATURES_ENABLED=False)
    monkeypatch.setattr(db.session, "execute", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))
    assert client.get("/api/health/live").status_code == 200
    assert client.get("/api/health/ready").status_code == 503


def test_legacy_health_backward_compatible(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    for key in ("status", "database", "provider_configured", "provider", "mode", "capabilities"):
        assert key in response.json
