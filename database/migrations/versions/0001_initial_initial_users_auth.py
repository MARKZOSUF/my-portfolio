from alembic import op
from database.migrations.helpers import create,drop
revision='0001_initial';down_revision=None;branch_labels=None;depends_on=None
R=revision
TABLES=[('users', 'CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email varchar(320) NOT NULL UNIQUE,password_hash varchar(255) NOT NULL,display_name varchar(120) NOT NULL,is_active boolean NOT NULL DEFAULT true,is_admin boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())'), ('profiles', "CREATE TABLE IF NOT EXISTS profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,subjects jsonb NOT NULL DEFAULT '[]',learning_goal varchar(255),daily_minutes integer NOT NULL DEFAULT 60,preferences jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())"), ('subjects', 'CREATE TABLE IF NOT EXISTS subjects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name varchar(180) NOT NULL,course varchar(180),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,name))'), ('topics', 'CREATE TABLE IF NOT EXISTS topics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,parent_id uuid REFERENCES topics(id) ON DELETE SET NULL,name varchar(220) NOT NULL,syllabus_position integer,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())')]
def upgrade():
 op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto');op.execute('CREATE EXTENSION IF NOT EXISTS vector')
 for name,ddl in TABLES:create(R,name,ddl)
def downgrade():
 for name,_ in reversed(TABLES):drop(R,name)
