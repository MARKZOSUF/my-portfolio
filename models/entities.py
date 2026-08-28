"""Database models for StudyResearch AI.

Ownership rules:
- Users own documents and research sessions directly (``user_id``).
- Notes, quizzes, flashcards, facts, sources, and chat messages belong to a
  research session and are owned transitively through ``ResearchSession.user_id``.
- Deleting a session cascades to all of its artifacts; deleting a user
  cascades to their sessions and documents.

Versioning:
- Notes and quizzes keep prior versions (``version`` + uniqueness per session).
- Quiz submissions are preserved as immutable ``QuizAttempt`` rows.
- Flashcards are never deleted on regeneration; outdated cards are archived
  with ``is_current = False`` so study progress is preserved.
"""
from datetime import datetime, timezone
from uuid import uuid4

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


def now():
    return datetime.now(timezone.utc)


def uid():
    return str(uuid4())


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class User(db.Model, TimestampMixin):
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, nullable=False)
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    display_name = db.Column(db.String(80), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    session_version = db.Column(db.Integer, default=1, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method="scrypt")

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class ResearchSession(db.Model, TimestampMixin):
    __table_args__ = (db.Index("ix_research_user_created", "user_id", "created_at"),)

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, index=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="SET NULL"), nullable=True)
    query = db.Column(db.Text, nullable=False)
    mode = db.Column(db.String(16), default="standard", nullable=False)
    study_mode = db.Column(db.String(32), default="full_research", nullable=False)
    language = db.Column(db.String(16), default="English", nullable=False)
    level = db.Column(db.String(80))
    status = db.Column(db.String(24), default="queued", nullable=False, index=True)
    stage = db.Column(db.String(80), default="Queued", nullable=False)
    progress = db.Column(db.Integer, default=0, nullable=False)
    intent_json = db.Column(db.JSON, default=dict, nullable=False)
    plan_json = db.Column(db.JSON, default=dict, nullable=False)
    document_ids_json = db.Column(db.JSON, default=list, nullable=False)
    result_json = db.Column(db.JSON, default=dict, nullable=False)
    job_id = db.Column(db.String(64), unique=True, nullable=True)
    error_code = db.Column(db.String(80))
    error_message = db.Column(db.String(500))

    parent = db.relationship("ResearchSession", remote_side=[id], backref="followups")
    user = db.relationship("User", backref=db.backref("research_sessions", lazy=True, cascade="all, delete-orphan"))


class ResearchSource(db.Model, TimestampMixin):
    __table_args__ = (db.UniqueConstraint("session_id", "url_hash", name="uq_source_session_url"),)

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="CASCADE"), nullable=False, index=True)
    citation_index = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(500), nullable=False)
    url = db.Column(db.Text, nullable=False)
    url_hash = db.Column(db.String(64), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    source_type = db.Column(db.String(80), default="web", nullable=False)
    publication_date = db.Column(db.String(80))
    author = db.Column(db.String(255))
    publisher = db.Column(db.String(255))
    relevance_score = db.Column(db.Float, default=0, nullable=False)
    reliability_score = db.Column(db.Float, default=0, nullable=False)
    quality_signals_json = db.Column(db.JSON, default=dict, nullable=False)
    extraction_status = db.Column(db.String(40), default="snippet_only", nullable=False)
    extracted_text = db.Column(db.Text)
    provider_snippet = db.Column(db.Text)

    session = db.relationship(
        "ResearchSession",
        backref=db.backref("sources", lazy=True, cascade="all, delete-orphan", order_by="ResearchSource.citation_index"),
    )


class ResearchFact(db.Model, TimestampMixin):
    """An atomic claim with honest support labels.

    ``verification_status`` is one of: supported, partially_supported,
    needs_verification, contradicted. Web references store ResearchSource
    public ids; document references store stable labels like ``D1`` or
    ``D1:p3``.
    """

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="CASCADE"), nullable=False, index=True)
    claim = db.Column(db.Text, nullable=False)
    verification_status = db.Column(db.String(32), default="needs_verification", nullable=False)
    confidence = db.Column(db.Float, default=0, nullable=False)
    supporting_source_ids = db.Column(db.JSON, default=list, nullable=False)
    contradicting_source_ids = db.Column(db.JSON, default=list, nullable=False)
    supporting_document_ids = db.Column(db.JSON, default=list, nullable=False)
    contradicting_document_ids = db.Column(db.JSON, default=list, nullable=False)
    evidence_excerpts = db.Column(db.JSON, default=list, nullable=False)
    verification_notes = db.Column(db.Text)


class Note(db.Model, TimestampMixin):
    __table_args__ = (db.UniqueConstraint("session_id", "version", name="uq_note_session_version"),)

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(16), default="English", nullable=False)
    version = db.Column(db.Integer, default=1, nullable=False)
    is_current = db.Column(db.Boolean, default=True, nullable=False)


class Quiz(db.Model, TimestampMixin):
    __table_args__ = (db.UniqueConstraint("session_id", "version", name="uq_quiz_session_version"),)

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    difficulty = db.Column(db.String(20), default="medium", nullable=False)
    version = db.Column(db.Integer, default=1, nullable=False)
    score = db.Column(db.Float)


class QuizQuestion(db.Model, TimestampMixin):
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quiz.id", ondelete="CASCADE"), nullable=False, index=True)
    question_type = db.Column(db.String(32), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, default=list, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text)
    difficulty = db.Column(db.String(20), default="medium", nullable=False)

    quiz = db.relationship("Quiz", backref=db.backref("questions", lazy=True, cascade="all, delete-orphan"))


class QuizAttempt(db.Model, TimestampMixin):
    """Immutable record of one submitted quiz attempt (never updated/deleted)."""

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("quiz.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    score = db.Column(db.Float, nullable=False)
    next_difficulty = db.Column(db.String(20), nullable=False, default="medium")
    answers_json = db.Column(db.JSON, default=dict, nullable=False)

    quiz = db.relationship(
        "Quiz",
        backref=db.backref("attempts", lazy=True, cascade="all, delete-orphan", order_by="QuizAttempt.created_at"),
    )


class Flashcard(db.Model, TimestampMixin):
    __table_args__ = (db.UniqueConstraint("session_id", "content_hash", name="uq_flashcard_session_content"),)

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="CASCADE"), nullable=False, index=True)
    front = db.Column(db.Text, nullable=False)
    back = db.Column(db.Text, nullable=False)
    content_hash = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(20), default="new", nullable=False)
    version = db.Column(db.Integer, default=1, nullable=False)
    is_current = db.Column(db.Boolean, default=True, nullable=False)


class Document(db.Model, TimestampMixin):
    __table_args__ = (db.UniqueConstraint("user_id", "sha256", name="uq_document_user_hash"),)

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), unique=True, default=uid, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    original_name = db.Column(db.String(255), nullable=False)
    stored_name = db.Column(db.String(255), unique=True, nullable=False)
    mime_type = db.Column(db.String(120), nullable=False)
    size_bytes = db.Column(db.Integer, nullable=False)
    sha256 = db.Column(db.String(64), nullable=False, index=True)
    extraction_status = db.Column(db.String(40), default="complete", nullable=False)
    extracted_text = db.Column(db.Text, nullable=False)
    page_map_json = db.Column(db.JSON, default=list, nullable=False)
    syllabus_json = db.Column(db.JSON, default=dict, nullable=False)


class ConversationMessage(db.Model, TimestampMixin):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("research_session.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    role = db.Column(db.String(16), nullable=False)
    content = db.Column(db.Text, nullable=False)


class UsageRecord(db.Model, TimestampMixin):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False, index=True)
    success = db.Column(db.Boolean, default=True, nullable=False)
    input_units = db.Column(db.Integer, default=0, nullable=False)
    output_units = db.Column(db.Integer, default=0, nullable=False)
    metadata_json = db.Column(db.JSON, default=dict, nullable=False)


class DailyUsage(db.Model):
    __table_args__ = (db.UniqueConstraint("user_id", "day", "action", name="uq_daily_usage"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    day = db.Column(db.Date, nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    count = db.Column(db.Integer, default=0, nullable=False)
