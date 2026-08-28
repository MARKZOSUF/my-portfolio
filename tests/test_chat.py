"""Contextual chat tests (spec section 5). FakeProvider only."""
from unittest.mock import patch

from extensions import db
from models import ConversationMessage, ResearchSession
from tests.conftest import FakeProvider, make_completed_session, make_document, make_user


def _session(app, user_email="student@example.com"):
    user = make_user(app, email=user_email) if not _exists(app, user_email) else _get(app, user_email)
    doc = make_document(app, user.id, text="Normalization reduces redundancy in schemas.")
    return make_completed_session(app, user.id, document_ids=[doc.id]), doc


def _exists(app, email):
    return _get(app, email) is not None


def _get(app, email):
    from models import User

    with app.app_context():
        user = User.query.filter_by(email=email).first()
        return user


def _chat(client, rid, message, fake):
    with patch("routes.chat.get_ai_provider", return_value=fake):
        return client.post("/api/chat", json={"research_id": rid, "message": message})


def test_cross_user_history_blocked(client, user, other_user, app):
    session_row, _ = _session(app)
    response = client.get(f"/api/chat?research_id={session_row.public_id}")
    assert response.status_code == 404
    fake = FakeProvider(responses=["answer"])
    assert _chat(client, session_row.public_id, "hello", fake).status_code == 404


def test_history_endpoint_returns_messages(client, user, app):
    session_row, _ = _session(app)
    fake = FakeProvider(responses=["First answer"])
    assert _chat(client, session_row.public_id, "First question", fake).status_code == 200
    history = client.get(f"/api/chat?research_id={session_row.public_id}")
    assert history.status_code == 200
    roles = [m["role"] for m in history.json["messages"]]
    assert roles == ["user", "assistant"]
    assert history.json["messages"][1]["content"] == "First answer"


def test_history_included_in_later_turns(client, user, app):
    session_row, _ = _session(app)
    fake = FakeProvider(responses=["Answer one", "Answer two"])
    _chat(client, session_row.public_id, "Unique question alpha", fake)
    _chat(client, session_row.public_id, "Second question", fake)
    second_call = fake.generate_calls[1]
    user_prompt = second_call[1]["content"]
    assert "<CONVERSATION_HISTORY" in user_prompt
    assert "Unique question alpha" in user_prompt
    assert "Answer one" in user_prompt
    assert "<CURRENT_QUESTION>" in user_prompt and "Second question" in user_prompt
    assert "<UNTRUSTED_EVIDENCE>" in user_prompt
    assert "untrusted" in second_call[0]["content"]  # system rules delimit trust


def test_history_is_bounded(client, user, app):
    app.config.update(CHAT_HISTORY_LIMIT=4)
    session_row, _ = _session(app)
    with app.app_context():
        row = ResearchSession.query.filter_by(public_id=session_row.public_id).first()
        for i in range(10):
            db.session.add(
                ConversationMessage(session_id=row.id, user_id=row.user_id, role="user", content=f"message-{i}")
            )
        db.session.commit()
    fake = FakeProvider(responses=["ok"])
    _chat(client, session_row.public_id, "current", fake)
    prompt = fake.generate_calls[0][1]["content"]
    assert "message-9" in prompt and "message-6" in prompt
    assert "message-5" not in prompt  # older turns are bounded away
    history = client.get(f"/api/chat?research_id={session_row.public_id}").json["messages"]
    assert len(history) <= 4


def test_incomplete_research_rejected(client, user, app):
    with app.app_context():
        from models import User

        owner = User.query.filter_by(email="student@example.com").first()
        row = ResearchSession(user_id=owner.id, query="pending", status="running")
        db.session.add(row)
        db.session.commit()
        pid = row.public_id
    fake = FakeProvider(responses=["unused"])
    assert _chat(client, pid, "question", fake).status_code == 409
    assert not fake.generate_calls


def test_empty_evidence_handled_honestly(client, user, app):
    with app.app_context():
        from models import User

        owner = User.query.filter_by(email="student@example.com").first()
        session_row = make_completed_session(app, owner.id, document_ids=[])
    session_row.result_json["complete_notes_markdown"] = ""
    fake = FakeProvider(responses=["I do not have evidence for that."])
    response = _chat(client, session_row.public_id, "What does the evidence say?", fake)
    assert response.status_code == 200
    prompt = fake.generate_calls[0][1]["content"]
    assert "no usable evidence" in prompt  # prompt is honest about the gap
