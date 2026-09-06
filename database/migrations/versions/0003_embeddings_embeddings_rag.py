from alembic import op
from database.migrations.helpers import create,drop
revision='0003_embeddings';down_revision='0002_ultra';branch_labels=None;depends_on=None
R=revision
TABLES=[('embeddings', "CREATE TABLE IF NOT EXISTS embeddings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,chunk_index integer NOT NULL,content text NOT NULL,token_count integer NOT NULL,metadata jsonb NOT NULL DEFAULT '{}',provider varchar(50) NOT NULL DEFAULT 'unknown',model varchar(120) NOT NULL DEFAULT 'unknown',dimension integer NOT NULL DEFAULT 1536,version varchar(40) NOT NULL DEFAULT '1',embedding vector(1536) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(source_id,chunk_index,version))"), ('knowledge_edges', "CREATE TABLE IF NOT EXISTS knowledge_edges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,from_type varchar(40) NOT NULL,from_id varchar(100) NOT NULL,relation varchar(40) NOT NULL,to_type varchar(40) NOT NULL,to_id varchar(100) NOT NULL,weight double precision NOT NULL DEFAULT 1,provenance jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,from_type,from_id,relation,to_type,to_id))")]
def upgrade():
 op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto');op.execute('CREATE EXTENSION IF NOT EXISTS vector')
 for name,ddl in TABLES:create(R,name,ddl)
def downgrade():
 for name,_ in reversed(TABLES):drop(R,name)
