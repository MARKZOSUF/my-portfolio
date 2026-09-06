from alembic import op
from database.migrations.helpers import create,drop
revision='0008_collaboration';down_revision='0007_jobs';branch_labels=None;depends_on=None
R=revision
TABLES=[('collaboration_permissions', 'CREATE TABLE IF NOT EXISTS collaboration_permissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,grantee_id uuid REFERENCES users(id) ON DELETE CASCADE,role varchar(16) NOT NULL,share_token_hash varchar(64) UNIQUE,expires_at timestamptz,revoked_at timestamptz,consumed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())'), ('comments', 'CREATE TABLE IF NOT EXISTS comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,body text NOT NULL,anchor jsonb,is_deleted boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())')]
def upgrade():
 op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto');op.execute('CREATE EXTENSION IF NOT EXISTS vector')
 for name,ddl in TABLES:create(R,name,ddl)
def downgrade():
 for name,_ in reversed(TABLES):drop(R,name)
