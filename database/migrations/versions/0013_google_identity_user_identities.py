"""Federated identities: link Google (and later Apple) accounts to users.

Adds ``user_identities``. One row per (provider, external subject). The unique
constraint on ``(provider, subject)`` is what makes account takeover by a
replayed or forged subject impossible, and ``(user_id, provider)`` keeps a
single StudyForge account from accumulating duplicate Google links.

This revision is additive: no existing table is altered and no data is moved,
so it is safe to apply to a populated production database.
"""
from database.migrations.helpers import create, drop

revision = '0013_google_identity'
down_revision = '0012_free_product'
branch_labels = None
depends_on = None
R = revision

USER_IDENTITIES = (
    'user_identities',
    "CREATE TABLE IF NOT EXISTS user_identities("
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
    "user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
    "provider varchar(32) NOT NULL,"
    "subject varchar(255) NOT NULL,"
    "email varchar(320),"
    "email_verified boolean NOT NULL DEFAULT false,"
    "last_login_at timestamptz,"
    "created_at timestamptz NOT NULL DEFAULT now(),"
    "updated_at timestamptz NOT NULL DEFAULT now(),"
    "CONSTRAINT uq_user_identity_provider_subject UNIQUE(provider,subject),"
    "CONSTRAINT uq_user_identity_user_provider UNIQUE(user_id,provider))",
)

INDEXES = (
    "CREATE INDEX IF NOT EXISTS ix_user_identities_user_id ON user_identities(user_id)",
    "CREATE INDEX IF NOT EXISTS ix_user_identities_provider ON user_identities(provider)",
    "CREATE INDEX IF NOT EXISTS ix_user_identities_subject ON user_identities(subject)",
)


def upgrade():
    name, ddl = USER_IDENTITIES
    create(R, name, ddl)
    for sql in INDEXES:
        op_execute(sql)


def downgrade():
    drop(R, USER_IDENTITIES[0])


def op_execute(sql):
    from alembic import op

    op.execute(sql)
