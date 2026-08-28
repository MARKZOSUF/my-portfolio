"""Shared fixtures. All AI/provider/network calls are mocked — tests never
consume real provider credits."""
import pytest

from app import create_app
from extensions import db


@pytest.fixture
def app(tmp_path):
    app = create_app("testing", {"UPLOAD_FOLDER": str(tmp_path / "uploads"), "SERVER_NAME": "localhost"})
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def user(client):
    return client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "StrongPass123", "display_name": "Student"},
    )


@pytest.fixture
def other_user(client):
    """A second account sharing the same client (sign-out first)."""
    client.post("/api/auth/logout")
    return client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "password": "StrongPass456", "display_name": "Other"},
    )


def register(client, email="student@example.com", password="StrongPass123", name="Student"):
    return client.post("/api/auth/register", json={"email": email, "password": password, "display_name": name})


def make_user(app, email="student@example.com", password="StrongPass123", name="Student"):
    """Create (or reuse) a user directly. Returns a detached SimpleNamespace."""
    from types import SimpleNamespace

    from models import User

    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user is None:
            user = User(email=email, display_name=name)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
        return SimpleNamespace(id=user.id, public_id=user.public_id, email=user.email)


def make_document(app, user_id, text="Normalization reduces redundancy.", name="notes.txt"):
    """Create a parsed document row directly. Returns a detached SimpleNamespace."""
    import hashlib
    from types import SimpleNamespace

    from models import Document

    with app.app_context():
        digest = hashlib.sha256(text.encode()).hexdigest()
        doc = Document(
            user_id=user_id,
            original_name=name,
            stored_name=f"{user_id}-{digest[:24]}.txt",
            mime_type="text/plain",
            size_bytes=len(text),
            sha256=digest,
            extracted_text=f"[Document page 1]\n{text}",
            page_map_json=[{"page": 1, "characters": len(text)}],
            syllabus_json={"units": [], "detected": False},
        )
        db.session.add(doc)
        db.session.commit()
        return SimpleNamespace(id=doc.id, public_id=doc.public_id)


def make_completed_session(app, user_id, result_overrides=None, study_mode="document_study", document_ids=None):
    """Create a completed research session with a minimal valid result."""
    from models import ResearchSession

    result = {
        "complete_notes_markdown": "# Notes\nNormalization reduces redundancy [D1].",
        "mcqs": [
            {
                "question": "What does normalization reduce?",
                "options": ["Redundancy", "Speed", "Cost", "Size"],
                "answer": "Redundancy",
                "explanation": "See notes.",
            }
        ],
        "flashcards": [{"front": "What is 1NF?", "back": "Atomic values only."}],
        "note_id": None,
        "quiz_id": None,
    }
    result.update(result_overrides or {})
    with app.app_context():
        row = ResearchSession(
            user_id=user_id,
            query="Database normalization",
            status="complete",
            stage="Study pack ready",
            progress=100,
            study_mode=study_mode,
            document_ids_json=list(document_ids or []),
            result_json=result,
        )
        db.session.add(row)
        db.session.commit()
        from types import SimpleNamespace

        return SimpleNamespace(id=row.id, public_id=row.public_id)


class FakeProvider:
    """Scripted provider for pipeline/chat tests. Never performs I/O."""

    provider_name = "fake"

    def __init__(self, capabilities=None, search_hits=None, responses=None, error=None):
        from services.ai.base import AIResponse, ProviderCapabilities

        self.capabilities = capabilities or ProviderCapabilities(generation=True, streaming=False, web_search=False)
        self.search_hits = list(search_hits or [])
        self.responses = list(responses or [])
        self.error = error
        self.generate_calls = []
        self.search_calls = []
        self._AIResponse = AIResponse

    def generate(self, messages, *, max_tokens=None, temperature=0.2):
        self.generate_calls.append(messages)
        if self.error is not None:
            raise self.error
        text = self.responses.pop(0) if self.responses else "{}"
        return self._AIResponse(text=text)

    def search_web(self, query, *, max_results=5):
        self.search_calls.append(query)
        return list(self.search_hits)
