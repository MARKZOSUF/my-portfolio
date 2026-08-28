"""Strict research-mode enforcement tests (spec section 1).

All provider calls use FakeProvider; no network or provider credits are used.
"""
from types import SimpleNamespace
from unittest.mock import patch

from extensions import db
from models import ResearchSession, ResearchSource, User
from services.ai.base import ProviderCapabilities, SearchHit
from services.research.pipeline import run_research
from tests.conftest import FakeProvider, make_document

WEB_CAPS = ProviderCapabilities(generation=True, streaming=True, web_search=True)
GEN_CAPS = ProviderCapabilities(generation=True, streaming=False, web_search=False)


def _owner_id(app):
    with app.app_context():
        return User.query.filter_by(email="student@example.com").first().id


def _create_session(client, **payload):
    with patch("routes.research.submit_research"):
        return client.post("/api/research", json=payload)


def _run(app, session_id, fake):
    with app.app_context():
        with patch("services.research.pipeline.get_ai_provider", return_value=fake):
            run_research(session_id)
        return db.session.get(ResearchSession, session_id)


def test_openai_no_live_with_document_never_searches(client, user, app):
    doc = make_document(app, _owner_id(app))
    response = _create_session(
        client, query="Explain normalization", live_research=False, document_ids=[doc.public_id]
    )
    assert response.status_code == 202
    assert response.json["research"]["study_mode"] == "document_study"

    fake = FakeProvider(capabilities=WEB_CAPS, search_hits=[SearchHit("T", "https://example.com/a")])
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        row = _run(app, row.id, fake)
        assert row.status == "complete"
        assert row.study_mode == "document_study"
        assert ResearchSource.query.filter_by(session_id=row.id).count() == 0
    assert fake.search_calls == []  # web-capable provider, but no web search


def test_openai_no_live_without_document_rejected(client, user, app):
    response = _create_session(client, query="Anything", live_research=False)
    assert response.status_code == 422
    assert response.json["error"]["code"] == "DOCUMENTS_REQUIRED"
    with app.app_context():
        assert ResearchSession.query.count() == 0


def test_generation_only_provider_with_document_works(client, user, app):
    app.config.update(AI_PROVIDER="gemini", AI_BASE_URL="https://example.com")
    doc = make_document(app, _owner_id(app))
    response = _create_session(client, query="Study my notes", live_research=False, document_ids=[doc.public_id])
    assert response.status_code == 202
    fake = FakeProvider(capabilities=GEN_CAPS)
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        row = _run(app, row.id, fake)
        assert row.status == "complete"


def test_full_research_with_unsupported_provider_rejected(client, user, app):
    app.config.update(AI_PROVIDER="gemini", AI_BASE_URL="https://example.com")
    response = _create_session(client, query="Latest AI news", live_research=True)
    assert response.status_code == 422
    assert response.json["error"]["code"] == "WEB_SEARCH_NOT_SUPPORTED"
    with app.app_context():
        assert ResearchSession.query.count() == 0


def test_pipeline_refuses_full_research_without_search_capability(client, user, app):
    """Defense in depth: even if a bad row exists, the pipeline fails safe."""
    with app.app_context():
        row = ResearchSession(user_id=_owner_id(app), query="X", study_mode="full_research")
        db.session.add(row)
        db.session.commit()
        row = _run(app, row.id, FakeProvider(capabilities=GEN_CAPS))
        assert row.status == "failed"
        assert row.error_code == "WEB_SEARCH_NOT_SUPPORTED"


def test_document_mode_followup_stays_document_only(client, user, app):
    doc = make_document(app, _owner_id(app))
    with patch("routes.research.submit_research"):
        first = client.post(
            "/api/research", json={"query": "Base", "live_research": False, "document_ids": [doc.public_id]}
        )
        follow = client.post(f"/api/research/{first.json['research']['id']}/continue", json={"focus": "details"})
    assert follow.status_code == 202
    assert follow.json["research"]["study_mode"] == "document_study"

    fake = FakeProvider(capabilities=WEB_CAPS, search_hits=[SearchHit("T", "https://example.com/a")])
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=follow.json["research"]["id"]).first()
        row = _run(app, row.id, fake)
        assert row.status == "complete"
        assert row.study_mode == "document_study"
    assert fake.search_calls == []


def test_full_research_actually_searches(client, user, app, monkeypatch):
    """Full research with a web-capable provider performs the search."""
    response = _create_session(client, query="Newton laws", live_research=True)
    assert response.status_code == 202
    fake = FakeProvider(capabilities=WEB_CAPS, search_hits=[SearchHit("NASA", "https://example.com/a", "snippet")])
    monkeypatch.setattr(
        "services.research.pipeline.validate_public_url",
        lambda url, resolve=True: SimpleNamespace(url=url),
    )
    monkeypatch.setattr(
        "services.research.pipeline.fetch_text",
        lambda url, **kw: ("Newton laws describe motion and forces.", "html_extracted", url),
    )
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=response.json["research"]["id"]).first()
        row = _run(app, row.id, fake)
        assert row.status == "complete"
        assert ResearchSource.query.filter_by(session_id=row.id).count() == 1
    assert fake.search_calls  # search ran exactly in full_research mode
