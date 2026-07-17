import { json } from "../_shared/auth.js";
import { isGuestAiAllowed } from "../_shared/security.js";

export async function onRequestGet({ env }) {
  const checks = {
    ai: Boolean(env.AI),
    database: Boolean(env.DB),
    files: Boolean(env.FILES),
    rateLimitKv: Boolean(env.RATE_LIMIT),
    turnstile: Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
    guestAi: isGuestAiAllowed(env)
  };
  const database = { reachable: false, schemaReady: false, rateLimitTable: false };
  if (env.DB) {
    try {
      await env.DB.prepare("SELECT 1 AS ok").first();
      database.reachable = true;
      await env.DB.prepare("SELECT id FROM users LIMIT 1").first();
      database.schemaReady = true;
      await env.DB.prepare("SELECT key FROM api_rate_limits LIMIT 1").first();
      database.rateLimitTable = true;
    } catch (error) {
      database.error = String(error?.message || error).slice(0, 300);
    }
  }
  const recommendations = [];
  if (!checks.ai) recommendations.push('Add a Workers AI binding named "AI".');
  if (!checks.database) recommendations.push('Add D1 binding "DB" for accounts and cloud sync.');
  else if (!database.schemaReady) recommendations.push("Run schema.sql for a new D1 database.");
  else if (!database.rateLimitTable) recommendations.push("Run MIGRATE-V11-1.sql once, or use RATE_LIMIT KV.");
  if (!checks.files) recommendations.push('R2 "FILES" is optional; local browser files will still work.');
  if (!checks.rateLimitKv) recommendations.push('KV "RATE_LIMIT" is optional because D1/in-memory fallback is enabled.');
  return json({
    ok: checks.ai && (!checks.database || database.reachable),
    version: "15.1.0",
    checks,
    database,
    cloudflareModel: env.CF_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
    recommendations
  });
}
