"""Free product: drop billing tables, add durable generated-PDF metadata.

The application has no subscriptions, plans, entitlements or paid upgrades, so
the payment-only tables introduced by 0010 are removed.  ``ai_usage`` is kept:
it is neutral usage accounting used for fair-use protection, not billing.

The drops are child-first and guarded by an inspector so the migration is safe
on databases where the tables were never created.
"""
from alembic import op
from sqlalchemy import inspect

from database.migrations.helpers import create, drop

revision = '0012_free_product'
down_revision = '0011_study_artifacts'
branch_labels = None
depends_on = None
R = revision

# child-first: entitlements and subscriptions reference users; plan_definitions last
BILLING_TABLES = ['entitlements', 'subscriptions', 'plan_definitions']

GENERATED_PDFS = (
    'generated_pdfs',
    "CREATE TABLE IF NOT EXISTS generated_pdfs("
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
    "owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,"
    "note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,"
    "storage_key varchar(400) NOT NULL,"
    "filename varchar(255) NOT NULL,"
    "checksum varchar(64) NOT NULL,"
    "byte_size integer NOT NULL DEFAULT 0,"
    "renderer_version varchar(60) NOT NULL,"
    "status varchar(24) NOT NULL DEFAULT 'ready',"
    "error varchar(500),"
    "created_at timestamptz NOT NULL DEFAULT now(),"
    "updated_at timestamptz NOT NULL DEFAULT now())"
)

INDEXES = [
    'CREATE INDEX IF NOT EXISTS ix_generated_pdfs_owner_id ON generated_pdfs(owner_id)',
    'CREATE INDEX IF NOT EXISTS ix_generated_pdfs_note_id ON generated_pdfs(note_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_generated_pdfs_storage_key ON generated_pdfs(storage_key)',
]


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    inspector = inspect(op.get_bind())
    for table in BILLING_TABLES:
        if inspector.has_table(table):
            op.execute('DROP TABLE ' + table + ' CASCADE')
    name, ddl = GENERATED_PDFS
    create(R, name, ddl)
    for sql in INDEXES:
        op.execute(sql)


def downgrade():
    """Recreate the payment-only tables empty; no data is restored."""
    drop(R, GENERATED_PDFS[0])
    op.execute(
        "CREATE TABLE IF NOT EXISTS plan_definitions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
        "code varchar(32) NOT NULL UNIQUE,name varchar(80) NOT NULL,limits jsonb NOT NULL DEFAULT '{}',"
        "active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now(),"
        "updated_at timestamptz NOT NULL DEFAULT now())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
        "owner_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,plan_code varchar(32) NOT NULL,"
        "provider varchar(32) NOT NULL,status varchar(24) NOT NULL,provider_subscription_id varchar(120) UNIQUE,"
        "created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())"
    )
    op.execute(
        "CREATE TABLE IF NOT EXISTS entitlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
        "owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,key varchar(80) NOT NULL,"
        "value jsonb NOT NULL,source varchar(40) NOT NULL,expires_at timestamptz,"
        "created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),"
        "UNIQUE(owner_id,key))"
    )
