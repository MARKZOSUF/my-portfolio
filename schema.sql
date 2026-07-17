PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,display_name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',plan TEXT NOT NULL DEFAULT 'free',email_verified INTEGER NOT NULL DEFAULT 0,blocked INTEGER NOT NULL DEFAULT 0,token_limit INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,title TEXT NOT NULL,folder TEXT NOT NULL DEFAULT 'General',pinned INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,data_json TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,storage_key TEXT NOT NULL UNIQUE,mime TEXT,size INTEGER NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS shares(id TEXT PRIMARY KEY,user_id TEXT,chat_json TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY,user_id TEXT,ip TEXT,feature TEXT NOT NULL,model TEXT,input_chars INTEGER NOT NULL DEFAULT 0,output_chars INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage(created_at);CREATE INDEX IF NOT EXISTS idx_usage_feature ON usage(feature);
CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,user_id TEXT,rating INTEGER NOT NULL DEFAULT 0,message TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,icon TEXT NOT NULL DEFAULT '🚀',instructions TEXT NOT NULL DEFAULT '',memory TEXT NOT NULL DEFAULT '',chat_ids_json TEXT NOT NULL DEFAULT '[]',file_ids_json TEXT NOT NULL DEFAULT '[]',archived INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,schedule TEXT NOT NULL,next_run INTEGER NOT NULL,prompt TEXT NOT NULL,delivery TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,last_run INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(enabled,next_run);
CREATE TABLE IF NOT EXISTS task_runs(id TEXT PRIMARY KEY,task_id TEXT NOT NULL,user_id TEXT,result TEXT,status TEXT,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS password_reset_tokens(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS email_verification_tokens(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_events(id TEXT PRIMARY KEY,user_id TEXT,ip TEXT,country TEXT,device TEXT,success INTEGER NOT NULL,reason TEXT,suspicious INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS abuse_reports(id TEXT PRIMARY KEY,user_id TEXT,chat_id TEXT,reason TEXT NOT NULL,content TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at INTEGER NOT NULL,resolved_at INTEGER);
CREATE TABLE IF NOT EXISTS moderation_queue(id TEXT PRIMARY KEY,user_id TEXT,content TEXT,verdict TEXT,status TEXT NOT NULL DEFAULT 'open',created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS error_logs(id TEXT PRIMARY KEY,user_id TEXT,route TEXT,message TEXT,stack TEXT,ip TEXT,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS admin_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL);


-- MARKZOSUF AI NEXUS V9.3 PLUS
-- Features 4–15: organizations, collaboration, community chat,
-- developer API keys, fine-tuning jobs, encrypted vaults, backups,
-- monetization events and UPI payment records.

CREATE TABLE IF NOT EXISTS organizations(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_members(
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY(org_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id,status);

CREATE TABLE IF NOT EXISTS team_invites(
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_invites_org ON team_invites(org_id,created_at DESC);

CREATE TABLE IF NOT EXISTS collab_rooms(
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_id TEXT,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collab_rooms_org ON collab_rooms(org_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS collab_events(
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collab_events_room ON collab_events(room_id,created_at);

CREATE TABLE IF NOT EXISTS team_channels(
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_channels_org ON team_channels(org_id,created_at);

CREATE TABLE IF NOT EXISTS channel_messages(
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  ciphertext_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id,created_at);

CREATE TABLE IF NOT EXISTS developer_api_keys(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT 'chat',
  quota_daily INTEGER NOT NULL DEFAULT 100,
  day_key TEXT NOT NULL DEFAULT '',
  day_count INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  revoked INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_user ON developer_api_keys(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS fine_tune_jobs(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  base_model TEXT NOT NULL,
  dataset_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'dataset-ready',
  external_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fine_tune_jobs_user ON fine_tune_jobs(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS encrypted_vaults(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ciphertext_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_encrypted_vaults_user ON encrypted_vaults(user_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS cloud_backups(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'manual',
  label TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cloud_backups_user ON cloud_backups(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS monetization_events(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  campaign TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_monetization_events_created ON monetization_events(created_at DESC);

CREATE TABLE IF NOT EXISTS upi_payment_records(
  id TEXT PRIMARY KEY,
  user_id TEXT,
  txn_ref TEXT NOT NULL,
  payer_note TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'initiated',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upi_payment_records_user ON upi_payment_records(user_id,created_at DESC);
