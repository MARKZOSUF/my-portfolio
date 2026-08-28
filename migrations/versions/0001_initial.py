"""Initial StudyResearch AI schema (explicit).

Revision ID: 0001_initial
Revises: (none)

This revision defines every table, column, key, constraint, and index
explicitly. It never calls ``db.metadata.create_all()``/``drop_all()`` so
the schema is reviewable and identical across SQLite and PostgreSQL.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("session_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("public_id", name="uq_user_public_id"),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    op.create_index("ix_user_email", "user", ["email"])

    op.create_table(
        "research_session",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("parent_session_id", sa.Integer(), nullable=True),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("mode", sa.String(16), nullable=False, server_default="standard"),
        sa.Column("study_mode", sa.String(32), nullable=False, server_default="full_research"),
        sa.Column("language", sa.String(16), nullable=False, server_default="English"),
        sa.Column("level", sa.String(80), nullable=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="queued"),
        sa.Column("stage", sa.String(80), nullable=False, server_default="Queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("intent_json", sa.JSON(), nullable=False),
        sa.Column("plan_json", sa.JSON(), nullable=False),
        sa.Column("document_ids_json", sa.JSON(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("job_id", sa.String(64), nullable=True),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("error_message", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_session_id"], ["research_session.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("public_id", name="uq_research_session_public_id"),
        sa.UniqueConstraint("job_id", name="uq_research_session_job_id"),
    )
    op.create_index("ix_research_session_public_id", "research_session", ["public_id"])
    op.create_index("ix_research_session_user_id", "research_session", ["user_id"])
    op.create_index("ix_research_session_status", "research_session", ["status"])
    op.create_index("ix_research_user_created", "research_session", ["user_id", "created_at"])

    op.create_table(
        "research_source",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("citation_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("url_hash", sa.String(64), nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("source_type", sa.String(80), nullable=False, server_default="web"),
        sa.Column("publication_date", sa.String(80), nullable=True),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("publisher", sa.String(255), nullable=True),
        sa.Column("relevance_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reliability_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("quality_signals_json", sa.JSON(), nullable=False),
        sa.Column("extraction_status", sa.String(40), nullable=False, server_default="snippet_only"),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("provider_snippet", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_session.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("public_id", name="uq_research_source_public_id"),
        sa.UniqueConstraint("session_id", "url_hash", name="uq_source_session_url"),
    )
    op.create_index("ix_research_source_session_id", "research_source", ["session_id"])

    op.create_table(
        "research_fact",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("claim", sa.Text(), nullable=False),
        sa.Column("verification_status", sa.String(32), nullable=False, server_default="needs_verification"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("supporting_source_ids", sa.JSON(), nullable=False),
        sa.Column("contradicting_source_ids", sa.JSON(), nullable=False),
        sa.Column("evidence_excerpts", sa.JSON(), nullable=False),
        sa.Column("verification_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_session.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_research_fact_session_id", "research_fact", ["session_id"])

    op.create_table(
        "note",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.String(16), nullable=False, server_default="English"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_session.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("public_id", name="uq_note_public_id"),
        sa.UniqueConstraint("session_id", "version", name="uq_note_session_version"),
    )
    op.create_index("ix_note_session_id", "note", ["session_id"])

    op.create_table(
        "quiz",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_session.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("public_id", name="uq_quiz_public_id"),
        sa.UniqueConstraint("session_id", "version", name="uq_quiz_session_version"),
    )
    op.create_index("ix_quiz_session_id", "quiz", ["session_id"])

    op.create_table(
        "quiz_question",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("question_type", sa.String(32), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quiz.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_quiz_question_quiz_id", "quiz_question", ["quiz_id"])

    op.create_table(
        "flashcard",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("front", sa.Text(), nullable=False),
        sa.Column("back", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_session.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("public_id", name="uq_flashcard_public_id"),
        sa.UniqueConstraint("session_id", "content_hash", name="uq_flashcard_session_content"),
    )
    op.create_index("ix_flashcard_session_id", "flashcard", ["session_id"])

    op.create_table(
        "document",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("stored_name", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("extraction_status", sa.String(40), nullable=False, server_default="complete"),
        sa.Column("extracted_text", sa.Text(), nullable=False),
        sa.Column("page_map_json", sa.JSON(), nullable=False),
        sa.Column("syllabus_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("public_id", name="uq_document_public_id"),
        sa.UniqueConstraint("stored_name", name="uq_document_stored_name"),
        sa.UniqueConstraint("user_id", "sha256", name="uq_document_user_hash"),
    )
    op.create_index("ix_document_user_id", "document", ["user_id"])
    op.create_index("ix_document_sha256", "document", ["sha256"])

    op.create_table(
        "conversation_message",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_session.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_conversation_message_session_id", "conversation_message", ["session_id"])

    op.create_table(
        "usage_record",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("input_units", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_units", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_usage_record_user_id", "usage_record", ["user_id"])
    op.create_index("ix_usage_record_action", "usage_record", ["action"])

    op.create_table(
        "daily_usage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "day", "action", name="uq_daily_usage"),
    )
    op.create_index("ix_daily_usage_user_id", "daily_usage", ["user_id"])
    op.create_index("ix_daily_usage_day", "daily_usage", ["day"])


def downgrade():
    op.drop_index("ix_daily_usage_day", table_name="daily_usage")
    op.drop_index("ix_daily_usage_user_id", table_name="daily_usage")
    op.drop_table("daily_usage")
    op.drop_index("ix_usage_record_action", table_name="usage_record")
    op.drop_index("ix_usage_record_user_id", table_name="usage_record")
    op.drop_table("usage_record")
    op.drop_index("ix_conversation_message_session_id", table_name="conversation_message")
    op.drop_table("conversation_message")
    op.drop_index("ix_document_sha256", table_name="document")
    op.drop_index("ix_document_user_id", table_name="document")
    op.drop_table("document")
    op.drop_index("ix_flashcard_session_id", table_name="flashcard")
    op.drop_table("flashcard")
    op.drop_index("ix_quiz_question_quiz_id", table_name="quiz_question")
    op.drop_table("quiz_question")
    op.drop_index("ix_quiz_session_id", table_name="quiz")
    op.drop_table("quiz")
    op.drop_index("ix_note_session_id", table_name="note")
    op.drop_table("note")
    op.drop_index("ix_research_fact_session_id", table_name="research_fact")
    op.drop_table("research_fact")
    op.drop_index("ix_research_source_session_id", table_name="research_source")
    op.drop_table("research_source")
    op.drop_index("ix_research_user_created", table_name="research_session")
    op.drop_index("ix_research_session_status", table_name="research_session")
    op.drop_index("ix_research_session_user_id", table_name="research_session")
    op.drop_index("ix_research_session_public_id", table_name="research_session")
    op.drop_table("research_session")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_table("user")
