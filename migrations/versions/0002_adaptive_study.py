"""Adaptive study schema additions.

Revision ID: 0002_adaptive_study
Revises: 0001_initial

- flashcard.is_current: archive (not delete) superseded cards on regenerate
  so study progress is preserved.
- research_fact.supporting_document_ids / contradicting_document_ids:
  document references (D1, D1:p3) for the dual citation model.
- quiz_attempt: immutable record of each submitted quiz attempt.

JSON server defaults are dialect-aware (PostgreSQL needs an explicit cast).
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_adaptive_study"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _json_list_default():
    if op.get_bind().dialect.name == "postgresql":
        return sa.text("'[]'::json")
    return sa.text("'[]'")


def upgrade():
    op.add_column(
        "flashcard",
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "research_fact",
        sa.Column("supporting_document_ids", sa.JSON(), nullable=False, server_default=_json_list_default()),
    )
    op.add_column(
        "research_fact",
        sa.Column("contradicting_document_ids", sa.JSON(), nullable=False, server_default=_json_list_default()),
    )
    op.create_table(
        "quiz_attempt",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("next_difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("answers_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quiz.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_quiz_attempt_quiz_id", "quiz_attempt", ["quiz_id"])
    op.create_index("ix_quiz_attempt_user_id", "quiz_attempt", ["user_id"])


def downgrade():
    op.drop_index("ix_quiz_attempt_user_id", table_name="quiz_attempt")
    op.drop_index("ix_quiz_attempt_quiz_id", table_name="quiz_attempt")
    op.drop_table("quiz_attempt")
    op.drop_column("research_fact", "contradicting_document_ids")
    op.drop_column("research_fact", "supporting_document_ids")
    op.drop_column("flashcard", "is_current")
