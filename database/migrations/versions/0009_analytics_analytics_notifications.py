from alembic import op
from database.migrations.helpers import create,drop
revision='0009_analytics';down_revision='0008_collaboration';branch_labels=None;depends_on=None
R=revision
TABLES=[('analytics_events', "CREATE TABLE IF NOT EXISTS analytics_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid REFERENCES users(id) ON DELETE SET NULL,name varchar(80) NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),properties jsonb NOT NULL DEFAULT '{}',session_hash varchar(64))"), ('notification_devices', "CREATE TABLE IF NOT EXISTS notification_devices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash varchar(64) NOT NULL UNIQUE,encrypted_token text NOT NULL,platform varchar(16) NOT NULL,enabled boolean NOT NULL DEFAULT true,preferences jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())"), ('notification_events', "CREATE TABLE IF NOT EXISTS notification_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,device_id uuid REFERENCES notification_devices(id) ON DELETE SET NULL,kind varchar(40) NOT NULL,title varchar(180) NOT NULL,body varchar(500) NOT NULL,data jsonb NOT NULL DEFAULT '{}',status varchar(24) NOT NULL DEFAULT 'queued',attempt integer NOT NULL DEFAULT 0,scheduled_at timestamptz NOT NULL DEFAULT now(),delivered_at timestamptz,last_error varchar(255),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())")]
def upgrade():
 op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto');op.execute('CREATE EXTENSION IF NOT EXISTS vector')
 for name,ddl in TABLES:create(R,name,ddl)
def downgrade():
 for name,_ in reversed(TABLES):drop(R,name)
