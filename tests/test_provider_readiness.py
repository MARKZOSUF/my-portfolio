"""Provider readiness and feature-flag tests (spec section 3)."""
from unittest.mock import patch

import pytest

from app import create_app
from extensions import db  # noqa: F401  (ensures app context wiring)
from models import DailyUsage, ResearchSession
from services.ai.factory import provider_status


def _post(client, **payload):
    with patch("routes.research.submit_research") as submit:
        response = client.post("/api/research", json=payload)
    return response, submit


def test_missing_key_rejected_before_quota_and_job(client, user, app):
    app.config.update(AI_API_KEY="")
    response, submit = _post(client, query="Topic", live_research=True)
    assert response.status_code == 503
    assert response.json["error"]["code"] == "PROVIDER_NOT_CONFIGURED"
    assert not submit.called
    with app.app_context():
        assert ResearchSession.query.count() == 0
        assert DailyUsage.query.count() == 0  # quota never consumed


def test_ai_disabled_rejected(client, user, app):
    app.config.update(AI_FEATURES_ENABLED=False)
    response, submit = _post(client, query="Topic", live_research=True)
    assert response.status_code == 503
    assert response.json["error"]["code"] == "AI_DISABLED"
    assert not submit.called
    with app.app_context():
        assert ResearchSession.query.count() == 0
        assert DailyUsage.query.count() == 0


def test_unsupported_provider_fails_closed(tmp_path):
    with pytest.raises(RuntimeError):
        create_app("testing", {"AI_PROVIDER": "bogus", "UPLOAD_FOLDER": str(tmp_path / "u")})


def test_generation_only_provider_status(app):
    app.config.update(AI_PROVIDER="gemini", AI_BASE_URL="https://example.com", AI_API_KEY="k")
    with app.app_context():
        status = provider_status()
    assert status["provider"] == "gemini"
    assert status["configured"] and status["enabled"] and status["ready"]
    assert status["capabilities"]["generation"] is True
    assert status["capabilities"]["web_search"] is False
    assert status["mode"] == "document_study"


def test_web_search_provider_status(app):
    with app.app_context():
        status = provider_status()
    assert status["provider"] == "openai"
    assert status["capabilities"]["web_search"] is True
    assert status["capabilities"]["streaming"] is True
    assert status["mode"] == "full_research"
    assert status["ready"] is True


def test_provider_status_never_exposes_key(app, client, user):
    secret = app.config["AI_API_KEY"]
    with app.app_context():
        status = provider_status()
    assert secret not in str(status)
    for endpoint in ("/api/health", "/api/usage", "/api/research/provider"):
        body = client.get(endpoint).get_data(as_text=True)
        assert secret not in body
