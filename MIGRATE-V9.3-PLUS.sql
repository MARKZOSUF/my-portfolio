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
