"""Core research route tests (updated for the readiness gate and strict
mode rules)."""
from unittest.mock import patch

from extensions import db
from models import Flashcard, Note, Quiz, ResearchSession, User

VALID_MCQ = {"question": "What is 1NF?", "options": ["Atomic values", "B", "C", "D"], "answer": "Atomic values"}


def test_create_and_continue_reserve_quota(client, user):
    with patch("routes.research.submit_research"):
        r = client.post("/api/research", json={"query": "Newton laws", "mode": "quick", "language": "English"})
        assert r.status_code == 202
        rid = r.json["research"]["id"]
        c = client.post(f"/api/research/{rid}/continue", json={"focus": "applications"})
        assert c.status_code == 202


def test_document_mode_requires_document(client, user, app):
    app.config.update(AI_PROVIDER="gemini", AI_BASE_URL="https://example.com")
    r = client.post("/api/research", json={"query": "topic", "mode": "quick", "live_research": True})
    assert r.status_code == 422
    assert r.json["error"]["code"] == "WEB_SEARCH_NOT_SUPPORTED"


def test_ownership(client, user):
    assert client.get("/api/research/not-mine").status_code == 404
    assert client.delete("/api/documents/not-mine").status_code == 404


def test_duplicate_artifacts_reused(client, user, app):
    with app.app_context():
        u = User.query.filter_by(email="student@example.com").first()
        s = ResearchSession(
            user_id=u.id,
            query="T",
            status="complete",
            result_json={
                "complete_notes_markdown": "N",
                "mcqs": [VALID_MCQ],
                "flashcards": [{"front": "F", "back": "B"}],
            },
        )
        db.session.add(s)
        db.session.commit()
        pid = s.public_id
    n1 = client.post("/api/notes/generate", json={"research_id": pid})
    n2 = client.post("/api/notes/generate", json={"research_id": pid})
    assert n2.json["reused"]
    q1 = client.post("/api/quiz/generate", json={"research_id": pid})
    assert q1.status_code == 201
    q2 = client.post("/api/quiz/generate", json={"research_id": pid})
    assert q2.json["reused"]
    f1 = client.post("/api/flashcards/generate", json={"research_id": pid})
    f2 = client.post("/api/flashcards/generate", json={"research_id": pid})
    assert f2.json["reused"]


def test_retry_requires_failed_status(client, user, app):
    with app.app_context():
        u = User.query.filter_by(email="student@example.com").first()
        s = ResearchSession(user_id=u.id, query="T", status="complete")
        db.session.add(s)
        db.session.commit()
        pid = s.public_id
    assert client.post(f"/api/research/{pid}/retry").status_code == 409


def test_provider_endpoint_is_safe(client, user, app):
    body = client.get("/api/research/provider").get_data(as_text=True)
    assert app.config["AI_API_KEY"] not in body
    assert "capabilities" in body
