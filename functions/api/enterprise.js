import { json, requireUser, sha256, randomHex } from "../_shared/auth.js";

const ROLES = new Set(["owner", "admin", "editor", "viewer"]);
const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,owner_id TEXT NOT NULL,created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS organization_members(org_id TEXT NOT NULL,user_id TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'viewer',status TEXT NOT NULL DEFAULT 'active',joined_at INTEGER NOT NULL,PRIMARY KEY(org_id,user_id))`,
  `CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id,status)`,
  `CREATE TABLE IF NOT EXISTS team_invites(id TEXT PRIMARY KEY,org_id TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'viewer',token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,accepted_at INTEGER,created_by TEXT NOT NULL,created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS collab_rooms(id TEXT PRIMARY KEY,org_id TEXT NOT NULL,project_id TEXT,name TEXT NOT NULL,created_by TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS collab_events(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,user_id TEXT NOT NULL,event_type TEXT NOT NULL,payload_json TEXT NOT NULL,created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_collab_events_room ON collab_events(room_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS team_channels(id TEXT PRIMARY KEY,org_id TEXT NOT NULL,name TEXT NOT NULL,created_by TEXT NOT NULL,created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS channel_messages(id TEXT PRIMARY KEY,channel_id TEXT NOT NULL,user_id TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',ciphertext_json TEXT,created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS developer_api_keys(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,key_prefix TEXT NOT NULL,key_hash TEXT NOT NULL UNIQUE,scopes TEXT NOT NULL DEFAULT 'chat',quota_daily INTEGER NOT NULL DEFAULT 100,day_key TEXT NOT NULL DEFAULT '',day_count INTEGER NOT NULL DEFAULT 0,usage_count INTEGER NOT NULL DEFAULT 0,revoked INTEGER NOT NULL DEFAULT 0,last_used_at INTEGER,created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS fine_tune_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,provider TEXT NOT NULL,base_model TEXT NOT NULL,dataset_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'dataset-ready',external_id TEXT,error TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS encrypted_vaults(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,ciphertext_json TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS cloud_backups(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'manual',label TEXT NOT NULL,data_json TEXT NOT NULL,created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS monetization_events(id TEXT PRIMARY KEY,user_id TEXT,event_type TEXT NOT NULL,campaign TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS upi_payment_records(id TEXT PRIMARY KEY,user_id TEXT,txn_ref TEXT NOT NULL,payer_note TEXT,amount_paise INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'initiated',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)`
];

export async function onRequestGet(context) {
  return handle(context, "GET");
}

export async function onRequestPost(context) {
  return handle(context, "POST");
}

async function handle({ request, env }, method) {
  try {
    if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
    await ensureSchema(env);
    const user = await requireUser(request, env);
    const url = new URL(request.url);
    const action = method === "GET"
      ? String(url.searchParams.get("action") || "bootstrap")
      : String((await request.clone().json().catch(() => ({}))).action || "");
    const body = method === "POST" ? await request.json().catch(() => ({})) : {};

    if (method === "GET" && action === "bootstrap") return bootstrap(env, user);
    if (method === "GET" && action === "room_events") {
      const roomId = url.searchParams.get("roomId") || "";
      const since = Number(url.searchParams.get("since") || 0);
      await authorizeRoom(env, user.id, roomId, "viewer");
      const result = await env.DB.prepare(
        `SELECT e.id,e.room_id AS roomId,e.user_id AS userId,e.event_type AS eventType,
                e.payload_json AS payloadJson,e.created_at AS createdAt,
                COALESCE(u.display_name,u.email,e.user_id) AS displayName
         FROM collab_events e
         LEFT JOIN users u ON u.id=e.user_id
         WHERE e.room_id=? AND e.created_at>? ORDER BY e.created_at ASC LIMIT 250`
      ).bind(roomId, since).all();
      return json({ events: parseRows(result.results, ["payloadJson"]) });
    }
    if (method === "GET" && action === "channel_messages") {
      const channelId = url.searchParams.get("channelId") || "";
      const since = Number(url.searchParams.get("since") || 0);
      await authorizeChannel(env, user.id, channelId, "viewer");
      const result = await env.DB.prepare(
        `SELECT m.id,m.channel_id AS channelId,m.user_id AS userId,m.body,
                m.ciphertext_json AS ciphertextJson,m.created_at AS createdAt,
                COALESCE(u.display_name,u.email,m.user_id) AS displayName
         FROM channel_messages m
         LEFT JOIN users u ON u.id=m.user_id
         WHERE m.channel_id=? AND m.created_at>? ORDER BY m.created_at ASC LIMIT 250`
      ).bind(channelId, since).all();
      return json({ messages: parseRows(result.results, ["ciphertextJson"]) });
    }
    if (method === "GET" && action === "backup_get") {
      const id = url.searchParams.get("id") || "";
      const row = await env.DB.prepare(
        `SELECT id,kind,label,data_json AS dataJson,created_at AS createdAt
         FROM cloud_backups WHERE id=? AND user_id=?`
      ).bind(id, user.id).first();
      if (!row) return json({ error: "Backup not found." }, 404);
      row.data = safeJson(row.dataJson, {});
      delete row.dataJson;
      return json({ backup: row });
    }
    if (method === "GET" && action === "vault_get") {
      const id = url.searchParams.get("id") || "";
      const row = await env.DB.prepare(
        `SELECT id,name,ciphertext_json AS ciphertextJson,created_at AS createdAt,updated_at AS updatedAt
         FROM encrypted_vaults WHERE id=? AND user_id=?`
      ).bind(id, user.id).first();
      if (!row) return json({ error: "Encrypted vault not found." }, 404);
      row.ciphertext = safeJson(row.ciphertextJson, null);
      delete row.ciphertextJson;
      return json({ vault: row });
    }

    if (method !== "POST") return json({ error: "Unknown action." }, 400);

    if (action === "create_org") {
      const name = clean(body.name, 80);
      if (name.length < 2) return json({ error: "Organization name is required." }, 400);
      const id = crypto.randomUUID();
      const slug = `${slugify(name)}-${id.slice(0, 6)}`;
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO organizations(id,name,slug,owner_id,created_at) VALUES(?,?,?,?,?)`)
          .bind(id, name, slug, user.id, now),
        env.DB.prepare(`INSERT INTO organization_members(org_id,user_id,role,status,joined_at) VALUES(?,?,?,?,?)`)
          .bind(id, user.id, "owner", "active", now),
        env.DB.prepare(`INSERT INTO team_channels(id,org_id,name,created_by,created_at) VALUES(?,?,?,?,?)`)
          .bind(crypto.randomUUID(), id, "general", user.id, now)
      ]);
      return json({ created: true, id, slug });
    }

    if (action === "invite_member") {
      const orgId = String(body.orgId || "");
      const member = await requireOrgRole(env, user.id, orgId, "admin");
      const email = clean(body.email, 180).toLowerCase();
      const role = ROLES.has(body.role) && body.role !== "owner" ? body.role : "viewer";
      if (!email.includes("@")) return json({ error: "Valid email is required." }, 400);
      const token = randomHex(24);
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO team_invites(id,org_id,email,role,token_hash,expires_at,created_by,created_at)
         VALUES(?,?,?,?,?,?,?,?)`
      ).bind(
        crypto.randomUUID(), member.orgId, email, role, await sha256(token),
        now + 7 * 86400000, user.id, now
      ).run();
      await sendInviteEmail(env, email, token, member.orgName).catch(() => {});
      return json({ invited: true, token, expiresAt: now + 7 * 86400000 });
    }

    if (action === "accept_invite") {
      const token = clean(body.token, 100);
      if (!token) return json({ error: "Invite token is required." }, 400);
      const invite = await env.DB.prepare(
        `SELECT * FROM team_invites WHERE token_hash=? AND accepted_at IS NULL AND expires_at>?`
      ).bind(await sha256(token), Date.now()).first();
      if (!invite) return json({ error: "Invite is invalid or expired." }, 404);
      if (String(invite.email).toLowerCase() !== String(user.email || "").toLowerCase()) {
        return json({ error: "Sign in using the invited email address." }, 403);
      }
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO organization_members(org_id,user_id,role,status,joined_at)
           VALUES(?,?,?,?,?)
           ON CONFLICT(org_id,user_id) DO UPDATE SET role=excluded.role,status='active'`
        ).bind(invite.org_id, user.id, invite.role, "active", now),
        env.DB.prepare(`UPDATE team_invites SET accepted_at=? WHERE id=?`).bind(now, invite.id)
      ]);
      return json({ accepted: true, orgId: invite.org_id });
    }

    if (action === "create_room") {
      const orgId = String(body.orgId || "");
      await requireOrgRole(env, user.id, orgId, "editor");
      const name = clean(body.name, 80);
      if (!name) return json({ error: "Room name is required." }, 400);
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO collab_rooms(id,org_id,project_id,name,created_by,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?)`
      ).bind(id, orgId, clean(body.projectId, 80) || null, name, user.id, now, now).run();
      return json({ created: true, id });
    }

    if (action === "post_event") {
      const roomId = String(body.roomId || "");
      await authorizeRoom(env, user.id, roomId, "editor");
      const eventType = clean(body.eventType || "note", 40);
      const payload = body.payload && typeof body.payload === "object" ? body.payload : { text: clean(body.text, 12000) };
      const payloadJson = JSON.stringify(payload);
      if (payloadJson.length > 50000) return json({ error: "Collaboration event is too large." }, 413);
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO collab_events(id,room_id,user_id,event_type,payload_json,created_at)
           VALUES(?,?,?,?,?,?)`
        ).bind(crypto.randomUUID(), roomId, user.id, eventType, payloadJson, now),
        env.DB.prepare(`UPDATE collab_rooms SET updated_at=? WHERE id=?`).bind(now, roomId)
      ]);
      return json({ posted: true, createdAt: now });
    }

    if (action === "create_channel") {
      const orgId = String(body.orgId || "");
      await requireOrgRole(env, user.id, orgId, "editor");
      const name = slugify(clean(body.name, 60));
      if (!name) return json({ error: "Channel name is required." }, 400);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO team_channels(id,org_id,name,created_by,created_at) VALUES(?,?,?,?,?)`
      ).bind(id, orgId, name, user.id, Date.now()).run();
      return json({ created: true, id });
    }

    if (action === "send_message") {
      const channelId = String(body.channelId || "");
      await authorizeChannel(env, user.id, channelId, "editor");
      const message = clean(body.body, 12000);
      const ciphertextJson = body.ciphertext ? JSON.stringify(body.ciphertext) : null;
      if (!message && !ciphertextJson) return json({ error: "Message is empty." }, 400);
      if (ciphertextJson && ciphertextJson.length > 50000) return json({ error: "Encrypted message is too large." }, 413);
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO channel_messages(id,channel_id,user_id,body,ciphertext_json,created_at)
         VALUES(?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), channelId, user.id, message, ciphertextJson, now).run();
      return json({ sent: true, createdAt: now });
    }

    if (action === "create_api_key") {
      const name = clean(body.name || "My API key", 80);
      const quota = Math.max(10, Math.min(Number(body.quotaDaily || 100), 5000));
      const secret = `nx_live_${randomHex(24)}`;
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO developer_api_keys(
          id,user_id,name,key_prefix,key_hash,scopes,quota_daily,created_at
         ) VALUES(?,?,?,?,?,?,?,?)`
      ).bind(id, user.id, name, secret.slice(0, 16), await sha256(secret), "chat", quota, Date.now()).run();
      return json({ created: true, id, secret, prefix: secret.slice(0, 16) });
    }

    if (action === "revoke_api_key") {
      await env.DB.prepare(
        `UPDATE developer_api_keys SET revoked=1 WHERE id=? AND user_id=?`
      ).bind(String(body.id || ""), user.id).run();
      return json({ revoked: true });
    }

    if (action === "create_fine_tune") {
      const name = clean(body.name || "Fine-tune dataset", 100);
      const provider = clean(body.provider || "external", 40);
      const baseModel = clean(body.baseModel || "custom-base-model", 120);
      const datasetJson = typeof body.dataset === "string"
        ? body.dataset
        : JSON.stringify(body.dataset || []);
      if (datasetJson.length < 10) return json({ error: "Training dataset is required." }, 400);
      if (datasetJson.length > 800000) return json({ error: "Dataset is larger than 800 KB." }, 413);

      const id = crypto.randomUUID();
      const now = Date.now();
      let status = "dataset-ready";
      let externalId = null;
      let error = null;

      if (env.FINE_TUNE_API_URL) {
        try {
          const response = await fetch(env.FINE_TUNE_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(env.FINE_TUNE_API_KEY ? { Authorization: `Bearer ${env.FINE_TUNE_API_KEY}` } : {})
            },
            body: JSON.stringify({ name, provider, baseModel, dataset: datasetJson, userId: user.id })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || `Provider returned ${response.status}`);
          status = result.status || "submitted";
          externalId = result.id || result.jobId || null;
        } catch (providerError) {
          status = "provider-error";
          error = String(providerError.message || providerError).slice(0, 500);
        }
      }

      await env.DB.prepare(
        `INSERT INTO fine_tune_jobs(
          id,user_id,name,provider,base_model,dataset_json,status,external_id,error,created_at,updated_at
         ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, user.id, name, provider, baseModel, datasetJson, status, externalId, error, now, now).run();
      return json({ created: true, id, status, externalId, error });
    }

    if (action === "save_vault") {
      const name = clean(body.name || "Encrypted chat", 100);
      const ciphertext = JSON.stringify(body.ciphertext || {});
      if (ciphertext.length < 30) return json({ error: "Encrypted data is missing." }, 400);
      if (ciphertext.length > 1200000) return json({ error: "Encrypted vault is too large." }, 413);
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO encrypted_vaults(id,user_id,name,ciphertext_json,created_at,updated_at)
         VALUES(?,?,?,?,?,?)`
      ).bind(id, user.id, name, ciphertext, now, now).run();
      return json({ saved: true, id });
    }

    if (action === "delete_vault") {
      await env.DB.prepare(`DELETE FROM encrypted_vaults WHERE id=? AND user_id=?`)
        .bind(String(body.id || ""), user.id).run();
      return json({ deleted: true });
    }

    if (action === "create_backup") {
      const dataJson = JSON.stringify(body.data || {});
      if (dataJson.length > 2500000) return json({ error: "Backup is larger than 2.5 MB." }, 413);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO cloud_backups(id,user_id,kind,label,data_json,created_at)
         VALUES(?,?,?,?,?,?)`
      ).bind(
        id, user.id, clean(body.kind || "manual", 30),
        clean(body.label || `Backup ${new Date().toISOString()}`, 120),
        dataJson, Date.now()
      ).run();
      await trimBackups(env, user.id);
      return json({ saved: true, id });
    }

    if (action === "delete_backup") {
      await env.DB.prepare(`DELETE FROM cloud_backups WHERE id=? AND user_id=?`)
        .bind(String(body.id || ""), user.id).run();
      return json({ deleted: true });
    }

    if (action === "whatsapp_send") {
      if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_GRAPH_VERSION) {
        return json({
          error: "WhatsApp Cloud API is not configured. Add WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_GRAPH_VERSION."
        }, 503);
      }
      const to = clean(body.to, 30).replace(/\D/g, "");
      const message = clean(body.message, 4000);
      if (!to || !message) return json({ error: "Phone number and message are required." }, 400);
      const response = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(env.WHATSAPP_GRAPH_VERSION)}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: true, body: message }
          })
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return json({ error: result.error?.message || "WhatsApp send failed." }, response.status);
      return json({ sent: true, result });
    }

    if (action === "record_upi") {
      const txnRef = clean(body.txnRef || `NEXUS${Date.now()}`, 80);
      const amountPaise = Math.max(0, Math.round(Number(body.amount || 0) * 100));
      const now = Date.now();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO upi_payment_records(
          id,user_id,txn_ref,payer_note,amount_paise,status,created_at,updated_at
         ) VALUES(?,?,?,?,?,?,?,?)`
      ).bind(id, user.id, txnRef, clean(body.note, 160), amountPaise, "initiated", now, now).run();
      return json({ recorded: true, id, txnRef });
    }

    if (action === "monetization_event") {
      await env.DB.prepare(
        `INSERT INTO monetization_events(id,user_id,event_type,campaign,metadata_json,created_at)
         VALUES(?,?,?,?,?,?)`
      ).bind(
        crypto.randomUUID(), user.id, clean(body.eventType || "click", 40),
        clean(body.campaign, 120), JSON.stringify(body.metadata || {}).slice(0, 10000), Date.now()
      ).run();
      return json({ recorded: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return json({ error: error.message || "Enterprise API failed." }, error.status || 500);
  }
}

async function ensureSchema(env) {
  await env.DB.batch(CREATE_STATEMENTS.map(statement => env.DB.prepare(statement)));
}

async function bootstrap(env, user) {
  const [orgs, rooms, channels, keys, jobs, backups, vaults] = await Promise.all([
    env.DB.prepare(
      `SELECT o.id,o.name,o.slug,o.owner_id AS ownerId,o.created_at AS createdAt,m.role
       FROM organizations o JOIN organization_members m ON m.org_id=o.id
       WHERE m.user_id=? AND m.status='active' ORDER BY o.created_at DESC`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT r.id,r.org_id AS orgId,r.project_id AS projectId,r.name,r.created_at AS createdAt,r.updated_at AS updatedAt
       FROM collab_rooms r JOIN organization_members m ON m.org_id=r.org_id
       WHERE m.user_id=? AND m.status='active' ORDER BY r.updated_at DESC LIMIT 100`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT c.id,c.org_id AS orgId,c.name,c.created_at AS createdAt
       FROM team_channels c JOIN organization_members m ON m.org_id=c.org_id
       WHERE m.user_id=? AND m.status='active' ORDER BY c.created_at ASC LIMIT 100`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT id,name,key_prefix AS prefix,scopes,quota_daily AS quotaDaily,
              day_count AS dayCount,usage_count AS usageCount,revoked,
              last_used_at AS lastUsedAt,created_at AS createdAt
       FROM developer_api_keys WHERE user_id=? ORDER BY created_at DESC LIMIT 50`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT id,name,provider,base_model AS baseModel,status,external_id AS externalId,
              error,created_at AS createdAt,updated_at AS updatedAt
       FROM fine_tune_jobs WHERE user_id=? ORDER BY created_at DESC LIMIT 50`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT id,kind,label,LENGTH(data_json) AS size,created_at AS createdAt
       FROM cloud_backups WHERE user_id=? ORDER BY created_at DESC LIMIT 20`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT id,name,LENGTH(ciphertext_json) AS size,created_at AS createdAt,updated_at AS updatedAt
       FROM encrypted_vaults WHERE user_id=? ORDER BY updated_at DESC LIMIT 50`
    ).bind(user.id).all()
  ]);

  return json({
    account: user,
    organizations: orgs.results || [],
    rooms: rooms.results || [],
    channels: channels.results || [],
    apiKeys: keys.results || [],
    fineTuneJobs: jobs.results || [],
    backups: backups.results || [],
    vaults: vaults.results || []
  });
}

async function requireOrgRole(env, userId, orgId, minimum) {
  const row = await env.DB.prepare(
    `SELECT m.org_id AS orgId,m.role,o.name AS orgName
     FROM organization_members m JOIN organizations o ON o.id=m.org_id
     WHERE m.org_id=? AND m.user_id=? AND m.status='active'`
  ).bind(orgId, userId).first();
  if (!row) {
    const error = new Error("Organization access denied.");
    error.status = 403;
    throw error;
  }
  const rank = { viewer: 1, editor: 2, admin: 3, owner: 4 };
  if ((rank[row.role] || 0) < (rank[minimum] || 0)) {
    const error = new Error(`${minimum} role is required.`);
    error.status = 403;
    throw error;
  }
  return row;
}

async function authorizeRoom(env, userId, roomId, minimum) {
  const row = await env.DB.prepare(
    `SELECT r.org_id AS orgId FROM collab_rooms r WHERE r.id=?`
  ).bind(roomId).first();
  if (!row) {
    const error = new Error("Collaboration room not found.");
    error.status = 404;
    throw error;
  }
  return requireOrgRole(env, userId, row.orgId, minimum);
}

async function authorizeChannel(env, userId, channelId, minimum) {
  const row = await env.DB.prepare(
    `SELECT org_id AS orgId FROM team_channels WHERE id=?`
  ).bind(channelId).first();
  if (!row) {
    const error = new Error("Team channel not found.");
    error.status = 404;
    throw error;
  }
  return requireOrgRole(env, userId, row.orgId, minimum);
}

async function trimBackups(env, userId) {
  await env.DB.prepare(
    `DELETE FROM cloud_backups
     WHERE user_id=? AND id NOT IN (
       SELECT id FROM cloud_backups WHERE user_id=? ORDER BY created_at DESC LIMIT 20
     )`
  ).bind(userId, userId).run();
}

async function sendInviteEmail(env, email, token, orgName) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.PUBLIC_SITE_URL) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: `Invitation to ${orgName}`,
      html: `<p>You were invited to <strong>${escapeHtml(orgName)}</strong>.</p>
             <p>Open ${escapeHtml(env.PUBLIC_SITE_URL)} and enter this invite token:</p>
             <p><code>${escapeHtml(token)}</code></p>`
    })
  });
}

function parseRows(rows, jsonFields) {
  return (rows || []).map(row => {
    const copy = { ...row };
    for (const field of jsonFields) {
      if (copy[field]) copy[field.replace(/Json$/, "")] = safeJson(copy[field], null);
      delete copy[field];
    }
    return copy;
  });
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "team";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}
