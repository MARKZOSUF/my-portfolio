"""Background-job reliability tests (spec section 13). FakeProvider only."""
from unittest.mock import patch

from extensions import db
from models import DailyUsage, Note, ResearchSession
from services.ai.factory import get_ai_provider
from services.research.pipeline import run_research
from tests.conftest import FakeProvider, make_document, make_user
from utils.errors import AppError


def _create(client, **payload):
    payload.setdefault("query", "Databases")
    payload.setdefault("live_research", True)
    return client.post("/api/research", json=payload)


def test_enqueue_failure_marks_failed_and_refunds_quota(client, user, app):
    with patch("routes.research.submit_research", side_effect=AppError("JOB_ENQUEUE_FAILED", "queue down", 503)):
        response = _create(client)
    assert response.status_code == 503
    assert response.json["error"]["code"] == "JOB_ENQUEUE_FAILED"
    with app.app_context():
        row = ResearchSession.query.one()
        assert row.status == "failed" and row.error_code == "JOB_ENQUEUE_FAILED"
        daily = DailyUsage.query.one()
        assert daily.count == 0  # unfair consumption refunded


def test_duplicate_worker_execution_is_idempotent(client, user, app):
    with patch("routes.research.submit_research"):
        response = _create(client)
    pid = response.json["research"]["id"]
    fake = FakeProvider()
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=pid).first()
        with patch("services.research.pipeline.get_ai_provider", return_value=fake):
            run_research(row.id)  # completes the session
            first_notes = Note.query.count()
            run_research(row.id)  # duplicate worker run: must no-op
            assert Note.query.count() == first_notes
            assert db.session.get(ResearchSession, row.id).status == "complete"


def test_provider_timeout_fails_session_safely(client, user, app):
    with patch("routes.research.submit_research"):
        response = _create(client, live_research=False, document_ids=[_doc(app).public_id])
    fake = FakeProvider(error=AppError("PROVIDER_TIMEOUT", "The AI provider could not be reached safely.", 504))
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        with patch("services.research.pipeline.get_ai_provider", return_value=fake):
            run_research(row.id)
        row = db.session.get(ResearchSession, row.id)
        assert row.status == "failed"
        assert row.error_code == "PROVIDER_TIMEOUT"


def test_malformed_provider_json_fails_safely(client, user, app):
    with patch("routes.research.submit_research"):
        response = _create(client, live_research=False, document_ids=[_doc(app).public_id])
    fake = FakeProvider(responses=["not json at all", "still not json"])
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        with patch("services.research.pipeline.get_ai_provider", return_value=fake):
            run_research(row.id)
        row = db.session.get(ResearchSession, row.id)
        assert row.status == "failed"
        assert row.error_code == "INVALID_PROVIDER_OUTPUT"


def test_unexpected_error_rolls_back_artifacts(client, user, app):
    with patch("routes.research.submit_research"):
        response = _create(client, live_research=False, document_ids=[_doc(app).public_id])
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        with patch("services.research.pipeline.get_ai_provider", side_effect=RuntimeError("boom")):
            run_research(row.id)
        row = db.session.get(ResearchSession, row.id)
        assert row.status == "failed"
        assert row.error_code == "RESEARCH_FAILED"
        assert "boom" not in (row.error_message or "")  # internals not leaked
        assert Note.query.count() == 0  # no half-created artifacts


def test_retry_failed_research(client, user, app):
    with patch("routes.research.submit_research"):
        response = _create(client)
    pid = response.json["research"]["id"]
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=pid).first()
        with patch("services.research.pipeline.get_ai_provider", side_effect=RuntimeError("boom")):
            run_research(row.id)
        assert db.session.get(ResearchSession, row.id).status == "failed"
    with patch("routes.research.submit_research") as submit:
        retry = client.post(f"/api/research/{pid}/retry")
    assert retry.status_code == 202
    assert submit.called
    assert retry.json["research"]["status"] == "queued"
    # A non-failed session cannot be retried.
    assert client.post(f"/api/research/{pid}/retry").status_code == 409


def test_stuck_session_recovery(client, user, app):
    from datetime import datetime, timedelta, timezone

    from services.jobs import recover_stuck_sessions

    with patch("routes.research.submit_research"):
        response = _create(client)
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        row.status = "running"
        row.updated_at = datetime.now(timezone.utc) - timedelta(hours=2)
        db.session.commit()
        assert recover_stuck_sessions(minutes=30) == 1
        row = db.session.get(ResearchSession, row.id)
        assert row.status == "failed" and row.error_code == "STALE_JOB_RECOVERED"


def _doc(app):
    from models import User

    with app.app_context():
        owner = User.query.filter_by(email="student@example.com").first()
        owner_id = owner.id
    return make_document(app, owner_id)
