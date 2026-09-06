from alembic import op
from database.migrations.helpers import create,drop
revision='0007_jobs';down_revision='0006_security';branch_labels=None;depends_on=None
R=revision
TABLES=[('background_tasks', "CREATE TABLE IF NOT EXISTS background_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind varchar(40) NOT NULL,status varchar(32) NOT NULL DEFAULT 'queued',progress double precision NOT NULL DEFAULT 0,result jsonb,error_code varchar(80),celery_id varchar(80),attempt integer NOT NULL DEFAULT 0,max_attempts integer NOT NULL DEFAULT 3,last_error text,started_at timestamptz,finished_at timestamptz,retry_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())"), ('task_controls', 'CREATE TABLE IF NOT EXISTS task_controls(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL UNIQUE REFERENCES background_tasks(id) ON DELETE CASCADE,owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,idempotency_key varchar(128) NOT NULL,cancel_requested boolean NOT NULL DEFAULT false,cancel_requested_at timestamptz,attempts integer NOT NULL DEFAULT 0,UNIQUE(owner_id,idempotency_key))'), ('job_events', "CREATE TABLE IF NOT EXISTS job_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES background_tasks(id) ON DELETE CASCADE,sequence bigint NOT NULL DEFAULT nextval('job_event_sequence'),event_type varchar(40) NOT NULL,payload jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(task_id,sequence))")]
def upgrade():
 op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto');op.execute('CREATE EXTENSION IF NOT EXISTS vector');op.execute('CREATE SEQUENCE IF NOT EXISTS job_event_sequence')
 for name,ddl in TABLES:create(R,name,ddl)
def downgrade():
 for name,_ in reversed(TABLES):drop(R,name)
