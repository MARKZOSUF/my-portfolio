from alembic import op
from database.migrations.helpers import create,drop
revision='0011_study_artifacts';down_revision='0010_ai_usage';branch_labels=None;depends_on=None
R=revision
TABLES=[('study_artifacts', "CREATE TABLE IF NOT EXISTS study_artifacts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind varchar(40) NOT NULL,topic varchar(220) NOT NULL,title varchar(255) NOT NULL,content jsonb NOT NULL DEFAULT '{}',evidence jsonb NOT NULL DEFAULT '[]',confidence double precision,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())")]
INDEXES=['CREATE INDEX IF NOT EXISTS ix_study_artifacts_owner_id ON study_artifacts(owner_id)','CREATE INDEX IF NOT EXISTS ix_study_artifacts_kind ON study_artifacts(kind)','CREATE INDEX IF NOT EXISTS ix_study_artifacts_topic ON study_artifacts(topic)','CREATE INDEX IF NOT EXISTS ix_study_artifacts_owner_kind_created ON study_artifacts(owner_id,kind,created_at DESC)']
def upgrade():
 op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto');op.execute('CREATE EXTENSION IF NOT EXISTS vector')
 for name,ddl in TABLES:create(R,name,ddl)
 for sql in INDEXES:op.execute(sql)
def downgrade():
 for name,_ in reversed(TABLES):drop(R,name)
